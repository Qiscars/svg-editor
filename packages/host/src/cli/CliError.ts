import { EditorError } from '@svgframe/kernel';

/**
 * 表现层的语法错误：引号没闭合、参数个数不对。
 *
 * 这两类错误的判据完全来自**命令行文本**（token 数、引号配对），
 * 与"一条编辑命令语义上能不能执行"无关，因此归表现层。
 */
export class CliError extends EditorError {
  static unclosedQuote(): CliError {
    return new CliError('unclosed double quote');
  }

  static usage(usage: string): CliError {
    return new CliError(`usage: ${usage}`);
  }
}
