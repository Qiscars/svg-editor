import { readFileSync, writeFileSync } from 'node:fs';

import { ShapeError } from '../domain/ShapeError.js';

/**
 * 文件系统访问的**唯一出口**。
 *
 * `io` 层里只有这个类碰 `node:fs`，所以"哪些模块能读文件"这个问题
 * 有一个明确的答案：只有它。命令层永远不接触文件系统，
 * 这也是 `domain` / `commands` 能在纯内存下被单测的原因。
 *
 * 所有底层异常都被转成作业 §4.2 规定的两条文案，
 * 上层不需要认识 `ENOENT` / `EACCES` 这类系统错误码。
 */
export class FileGateway {
  read(path: string): string {
    try {
      return readFileSync(path, 'utf8');
    } catch {
      throw ShapeError.cannotReadFile(path);
    }
  }

  write(path: string, content: string): void {
    try {
      writeFileSync(path, content, 'utf8');
    } catch {
      throw ShapeError.cannotWriteFile(path);
    }
  }

  exists(path: string): boolean {
    try {
      readFileSync(path, 'utf8');
      return true;
    } catch {
      return false;
    }
  }
}
