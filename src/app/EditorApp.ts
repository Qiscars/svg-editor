import { CommandContext } from '../commands/CommandContext.js';
import { CommandHistory } from '../commands/CommandHistory.js';
import type { Command } from '../commands/Command.js';
import { Document } from '../domain/Document.js';
import { Numbers } from '../domain/Numbers.js';
import { ShapeError } from '../domain/ShapeError.js';
import { FileGateway } from '../io/FileGateway.js';
import { SvgParser } from '../io/SvgParser.js';
import { SvgSerializer } from '../io/SvgSerializer.js';

export const DEFAULT_CANVAS_WIDTH = 800;
export const DEFAULT_CANVAS_HEIGHT = 600;

/**
 * 应用层：把"用户想做什么"编排成"调用哪个领域/命令/io 部件"。
 *
 * 它是**唯一知道文档命令与编辑命令区别**的地方：
 * - 文档命令（init / read / save / canvas 改尺寸）不进 undo 栈，并且要上 IO 闸门；
 *   `init` / `read` 换掉了整份文档，连历史一起作废；`save` / `canvas` 只是改了
 *   外部世界或画布属性，历史保留。
 * - 编辑命令一律经 `CommandHistory.run`，保证"一条命令 = 一个 undo 单元"。
 *
 * 返回值统一是**待输出的行数组**：`read` 可能同时产生 warning 与结果行。
 */
export class EditorApp {
  private readonly files: FileGateway;
  private readonly parser: SvgParser;
  private readonly serializer: SvgSerializer;

  private documentValue: Document | null = null;
  private contextValue: CommandContext | null = null;
  private historyValue = new CommandHistory();

  constructor(
    files: FileGateway = new FileGateway(),
    parser: SvgParser = new SvgParser(),
    serializer: SvgSerializer = new SvgSerializer(),
  ) {
    this.files = files;
    this.parser = parser;
    this.serializer = serializer;
  }

  /** 当前文档；未 `init` / `read` 过就报作业 §4.2 的 `no document`。 */
  get document(): Document {
    if (this.documentValue === null) {
      throw ShapeError.noDocument();
    }
    return this.documentValue;
  }

  get context(): CommandContext {
    if (this.contextValue === null) {
      throw ShapeError.noDocument();
    }
    return this.contextValue;
  }

  get history(): CommandHistory {
    return this.historyValue;
  }

  get hasDocument(): boolean {
    return this.documentValue !== null;
  }

  // ── 文档类命令（不进 undo 栈）─────────────────────────────────────────

  init(width: number = DEFAULT_CANVAS_WIDTH, height: number = DEFAULT_CANVAS_HEIGHT): readonly string[] {
    this.replaceDocument(new Document(width, height));
    return [`canvas ${Numbers.format(width)}x${Numbers.format(height)} created`];
  }

  read(path: string): readonly string[] {
    const text = this.files.read(path);
    const result = this.parser.parse(text);
    result.document.setSourceFile(path);
    this.replaceDocument(result.document);
    return [
      ...result.warnings.map((warning) => `warning: ${warning}`),
      `read ${path} (${result.document.elementCount} elements)`,
    ];
  }

  save(path?: string): readonly string[] {
    const document = this.document;
    const target = path ?? document.sourceFile;
    if (target === null) {
      throw ShapeError.noSavePath();
    }
    this.files.write(target, this.serializer.serialize(document));
    document.setSourceFile(target);
    this.historyValue.markIoBoundary();
    return [`saved to ${target} (${document.elementCount} elements)`];
  }

  canvas(width?: number, height?: number): readonly string[] {
    const document = this.document;
    if (width === undefined && height === undefined) {
      return [`canvas ${Numbers.format(document.canvas.width)}x${Numbers.format(document.canvas.height)}`];
    }
    if (width === undefined || height === undefined) {
      throw ShapeError.missingParameter(width === undefined ? 'w' : 'h');
    }
    document.canvas.resize(width, height);
    this.historyValue.markIoBoundary();
    return [`canvas resized to ${Numbers.format(width)}x${Numbers.format(height)}`];
  }

  // ── 编辑命令与历史 ────────────────────────────────────────────────────

  run(command: Command): string {
    this.assertHasDocument();
    return this.historyValue.run(command);
  }

  undo(): string {
    this.assertHasDocument();
    return this.historyValue.undo();
  }

  redo(): string {
    this.assertHasDocument();
    return this.historyValue.redo();
  }

  /**
   * 未 `init` / `read` 就执行任何命令都报同一个错（作业 §4.2）。
   * 注意 `undo` 也要走这条检查：没有文档时"没有可撤销的操作"会掩盖真正的问题。
   */
  private assertHasDocument(): void {
    if (this.documentValue === null) {
      throw ShapeError.noDocument();
    }
  }

  private replaceDocument(document: Document): void {
    this.documentValue = document;
    this.contextValue = new CommandContext(document);
    // 旧命令指向的是已经不在编辑器里的图形，历史必须整体作废
    this.historyValue.reset();
  }
}
