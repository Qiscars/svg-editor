import { CommandContext } from '../commands/CommandContext.js';
import { CommandHistory } from '../commands/CommandHistory.js';
import type { Command } from '../commands/Command.js';
import { AddToCommand } from '../commands/impl/AddToCommand.js';
import { CreateShapeCommand } from '../commands/impl/CreateShapeCommand.js';
import { DeleteShapeCommand } from '../commands/impl/DeleteShapeCommand.js';
import { GroupCommand } from '../commands/impl/GroupCommand.js';
import { MoveShapeCommand } from '../commands/impl/MoveShapeCommand.js';
import { ReorderCommand } from '../commands/impl/ReorderCommand.js';
import type { ReorderTarget } from '../commands/impl/ReorderCommand.js';
import { ScaleShapeCommand } from '../commands/impl/ScaleShapeCommand.js';
import { SetAttributeCommand } from '../commands/impl/SetAttributeCommand.js';
import { UngroupCommand } from '../commands/impl/UngroupCommand.js';
import { Document } from '../domain/Document.js';
import { Numbers } from '../domain/Numbers.js';
import { ShapeError } from '../domain/ShapeError.js';
import type { EditorServices } from '../extensions/EditorServices.js';
import { FileGateway } from '../io/FileGateway.js';
import { SvgParser } from '../io/SvgParser.js';
import { SvgSerializer } from '../io/SvgSerializer.js';

export const DEFAULT_CANVAS_WIDTH = 800;
export const DEFAULT_CANVAS_HEIGHT = 600;

/**
 * 应用层：把"用户想做什么"编排成"调用哪个领域/命令/io 部件"。
 *
 * Phase 2 之后它不再持有任何具体图形工厂：图形类型来自 `services.shapes`，
 * 属性语义来自 `services.attributes`，树标签来自 `services.decorators`。
 * 于是"装上哪些插件"完全由装配处决定，`EditorApp` 本身不随插件变化。
 */
export class EditorApp {
  readonly services: EditorServices;

  private readonly files: FileGateway;
  private readonly serializer: SvgSerializer;
  private readonly parser: SvgParser;

  private documentValue: Document | null = null;
  private contextValue: CommandContext | null = null;
  private historyValue = new CommandHistory();

  constructor(
    services: EditorServices,
    files: FileGateway = new FileGateway(),
    serializer?: SvgSerializer,
    parser?: SvgParser,
  ) {
    this.services = services;
    this.files = files;
    this.serializer = serializer ?? new SvgSerializer(services.shapes);
    this.parser = parser ?? new SvgParser(services.shapes);
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
    // 保存成功 → 通知树标签（`modified-star` 在这里清空 dirty 记录）
    this.services.decorators.notifySaved(document);
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
    this.services.decorators.notifyChanged(document);
    return [`canvas resized to ${Numbers.format(width)}x${Numbers.format(height)}`];
  }

  // ── 编辑命令（应用层负责"造哪个命令"，表现层只报意图）─────────────────

  createShape(
    type: string,
    id: string,
    geometryValues: readonly string[],
    styleValue: string | undefined,
    parentId: string | null,
  ): string {
    const definition = this.services.shapes.require(type);
    const shape = definition.build(id, geometryValues);
    if (styleValue !== undefined && definition.optionalStyle !== undefined) {
      shape.setAttribute(definition.optionalStyle, styleValue);
    }
    return this.run(new CreateShapeCommand(this.context, shape, parentId));
  }

  deleteShape(id: string): string {
    return this.run(new DeleteShapeCommand(this.context, id));
  }

  moveShape(id: string, dx: number, dy: number): string {
    return this.run(new MoveShapeCommand(this.context, id, dx, dy));
  }

  scaleShape(id: string, factor: number): string {
    return this.run(new ScaleShapeCommand(this.context, id, factor));
  }

  setAttribute(id: string, attribute: string, value: string): string {
    return this.run(new SetAttributeCommand(this.context, id, attribute, value));
  }

  groupShapes(newGroupId: string, ids: readonly string[]): string {
    return this.run(new GroupCommand(this.context, newGroupId, ids));
  }

  ungroupShape(groupId: string): string {
    return this.run(new UngroupCommand(this.context, groupId));
  }

  addToGroup(groupId: string, id: string): string {
    return this.run(new AddToCommand(this.context, groupId, id));
  }

  reorderShape(id: string, target: ReorderTarget): string {
    return this.run(new ReorderCommand(this.context, id, target));
  }

  // ── 命令执行与历史 ────────────────────────────────────────────────────

  run(command: Command): string {
    this.assertHasDocument();
    const message = this.historyValue.run(command);
    this.services.decorators.notifyChanged(this.document);
    return message;
  }

  undo(): string {
    this.assertHasDocument();
    const message = this.historyValue.undo();
    this.services.decorators.notifyChanged(this.document);
    return message;
  }

  redo(): string {
    this.assertHasDocument();
    const message = this.historyValue.redo();
    this.services.decorators.notifyChanged(this.document);
    return message;
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
    this.contextValue = new CommandContext(document, this.services);
    // 旧命令指向的是已经不在编辑器里的图形，历史必须整体作废
    this.historyValue.reset();
    this.services.decorators.notifyLoaded(document);
  }
}
