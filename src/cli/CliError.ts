import { EditorError } from '../domain/EditorError.js';

/**
 * 表现层的语法错误：引号没闭合、参数个数不对。
 *
 * 为什么放在 `cli` 而不是 `commands`：这两类错误的判据完全来自**命令行文本**
 * （token 数、引号配对），与"一条编辑命令语义上能不能执行"无关。
 * 放在 cli 里之后，`cli` 不需要为了一个错误类去依赖 `commands`，
 * 依赖方向（doc/README.md §1.3）也就守住了。
 */
export class CliError extends EditorError {
  static unclosedQuote(): CliError {
    return new CliError('unclosed double quote');
  }

  static usage(usage: string): CliError {
    return new CliError(`usage: ${usage}`);
  }
}
