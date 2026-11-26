import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';
import commandDir, { DirCommand, DirectoryError, FsDirectoryReader } from '@svgframe/plugin-command-dir';
import type { DirectoryEntry, DirectoryReader } from '@svgframe/plugin-command-dir';
import { createTestComposition } from '../helpers/kernel.js';

/** 目录访问接口的**测试替身**：完全不碰文件系统。 */
class StubReader implements DirectoryReader {
  readonly calls: string[] = [];

  constructor(private readonly entries: readonly DirectoryEntry[]) {}

  list(path: string): readonly DirectoryEntry[] {
    this.calls.push(path);
    return this.entries;
  }
}

function run(command: DirCommand): readonly string[] {
  return command.run();
}

describe('dir：测试替身', () => {
  it('目录在前、文件在后，各组按名称升序', () => {
    const reader = new StubReader([
      { name: 'zeta.svg', kind: 'file' },
      { name: 'beta', kind: 'dir' },
      { name: 'alpha.svg', kind: 'file' },
      { name: 'alpha', kind: 'dir' },
    ]);
    expect(run(new DirCommand(reader, () => '/fixed'))).toEqual([
      '[DIR]  alpha',
      '[DIR]  beta',
      '[FILE]  alpha.svg',
      '[FILE]  zeta.svg',
    ]);
    expect(reader.calls).toEqual(['/fixed']);
  });

  it('包含隐藏项，链接单独标注', () => {
    const reader = new StubReader([
      { name: '.hidden', kind: 'file' },
      { name: 'link', kind: 'link' },
      { name: 'file', kind: 'file' },
    ]);
    expect(run(new DirCommand(reader, () => '.'))).toEqual([
      '[FILE]  .hidden',
      '[FILE]  file',
      '[LINK]  link',
    ]);
  });

  it('空目录输出 (empty directory)', () => {
    expect(run(new DirCommand(new StubReader([]), () => '.'))).toEqual(['(empty directory)']);
  });

  it('读取失败抛出 cannot read directory', () => {
    const failing: DirectoryReader = {
      list: (path) => {
        throw DirectoryError.cannotRead(path);
      },
    };
    expect(() => run(new DirCommand(failing, () => '/nope'))).toThrowError(
      'cannot read directory: /nope',
    );
  });

  it('同一输入多次执行输出一致（稳定排序）', () => {
    const entries: DirectoryEntry[] = [
      { name: 'b.txt', kind: 'file' },
      { name: 'a', kind: 'dir' },
      { name: 'a.txt', kind: 'file' },
    ];
    const first = run(new DirCommand(new StubReader(entries), () => '.'));
    const second = run(new DirCommand(new StubReader([...entries].reverse()), () => '.'));
    expect(second).toEqual(first);
  });
});

describe('dir：真实文件系统适配器', () => {
  it('与 FsDirectoryReader 组合后能列出临时目录内容', () => {
    const dir = mkdtempSync(join(tmpdir(), 'svgframe-dir-'));
    try {
      mkdirSync(join(dir, 'docs'));
      mkdirSync(join(dir, 'plugins'));
      writeFileSync(join(dir, 'demo.svg'), '');
      writeFileSync(join(dir, 'package.json'), '');

      expect(run(new DirCommand(new FsDirectoryReader(), () => dir))).toEqual([
        '[DIR]  docs',
        '[DIR]  plugins',
        '[FILE]  demo.svg',
        '[FILE]  package.json',
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('目录不存在时抛出 cannot read directory', () => {
    const missing = join(tmpdir(), 'svgframe-missing-dir');
    rmSync(missing, { recursive: true, force: true });
    expect(() => run(new DirCommand(new FsDirectoryReader(), () => missing))).toThrowError(
      `cannot read directory: ${missing}`,
    );
  });
});

describe('dir：接入内核后的行为', () => {
  it('没有文档也能执行，且不产生 undo 记录', () => {
    const { app, commands } = createTestComposition({ plugins: [commandDir] });
    expect(app.hasDocument).toBe(false);
    const lines = commands.execute(app, 'dir', []);
    expect(lines.length).toBeGreaterThan(0);
    expect(app.hasDocument).toBe(false);
  });

  it('有文档时执行 dir 不改变文档与撤销历史', () => {
    const { app, commands } = createTestComposition({ plugins: [commandDir] });
    app.init(100, 100);
    app.createShape('rect', 'r1', ['0', '0', '10', '10'], undefined, null);
    const before = app.document.elementCount;
    const depth = app.history.undoDepth;

    commands.execute(app, 'dir', []);

    expect(app.document.elementCount).toBe(before);
    expect(app.history.undoDepth).toBe(depth);
  });

  it('未装插件时 dir 报 unknown command', () => {
    const { app, commands } = createTestComposition();
    expect(() => commands.execute(app, 'dir', [])).toThrowError('unknown command: dir');
  });
});
