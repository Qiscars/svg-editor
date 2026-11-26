import type { PluginContext, PluginManifest, SvgFramePlugin } from '@svgframe/kernel';
import { DirCommand } from './DirCommand.js';
import type { DirectoryReader } from './DirectoryReader.js';
import { FsDirectoryReader } from './FsDirectoryReader.js';

export { DirCommand } from './DirCommand.js';
export type { DirectoryEntry, DirectoryReader, EntryKind } from './DirectoryReader.js';
export { DirectoryError } from './DirectoryError.js';
export { FsDirectoryReader } from './FsDirectoryReader.js';

/**
 * `dir` 命令插件。
 *
 * 目录访问的实现通过构造参数注入：
 * - 配置装配 / 正常运行用默认的 `FsDirectoryReader`；
 * - 测试用替身（见 `tests/plugins/dir.test.ts`）。
 *
 * 两条装配路径注入的是**同一个** `DirCommand` 与**同一个** `DirectoryReader` 接口，
 * 因此输出逐字节一致。
 */
export class CommandDirPlugin implements SvgFramePlugin {
  readonly name = 'command-dir';
  readonly contributes: PluginManifest = { commands: ['dir'] };

  private readonly reader: DirectoryReader;

  constructor(reader: DirectoryReader = new FsDirectoryReader()) {
    this.reader = reader;
  }

  activate(context: PluginContext): void {
    context.commands.register(new DirCommand(this.reader));
  }
}

export default new CommandDirPlugin();
