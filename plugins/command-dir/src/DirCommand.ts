import type { CommandSpec, EditorApp } from '@svgframe/kernel';
import type { DirectoryEntry, DirectoryReader, EntryKind } from './DirectoryReader.js';

/** 标记列的宽度 + 两个空格，与作业示例一致。 */
const MARKERS: Record<EntryKind, string> = {
  dir: '[DIR]',
  file: '[FILE]',
  link: '[LINK]',
  other: '[OTHER]',
};

/** 排序时各类的先后：目录 → 普通文件 → 链接 → 其它。 */
const ORDER: Record<EntryKind, number> = { dir: 0, file: 1, link: 2, other: 3 };

/**
 * `dir`：列出 CLI 进程**当前工作目录**的直接子项。
 *
 * 设计要点：
 * - 只依赖 `DirectoryReader` 接口，因此可用测试替身独立测试；
 * - 不接收参数、不递归、不跟随符号链接；
 * - 不碰文档：未 `init` / `read` 也能用，也不影响 undo/redo 历史与 IO 闸门。
 */
export class DirCommand implements CommandSpec<EditorApp> {
  readonly name = 'dir';
  readonly usage = 'dir';
  readonly summary = '列出当前工作目录的直接子项（目录在前，文件在后）';
  readonly minArgs = 0;
  readonly maxArgs = 0;

  private readonly reader: DirectoryReader;
  private readonly cwd: () => string;

  constructor(reader: DirectoryReader, cwd: () => string = () => process.cwd()) {
    this.reader = reader;
    this.cwd = cwd;
  }

  run(): readonly string[] {
    const target = this.cwd();
    const entries = this.reader.list(target);
    if (entries.length === 0) {
      return ['(empty directory)'];
    }
    return [...entries].sort(compare).map(render);
  }
}

function compare(left: DirectoryEntry, right: DirectoryEntry): number {
  const byKind = ORDER[left.kind] - ORDER[right.kind];
  if (byKind !== 0) {
    return byKind;
  }
  // 同一类内按名称升序；用码元比较保证跨平台、跨 locale 的稳定性
  return left.name < right.name ? -1 : left.name > right.name ? 1 : 0;
}

function render(entry: DirectoryEntry): string {
  return `${MARKERS[entry.kind]}  ${entry.name}`;
}
