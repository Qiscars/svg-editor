import { readdirSync } from 'node:fs';
import type { Dirent } from 'node:fs';

import type { DirectoryEntry, DirectoryReader, EntryKind } from './DirectoryReader.js';
import { DirectoryError } from './DirectoryError.js';

/**
 * 目录访问接口的**真实实现**——适配器模式里的 Adapter。
 *
 * 角色对应：
 * - **Target**：`DirectoryReader`（命令只认它）
 * - **Adaptee**：Node 的 `node:fs` 模块（`readdirSync` + `Dirent`，接口形态完全不同）
 * - **Adapter**：本类，把 `Dirent` 的 `isDirectory()/isFile()/isSymbolicLink()`
 *   翻译成领域里的 `EntryKind`，并把系统错误码翻译成 `DirectoryError`
 * - **Client**：`DirCommand`
 *
 * 换成别的文件系统（内存、远端、虚拟）只需要另写一个 Adapter。
 */
export class FsDirectoryReader implements DirectoryReader {
  list(path: string): readonly DirectoryEntry[] {
    let entries: Dirent[];
    try {
      entries = readdirSync(path, { withFileTypes: true });
    } catch {
      throw DirectoryError.cannotRead(path);
    }

    return entries.map((entry) => ({
      name: entry.name,
      kind: kindOf(entry),
    }));
  }
}

function kindOf(entry: Dirent): EntryKind {
  if (entry.isSymbolicLink()) {
    return 'link';
  }
  if (entry.isDirectory()) {
    return 'dir';
  }
  if (entry.isFile()) {
    return 'file';
  }
  return 'other';
}
