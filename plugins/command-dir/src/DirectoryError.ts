import { EditorError } from '@svgframe/kernel';

/** 目录访问失败。继承 `EditorError`，表现层才会加 `error: ` 前缀而不是 `error: internal:`。 */
export class DirectoryError extends EditorError {
  static cannotRead(path: string): DirectoryError {
    return new DirectoryError(`cannot read directory: ${path}`);
  }
}
