import { CommandError } from '../commands/CommandError.js';

/**
 * 一条命令的元信息 + 执行体。
 *
 * `TContext` 是本层刻意留的泛型：注册表只需要"有个东西能执行命令"，
 * 不需要知道那个东西是 `EditorApp`。这样 `registry` 目录不会反过来依赖
 * `app` / `cli`，依赖方向（doc/README.md §1.3）保持干净。
 */
export interface CommandSpec<TContext> {
  readonly name: string;
  /** 用法串，`help` 直接输出它 */
  readonly usage: string;
  /** 一行说明 */
  readonly summary: string;
  readonly minArgs: number;
  readonly maxArgs: number;
  run(context: TContext, args: readonly string[]): readonly string[];
}

/**
 * 命令注册表：**作业允许的两处按名字分派之一（第 ② 处）**，登记为待重构项 R2。
 *
 * 它同时是三件事的单一真相源：
 * 1. 命令分发（名字 → 执行体）；
 * 2. 参数个数校验（`execute` 里统一做，各命令不用重复写）；
 * 3. `help` 文本（用法 + 说明，按注册顺序对齐输出）。
 *
 * 正因为这三处共用一份声明，早期 `HelpText.ts` 里"静态帮助常量"那笔债
 * （待重构项 R3）在本轮被真正消除：加一条命令只改一个地方。
 */
export class CommandRegistry<TContext> {
  private readonly specs = new Map<string, CommandSpec<TContext>>();

  register(spec: CommandSpec<TContext>): void {
    if (this.specs.has(spec.name)) {
      throw new Error(`internal: command already registered: ${spec.name}`);
    }
    this.specs.set(spec.name, spec);
  }

  has(name: string): boolean {
    return this.specs.has(name);
  }

  /** 按注册顺序返回，`help` 的顺序由注册顺序决定。 */
  list(): readonly CommandSpec<TContext>[] {
    return [...this.specs.values()];
  }

  /** 取不到就报 `unknown command`。 */
  require(name: string): CommandSpec<TContext> {
    const spec = this.specs.get(name);
    if (spec === undefined) {
      throw CommandError.unknownCommand(name);
    }
    return spec;
  }

  /** 分发：查表 → 校验参数个数 → 执行。 */
  execute(context: TContext, name: string, args: readonly string[]): readonly string[] {
    const spec = this.require(name);
    if (args.length < spec.minArgs || args.length > spec.maxArgs) {
      throw CommandError.usage(spec.usage);
    }
    return spec.run(context, args);
  }

  /** `help` 的正文：两列对齐。 */
  helpLines(): readonly string[] {
    const specs = this.list();
    const width = specs.reduce((max, spec) => Math.max(max, spec.usage.length), 0);
    return specs.map((spec) => `  ${spec.usage.padEnd(width)}   ${spec.summary}`);
  }
}
