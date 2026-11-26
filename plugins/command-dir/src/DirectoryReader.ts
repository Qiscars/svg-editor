/**
 * 目录项的分类。
 *
 * 符号链接单独一类，且**不跟随其目标**——`dir` 只报告目录里有什么，
 * 不递归、不解析链接。这样输出稳定，也不会因为链接成环而卡住。
 */
export type EntryKind = 'dir' | 'file' | 'link' | 'other';

export interface DirectoryEntry {
  readonly name: string;
  readonly kind: EntryKind;
}

/**
 * **适配器模式的目标接口（Target）**。
 *
 * 命令只依赖这个接口，因此可以在测试里换成内存替身，
 * 完全不碰真实文件系统；真实实现见 `FsDirectoryReader`（Adapter）。
 */
export interface DirectoryReader {
  /**
   * 列出 `path` 的**直接**子项（含以 `.` 开头的隐藏项，不含 `.` 与 `..`）。
   * 读取失败时抛出 `DirectoryError`。
   */
  list(path: string): readonly DirectoryEntry[];
}
