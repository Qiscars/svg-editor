import { describe, expect, it } from 'vitest';

import { Container } from '../../src/domain/Container.js';
import { Circle } from '../../src/domain/leaf/Circle.js';
import { Ellipse } from '../../src/domain/leaf/Ellipse.js';
import { Line } from '../../src/domain/leaf/Line.js';
import { Rect } from '../../src/domain/leaf/Rect.js';
import { TextShape } from '../../src/domain/leaf/TextShape.js';
import { ShapeError } from '../../src/domain/ShapeError.js';

/** 作业 §4.1 的 set 白名单：各类型自身几何属性 + 三个公共样式属性。 */
const COMMON = ['fill', 'stroke', 'stroke-width'];

describe('set 白名单与作业 §4.1 一致', () => {
  const cases: [string, string[], { settableAttributes: () => readonly string[] }][] = [
    ['rect', ['x', 'y', 'width', 'height'], new Rect('r1', 0, 0, 1, 1)],
    ['circle', ['cx', 'cy', 'r'], new Circle('c1', 0, 0, 1)],
    ['ellipse', ['cx', 'cy', 'rx', 'ry'], new Ellipse('e1', 0, 0, 1, 1)],
    ['line', ['x1', 'y1', 'x2', 'y2'], new Line('l1', 0, 0, 1, 1)],
    ['text', ['x', 'y', 'text'], new TextShape('t1', 0, 0, 'hi')],
    ['g', [], new Container('g1')],
  ];

  for (const [kind, geometry, shape] of cases) {
    it(`${kind} 的白名单 = 几何属性 + 公共样式`, () => {
      expect([...shape.settableAttributes()].sort()).toEqual([...geometry, ...COMMON].sort());
    });
  }
});

describe('set 写入与读回', () => {
  it('几何属性写入后能读回，并按 Numbers 的格式输出', () => {
    const rect = new Rect('r1', 0, 0, 1, 1);
    rect.setAttribute('x', '12.5');
    expect(rect.getAttribute('x')).toBe('12.5');
    expect(rect.describeInline()).toBe('x=12.5 y=0 w=1 h=1');
  });

  it('整数不出现 .0', () => {
    const circle = new Circle('c1', 0, 0, 1);
    circle.setAttribute('r', '20.0');
    expect(circle.getAttribute('r')).toBe('20');
  });

  it('text 的内容可以整体改写', () => {
    const text = new TextShape('t1', 20, 40, 'My Diagram');
    text.setAttribute('text', 'My Diagram v2');
    expect(text.content).toBe('My Diagram v2');
    expect(text.describeInline()).toBe('(20,40) "My Diagram v2"');
  });

  it('公共样式三个属性都可读写', () => {
    const rect = new Rect('r1', 0, 0, 1, 1);
    rect.setAttribute('fill', '#4a90d9');
    rect.setAttribute('stroke', 'black');
    rect.setAttribute('stroke-width', '2');
    expect(rect.describeInline()).toBe('x=0 y=0 w=1 h=1 fill=#4a90d9 stroke=black stroke-width=2');
  });

  it('未设置的样式属性读回 undefined，不会伪装成 0', () => {
    const rect = new Rect('r1', 0, 0, 1, 1);
    expect(rect.getAttribute('fill')).toBeUndefined();
    expect(rect.getAttribute('stroke')).toBeUndefined();
    expect(rect.getAttribute('stroke-width')).toBeUndefined();
    expect(rect.describeInline()).toBe('x=0 y=0 w=1 h=1');
  });
});

describe('set 的错误路径', () => {
  it('白名单外的属性报 unknown attribute', () => {
    const rect = new Rect('r1', 0, 0, 1, 1);
    expect(() => rect.setAttribute('radius', '1')).toThrowError(
      new ShapeError('unknown attribute: radius'),
    );
  });

  it('别的类型的几何属性不算本类型的白名单', () => {
    // r 是 circle 的属性，不是 rect 的
    const rect = new Rect('r1', 0, 0, 1, 1);
    expect(() => rect.setAttribute('r', '5')).toThrowError('unknown attribute: r');
  });

  it('数值属性收到非法值时报 invalid value，且原值不变', () => {
    const circle = new Circle('c1', 0, 0, 20);
    expect(() => circle.setAttribute('r', 'abc')).toThrowError('invalid value for r: abc');
    expect(circle.r).toBe(20);
  });

  it('数值属性收到空串同样报错', () => {
    const circle = new Circle('c1', 0, 0, 20);
    expect(() => circle.setAttribute('r', '   ')).toThrowError('invalid value for r:');
  });

  it('NaN / Infinity 都被拒绝', () => {
    const circle = new Circle('c1', 0, 0, 20);
    expect(() => circle.setAttribute('cx', 'NaN')).toThrowError('invalid value for cx');
    expect(() => circle.setAttribute('cx', 'Infinity')).toThrowError('invalid value for cx');
  });
});

describe('describeDetailLines 与作业 §5.2 一致', () => {
  it('circle 的明细是几何行 + 样式行', () => {
    const circle = new Circle('c1', 100, 100, 20);
    circle.setAttribute('fill', 'red');
    expect(circle.describeDetailLines()).toEqual(['cx=100 cy=100 r=20', 'fill=red']);
  });

  it('没有样式时只有几何行', () => {
    const rect = new Rect('r1', 0, 0, 10, 10);
    expect(rect.describeDetailLines()).toEqual(['x=0 y=0 w=10 h=10']);
  });
});

describe('id 的合法性', () => {
  it('空 id 被拒绝', () => {
    expect(() => new Rect('', 0, 0, 1, 1)).toThrowError('invalid id');
  });

  it('含空白的 id 被拒绝（分词后无法还原）', () => {
    expect(() => new Rect('a b', 0, 0, 1, 1)).toThrowError('invalid id');
  });

  it('大小写敏感：R1 与 r1 是两个不同的 id', () => {
    const upper = new Rect('R1', 0, 0, 1, 1);
    const lower = new Rect('r1', 0, 0, 1, 1);
    expect(upper.id).not.toBe(lower.id);
  });
});
