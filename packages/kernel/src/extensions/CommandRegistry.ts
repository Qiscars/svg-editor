import { RegistryError } from './RegistryError.js';

/**
 * 一条命令的元信息 + 执行体。
 *
 * `TContext` 让注册表不必知道"宿主用什么东西来执行命令"。对 CLI 来说
 * `TContext` 就是 `EditorApp`，但内核并不依赖那个类。
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
 * 命令注册表：命令名 → 执行体。
 *
 * 它是命令扩展点的落点。清单校验与回滚都依赖 `register` / `unregister` 这一对
 * 对称操作，所以这里刻意没有"直接改内部表"的旁路。
 */
export class CommandRegistry<TContext> {
  private readonly specs = new Map<string, CommandSpec<TContext>>();

  register(spec: CommandSpec<TContext>): void {
    if (this.specs.has(spec.name)) {
      throw RegistryError.duplicateRegistration(`commands/${spec.name}`);
    }
    this.specs.set(spec.name, spec);
  }

  unregister(name: string): void {
    this.specs.delete(name);
  }

  has(name: string): boolean {
    return this.specs.has(name);
  }

  /** 按注册顺序返回，`help` 的顺序由注册顺序决定。 */
  list(): readonly CommandSpec<TContext>[] {
    return [...this.specs.values()];
  }

  names(): readonly string[] {
    return [...this.specs.keys()];
  }

  /** 取不到就报 `unknown command`。 */
  require(name: string): CommandSpec<TContext> {
    const spec = this.specs.get(name);
    if (spec === undefined) {
      throw RegistryError.unknownCommand(name);
    }
    return spec;
  }

  /** 分发：查表 → 校验参数个数 → 执行。 */
  execute(context: TContext, name: string, args: readonly string[]): readonly string[] {
    const spec = this.require(name);
    if (args.length < spec.minArgs || args.length > spec.maxArgs) {
      throw RegistryError.usage(spec.usage);
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
