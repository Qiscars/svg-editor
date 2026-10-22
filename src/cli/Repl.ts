import { createInterface } from 'node:readline';
import type { Interface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';

import { EditorApp } from '../app/EditorApp.js';
import type { CommandRegistry } from '../registry/CommandRegistry.js';
import { CommandParser } from './CommandParser.js';
import { ConsoleOutput } from './ConsoleOutput.js';
import { createDefaultCommandRegistry } from './DefaultCommandRegistry.js';

export const PROMPT = 'svg> ';
export const BANNER = "svg-editor 0.1 — type 'help' for commands";

/** 终端流额外带上 `isTTY` 标记；普通文件/管道上没有这个属性。 */
type MaybeTty<T> = T & { isTTY?: boolean | undefined };

/**
 * REPL：逐行读入 → 解析 → 分发 → 打印。
 *
 * 它只负责**行级 I/O 与生命周期**，不认识任何具体命令：命令表来自
 * `CommandRegistry`，执行体最终落到 `EditorApp` / 命令层。
 * 早期那份静态 `HelpText` 常量已删除——帮助文本改由注册表汇总生成，
 * 待重构项 R3 就此消除。
 *
 * 两种输入模式：
 * - 交互模式（stdin/stdout 都是终端）：readline 负责行编辑与回显，提示符由 `rl.prompt()` 打印；
 * - 脚本模式（stdin 被重定向）：没有回显，因此把 `svg> ` 与读到的整行一起打印，
 *   使回放结果与作业文档里的 transcript 格式一致，便于场景对拍测试。
 */
export class Repl {
  private readonly out: ConsoleOutput;
  private readonly rl: Interface;
  private readonly interactive: boolean;
  private readonly app: EditorApp;
  private readonly registry: CommandRegistry<EditorApp>;
  private readonly parser = new CommandParser();

  constructor(
    input: MaybeTty<Readable>,
    output: MaybeTty<Writable>,
    app: EditorApp = new EditorApp(),
    registry: CommandRegistry<EditorApp> = createDefaultCommandRegistry(),
  ) {
    this.out = new ConsoleOutput(output);
    this.app = app;
    this.registry = registry;
    this.interactive = input.isTTY === true && output.isTTY === true;
    this.rl = createInterface({
      input,
      output,
      prompt: PROMPT,
      terminal: this.interactive,
    });
  }

  async run(): Promise<void> {
    this.out.line(BANNER);
    this.out.line();
    if (this.interactive) {
      this.rl.prompt();
    }

    for await (const line of this.rl) {
      if (!this.interactive) {
        this.out.line(PROMPT + line);
      }
      this.execute(line);
      if (this.interactive) {
        this.rl.prompt();
      }
    }
  }

  private execute(rawLine: string): void {
    try {
      const invocation = this.parser.parse(rawLine);
      if (invocation === null) {
        return;
      }
      for (const line of this.registry.execute(this.app, invocation.name, invocation.args)) {
        this.out.line(line);
      }
    } catch (error) {
      this.out.line(`error: ${describeError(error)}`);
    }
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
