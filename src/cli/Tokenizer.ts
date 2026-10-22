import { CommandError } from '../commands/CommandError.js';

/**
 * 命令行分词。
 *
 * 规则（对应作业 §2 的通用约定）：
 * - 空白分隔；**双引号包裹的参数可以含空格**（主要是 `create text … "内容"`）；
 * - `#` 开头的**整行**视为注释——注意不是"行内注释"：
 *   `create rect bg 0 0 800 600 #ffffff` 里的 `#ffffff` 是填充色，不是注释。
 *   整行注释的判断在 `CommandParser` 里做，分词器只处理引号与空白；
 * - 引号不闭合直接报错，而不是把剩下的内容当成一个参数悄悄吞掉。
 */
export class Tokenizer {
  static tokenize(line: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let started = false;
    let inQuotes = false;

    for (const char of line) {
      if (inQuotes) {
        if (char === '"') {
          inQuotes = false;
        } else {
          current += char;
        }
        continue;
      }
      if (char === '"') {
        inQuotes = true;
        started = true;
        continue;
      }
      if (char === ' ' || char === '\t') {
        if (started) {
          tokens.push(current);
          current = '';
          started = false;
        }
        continue;
      }
      current += char;
      started = true;
    }

    if (inQuotes) {
      throw CommandError.unclosedQuote();
    }
    if (started) {
      tokens.push(current);
    }
    return tokens;
  }
}
