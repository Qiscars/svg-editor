import { Tokenizer } from './Tokenizer.js';

/** 一行命令的解析结果：命令名 + 位置参数。 */
export interface CommandInvocation {
  readonly name: string;
  readonly args: readonly string[];
}

/**
 * 文本 → 结构化调用。
 *
 * 这里只做两件事：判定是否空行/注释、把整行切成「命令名 + 参数」。
 * 参数个数、类型与语义**不在这里校验**——每个命令自己声明用法与参数区间
 * （见 `registry/CommandRegistry.ts` 的 `CommandSpec`），
 * 这样"加一条命令要改几处"只有一个答案。
 */
export class CommandParser {
  parse(line: string): CommandInvocation | null {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) {
      return null;
    }
    const tokens = Tokenizer.tokenize(trimmed);
    const [name, ...args] = tokens;
    if (name === undefined) {
      return null;
    }
    return { name, args };
  }
}
