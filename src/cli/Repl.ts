import { createInterface } from 'node:readline';
import type { Interface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';

import { ConsoleOutput } from './ConsoleOutput.js';
import { HELP_TEXT } from './HelpText.js';

export const PROMPT = 'svg> ';
export const BANNER = "svg-editor 0.1 — type 'help' for commands";

/** 终端流额外带上 `isTTY` 标记；普通文件/管道上没有这个属性。 */
type MaybeTty<T> = T & { isTTY?: boolean | undefined };

/**
 * REPL：逐行读入 → 交给命令层执行 → 打印结果。
 *
 * 它只负责**行级 I/O 与生命周期**，不认识任何具体命令；命令的解析与执行在后续
 * 迭代中交给 CommandParser + CommandRegistry（见 doc/README.md §1.1）。
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

  constructor(input: MaybeTty<Readable>, output: MaybeTty<Writable>) {
    this.out = new ConsoleOutput(output);
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
    const line = rawLine.trim();

    // 空行与 `#` 开头的注释：便于把命令序列存成脚本回放
    if (line === '' || line.startsWith('#')) {
      return;
    }

    if (line === 'help') {
      for (const helpLine of HELP_TEXT) {
        this.out.line(helpLine);
      }
      return;
    }

    // 过渡实现：分发逻辑在 CommandRegistry 落地时替换
    this.out.line(`error: unknown command: ${firstToken(line)}`);
  }
}

function firstToken(line: string): string {
  const index = line.indexOf(' ');
  return index === -1 ? line : line.slice(0, index);
}
