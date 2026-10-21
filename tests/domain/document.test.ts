import { describe, expect, it } from 'vitest';

import { Container } from '../../src/domain/Container.js';
import { Document } from '../../src/domain/Document.js';
import { Circle } from '../../src/domain/leaf/Circle.js';
import { Rect } from '../../src/domain/leaf/Rect.js';

describe('id 索引与唯一性', () => {
  it('挂载后可按 id 取回', () => {
    const document = new Document(800, 600);
    const rect = new Rect('r1', 0, 0, 10, 10);
    document.attach(document.canvas, rect);

    expect(document.has('r1')).toBe(true);
    expect(document.require('r1')).toBe(rect);
    expect(document.elementCount).toBe(1);
  });

  it('重复的 id 报 id already exists', () => {
    const document = new Document(800, 600);
    document.attach(document.canvas, new Rect('r1', 0, 0, 10, 10));

    expect(() => document.attach(document.canvas, new Rect('r1', 0, 0, 5, 5))).toThrowError(
      'id already exists: r1',
    );
  });

  it('子树里的 id 也进索引', () => {
    const document = new Document(800, 600);
    const group = new Container('g1');
    document.attach(document.canvas, group);
    document.attach(group, new Circle('c1', 0, 0, 1));

    expect(document.has('c1')).toBe(true);
    expect(document.elementCount).toBe(2);
  });

  it('子树里的 id 与顶层 id 冲突时也要报错', () => {
    const document = new Document(800, 600);
    document.attach(document.canvas, new Rect('dup', 0, 0, 1, 1));
    const group = new Container('g1');
    document.attach(document.canvas, group);

    expect(() => document.attach(group, new Rect('dup', 0, 0, 1, 1))).toThrowError(
      'id already exists: dup',
    );
  });

  it('取不存在的 id 报 no such shape', () => {
    const document = new Document(800, 600);
    expect(() => document.require('zzz')).toThrowError('no such shape: zzz');
    expect(document.find('zzz')).toBeUndefined();
  });

  it('画布根不进索引，命令无法把它当成普通图形', () => {
    const document = new Document(800, 600);
    expect(document.has('svg')).toBe(false);
    expect(() => document.require('svg')).toThrowError('no such shape: svg');
  });
});

describe('结构变更', () => {
  it('detach 会连同整棵子树注销 id', () => {
    const document = new Document(800, 600);
    const group = new Container('g1');
    document.attach(document.canvas, group);
    document.attach(group, new Rect('r1', 0, 0, 1, 1));
    document.attach(group, new Circle('c1', 0, 0, 1));

    document.detach(group);

    expect(document.elementCount).toBe(0);
    expect(document.has('g1')).toBe(false);
    expect(document.has('r1')).toBe(false);
    expect(group.parent).toBeNull();
  });

  it('移动归属：换父容器后索引不变、父指针更新', () => {
    const document = new Document(800, 600);
    const group = new Container('g1');
    const rect = new Rect('r1', 0, 0, 1, 1);
    document.attach(document.canvas, group);
    document.attach(document.canvas, rect);

    document.attach(group, rect);

    expect(rect.parent).toBe(group);
    expect(document.require('r1')).toBe(rect);
    expect(document.elementCount).toBe(2);
    expect(group.children).toHaveLength(1);
  });

  it('插入失败后索引不留幽灵条目', () => {
    const document = new Document(800, 600);
    const outer = new Container('outer');
    const inner = new Container('inner');
    document.attach(document.canvas, outer);
    document.attach(outer, inner);

    // 把 outer 插进它自己的子孙 inner → 形成环，必须拒绝
    expect(() => document.attach(inner, outer)).toThrowError(
      'cannot group a container into its own descendant: outer',
    );
    expect(document.elementCount).toBe(2);
  });

  it('容器不能插进自己', () => {
    const group = new Container('g1');
    expect(() => group.insertChild(0, group)).toThrowError(
      'cannot insert a container into itself: g1',
    );
  });
});

describe('requireContainer 区分两种错误', () => {
  it('不存在 → no such container', () => {
    const document = new Document(800, 600);
    expect(() => document.requireContainer('node9')).toThrowError('no such container: node9');
  });

  it('存在但是叶子 → not a container', () => {
    const document = new Document(800, 600);
    document.attach(document.canvas, new Rect('r1', 0, 0, 1, 1));
    expect(() => document.requireContainer('r1')).toThrowError('not a container: r1');
  });

  it('容器可以取回', () => {
    const document = new Document(800, 600);
    const group = new Container('g1');
    document.attach(document.canvas, group);
    expect(document.requireContainer('g1')).toBe(group);
  });
});

describe('遍历与清空', () => {
  it('shapes() 深度优先，且不含画布根', () => {
    const document = new Document(800, 600);
    const group = new Container('g1');
    document.attach(document.canvas, new Rect('a', 0, 0, 1, 1));
    document.attach(document.canvas, group);
    document.attach(group, new Rect('b', 0, 0, 1, 1));
    document.attach(group, new Rect('c', 0, 0, 1, 1));

    expect([...document.shapes()].map((shape) => shape.id)).toEqual(['a', 'g1', 'b', 'c']);
  });

  it('clear 之后索引与画布都空了', () => {
    const document = new Document(800, 600);
    document.attach(document.canvas, new Rect('r1', 0, 0, 1, 1));
    document.clear();

    expect(document.elementCount).toBe(0);
    expect(document.canvas.children).toHaveLength(0);
    expect(document.has('r1')).toBe(false);
  });

  it('源文件路径可以被记录与清空（save 无参时回写）', () => {
    const document = new Document(800, 600);
    expect(document.sourceFile).toBeNull();
    document.setSourceFile('demo.svg');
    expect(document.sourceFile).toBe('demo.svg');
  });
});
