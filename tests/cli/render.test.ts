import { describe, expect, it } from 'vitest';

import { ShowRenderer } from '../../src/cli/render/ShowRenderer.js';
import { TreeRenderer } from '../../src/cli/render/TreeRenderer.js';
import { Document } from '../../src/domain/Document.js';
import { Container } from '../../src/domain/Container.js';
import { Circle } from '../../src/domain/leaf/Circle.js';
import { Rect } from '../../src/domain/leaf/Rect.js';
import { TextShape } from '../../src/domain/leaf/TextShape.js';

/** 与作业 §5.1 例 1 完全相同的文档。 */
function exampleDocument(): Document {
  const document = new Document(800, 600);
  const bg = new Rect('bg', 0, 0, 800, 600);
  bg.setAttribute('fill', '#ffffff');
  const title = new TextShape('title', 20, 40, 'My Diagram');
  const markers = new Container('markers');
  const c1 = new Circle('c1', 100, 100, 20);
  c1.setAttribute('fill', 'red');
  const box = new Rect('box', 200, 80, 60, 60);
  box.setAttribute('fill', '#3366ff');

  document.attach(document.canvas, bg);
  document.attach(document.canvas, title);
  document.attach(document.canvas, markers);
  document.attach(markers, c1);
  document.attach(markers, box);
  return document;
}

describe('TreeRenderer', () => {
  const renderer = new TreeRenderer();

  it('与作业 §5.1 例 1 逐字一致', () => {
    expect(renderer.render(exampleDocument())).toEqual([
      'svg (800x600)',
      '├── rect#bg        x=0 y=0 w=800 h=600 fill=#ffffff',
      '├── text#title     (20,40) "My Diagram"',
      '└── g#markers',
      '    ├── circle#c1  cx=100 cy=100 r=20 fill=red',
      '    └── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff',
    ]);
  });

  it('属性列全局统一对齐，深层节点也落在同一列', () => {
    // 跳过第一行画布头：它含 `(800x600)`，不是属性列
    const lines = renderer.render(exampleDocument()).slice(1);
    const starts = lines
      .map((line) => line.search(/[a-z-]+=|\(|"/))
      .filter((index) => index >= 0);
    expect(starts.length).toBeGreaterThan(1);
    expect(new Set(starts).size).toBe(1);
  });

  it('无属性的行不补空格', () => {
    const lines = renderer.render(exampleDocument());
    expect(lines[3]).toBe('└── g#markers');
  });

  it('tree <id> 只渲染该子树', () => {
    expect(renderer.render(exampleDocument(), 'markers')).toEqual([
      'g#markers',
      '├── circle#c1  cx=100 cy=100 r=20 fill=red',
      '└── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff',
    ]);
  });

  it('不存在的 id 报 no such shape', () => {
    expect(() => renderer.render(exampleDocument(), 'zzz')).toThrowError('no such shape: zzz');
  });

  it('空文档只输出画布头', () => {
    expect(renderer.render(new Document(400, 300))).toEqual(['svg (400x300)']);
  });
});

describe('ShowRenderer', () => {
  const renderer = new ShowRenderer();

  it('与作业 §5.2 逐字一致', () => {
    const document = exampleDocument();
    expect(renderer.render(document.require('c1'))).toEqual([
      'circle#c1  parent=g#markers',
      '  cx=100 cy=100 r=20',
      '  fill=red',
    ]);
  });

  it('顶层图形的父节点显示为 svg', () => {
    expect(renderer.render(exampleDocument().require('bg'))).toEqual([
      'rect#bg  parent=svg',
      '  x=0 y=0 w=800 h=600',
      '  fill=#ffffff',
    ]);
  });
});
