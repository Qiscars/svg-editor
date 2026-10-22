import { Numbers } from '../../domain/Numbers.js';

/**
 * 参数取值的小工具。
 *
 * 参数**个数**已经由 `CommandRegistry.execute` 统一校验过，所以这里的越界
 * 属于内部错误而不是用户错误；但为了不写 `as string` 这类断言，
 * 仍然显式判断一次并抛出明确的内部异常。
 */
export class Arguments {
  static required(args: readonly string[], index: number): string {
    const value = args[index];
    if (value === undefined) {
      throw new Error(`internal: argument ${index} missing after arity check`);
    }
    return value;
  }

  static number(args: readonly string[], index: number, name: string): number {
    return Numbers.parse(name, Arguments.required(args, index));
  }

  static optionalNumber(
    args: readonly string[],
    index: number,
    name: string,
  ): number | undefined {
    const raw = args[index];
    return raw === undefined ? undefined : Numbers.parse(name, raw);
  }
}
