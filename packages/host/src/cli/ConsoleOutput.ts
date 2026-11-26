import type { Writable } from 'node:stream';

/**
 * 表现层的唯一输出出口。
 *
 * 所有面向用户的文本都经由这里写出，便于后续替换成捕获式输出（测试里用）或
 * 带格式的输出（颜色、缩进），而不必改动任何命令实现。
 */
export class ConsoleOutput {
  private readonly stream: Writable;

  constructor(stream: Writable) {
    this.stream = stream;
  }

  /** 输出一行（空参数即空行）。 */
  line(text = ''): void {
    this.stream.write(`${text}\n`);
  }
}
