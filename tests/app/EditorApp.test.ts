import { unlinkSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { EditorApp } from '../../src/app/EditorApp.js';

const TMP = join('out', 'app-test.svg');

afterEach(() => {
  try {
    unlinkSync(TMP);
  } catch {
    // 文件可能没被创建，忽略
  }
});

describe('init / canvas', () => {
  it('init 不带参数时用默认 800x600', () => {
    const app = new EditorApp();
    expect(app.init()).toEqual(['canvas 800x600 created']);
    expect([app.document.canvas.width, app.document.canvas.height]).toEqual([800, 600]);
  });

  it('canvas 无参数显示当前尺寸，不改变状态', () => {
    const app = new EditorApp();
    app.init(1024, 768);
    expect(app.canvas()).toEqual(['canvas 1024x768']);
    expect([app.document.canvas.width, app.document.canvas.height]).toEqual([1024, 768]);
  });

  it('canvas 带参数改尺寸，并关上撤销闸门', () => {
    const app = new EditorApp();
    app.init(800, 600);
    app.createShape('rect', 'r1', ['0', '0', '10', '10'], undefined, null);

    expect(app.canvas(1200, 800)).toEqual(['canvas resized to 1200x800']);
    expect([app.document.canvas.width, app.document.canvas.height]).toEqual([1200, 800]);
    expect(() => app.undo()).toThrowError('undo not allowed after io command');

    // 下一次编辑命令重新解禁
    app.createShape('rect', 'r2', ['0', '0', '1', '1'], undefined, null);
    expect(app.undo()).toBe('rect#r2 removed');
  });

  it('画布改尺寸后图形坐标不变（不是整体缩放）', () => {
    const app = new EditorApp();
    app.init(800, 600);
    app.createShape('rect', 'r1', ['10', '20', '30', '40'], undefined, null);

    app.canvas(1600, 1200);

    expect(app.document.require('r1').describeInline()).toBe('x=10 y=20 w=30 h=40');
  });
});

describe('init / read 会作废旧历史', () => {
  it('init 之后 undo 直接报闸门错误', () => {
    const app = new EditorApp();
    app.init();
    app.createShape('rect', 'r1', ['0', '0', '1', '1'], undefined, null);
    expect(app.history.undoDepth).toBe(1);

    app.init();

    expect(app.history.undoDepth).toBe(0);
    expect(() => app.undo()).toThrowError('undo not allowed after io command');
  });
});

describe('save 的路径规则', () => {
  it('从未 read 过又没给路径时报错', () => {
    const app = new EditorApp();
    app.init();
    expect(() => app.save()).toThrowError('no file to save to; give a path');
  });

  it('给了路径就写入，并把该路径记为当前文件', () => {
    const app = new EditorApp();
    app.init(100, 100);
    app.createShape('rect', 'r1', ['0', '0', '10', '10'], undefined, null);

    expect(app.save(TMP)).toEqual([`saved to ${TMP} (1 elements)`]);
    expect(app.document.sourceFile).toBe(TMP);

    // 不带参数时回落到上次保存/读取的路径
    expect(app.save()).toEqual([`saved to ${TMP} (1 elements)`]);
  });

  it('read 之后不带参数 save 写回同一路径', () => {
    const writer = new EditorApp();
    writer.init(100, 100);
    writer.createShape('rect', 'r1', ['0', '0', '10', '10'], undefined, null);
    writer.save(TMP);

    const reader = new EditorApp();
    expect(reader.read(TMP)).toEqual([`read ${TMP} (1 elements)`]);
    expect(reader.document.sourceFile).toBe(TMP);
    expect(reader.save()).toEqual([`saved to ${TMP} (1 elements)`]);
  });
});
