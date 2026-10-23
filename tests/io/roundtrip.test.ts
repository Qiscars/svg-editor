import { describe, expect, it } from 'vitest';

import { Document } from '../../src/domain/Document.js';
import { Container } from '../../src/domain/Container.js';
import { Circle } from '../../src/domain/leaf/Circle.js';
import { Ellipse } from '../../src/domain/leaf/Ellipse.js';
import { Line } from '../../src/domain/leaf/Line.js';
import { Rect } from '../../src/domain/leaf/Rect.js';
import { TextShape } from '../../src/domain/leaf/TextShape.js';
import { SvgParser } from '../../src/io/SvgParser.js';
import { SvgSerializer } from '../../src/io/SvgSerializer.js';
import { snapshotDocument } from '../helpers/snapshot.js';

/** 一份用到了全部六种图形、且带嵌套与样式的文档。 */
function richDocument(): Document {
  const document = new Document(640, 480);

  const bg = new Rect('bg', 0, 0, 640, 480);
  bg.setAttribute('fill', '#ffffff');
  document.attach(document.canvas, bg);

  const title = new TextShape('title', 20, 40, 'Round Trip');
  title.setAttribute('fill', '#333333');
  document.attach(document.canvas, title);

  const group = new Container('group');
  document.attach(document.canvas, group);

  const circle = new Circle('c1', 100, 100, 20);
  circle.setAttribute('fill', 'red');
  circle.setAttribute('stroke', 'black');
  circle.setAttribute('stroke-width', '2');
  document.attach(group, circle);

  const ellipse = new Ellipse('e1', 200, 150, 30, 15);
  document.attach(group, ellipse);

  const line = new Line('l1', 0, 0, 100, 100);
  line.setAttribute('stroke', '#000');
  document.attach(group, line);

  const inner = new Container('inner');
  document.attach(group, inner);
  const deepText = new TextShape('deep', 5.5, 6.25, '含 <标签> 与 & 符号 "引号"');
  document.attach(inner, deepText);

  return document;
}

describe('save → read 往返', () => {
  const serializer = new SvgSerializer();
  const parser = new SvgParser();

  it('整棵树的结构与属性在往返后完全不变', () => {
    const original = richDocument();
    const text = serializer.serialize(original);
    const { document: restored, warnings } = parser.parse(text);

    expect(warnings).toEqual([]);
    expect(snapshotDocument(restored)).toStrictEqual(snapshotDocument(original));
  });

  it('小数坐标往返后不被抹掉也不用科学计数法', () => {
    const original = richDocument();
    const restored = parser.parse(serializer.serialize(original)).document;
    expect(restored.require('deep').getAttribute('x')).toBe('5.5');
    expect(restored.require('deep').getAttribute('y')).toBe('6.25');
  });

  it('文本里的 < & 会被转义，双引号在元素内容里无需转义', () => {
    const original = richDocument();
    const text = serializer.serialize(original);

    expect(text).toContain('&lt;标签&gt;');
    expect(text).toContain('&amp;');
    // 元素**内容**里 " 是合法字符，只在属性值里才需要转义
    expect(text).toContain('符号 "引号"');

    const restored = parser.parse(text).document;
    expect(restored.require('deep').describeInline()).toContain('含 <标签> 与 & 符号 "引号"');
  });

  it('属性值里的双引号会被转义', () => {
    const document = new Document(100, 100);
    const rect = new Rect('r1', 0, 0, 10, 10);
    rect.setAttribute('fill', 'weird"value');
    document.attach(document.canvas, rect);

    expect(serializer.serialize(document)).toContain('fill="weird&quot;value"');
  });

  it('序列化两次结果稳定（幂等）', () => {
    const first = serializer.serialize(richDocument());
    const second = serializer.serialize(parser.parse(first).document);
    expect(second).toBe(first);
  });

  it('样式属性不会被序列化器遗漏，也不会凭空多出来', () => {
    const original = richDocument();
    const restored = parser.parse(serializer.serialize(original)).document;

    expect(restored.require('c1').getAttribute('stroke-width')).toBe('2');
    expect(restored.require('bg').getAttribute('stroke')).toBeUndefined();
    expect(restored.require('e1').getAttribute('fill')).toBeUndefined();
  });

  it('画布尺寸往返后不变', () => {
    const original = richDocument();
    const restored = parser.parse(serializer.serialize(original)).document;
    expect([restored.canvas.width, restored.canvas.height]).toEqual([640, 480]);
  });
});

describe('外部 SVG 的兼容性', () => {
  const parser = new SvgParser();

  it('缺 id 的元素按「标签名 + 序号」补名并产生 warning', () => {
    const result = parser.parse(`<svg width="100" height="100">
      <rect x="0" y="0" width="10" height="10"/>
      <circle cx="5" cy="5" r="2"/>
    </svg>`);

    expect(result.warnings).toEqual([
      'assigned id rect1 to unnamed <rect>',
      'assigned id circle1 to unnamed <circle>',
    ]);
    expect(result.document.has('rect1')).toBe(true);
    expect(result.document.has('circle1')).toBe(true);
  });

  it('补名会避开文件后面出现的显式 id（避免撞名）', () => {
    const result = parser.parse(`<svg width="100" height="100">
      <rect x="0" y="0" width="10" height="10"/>
      <rect id="rect1" x="1" y="1" width="1" height="1"/>
    </svg>`);

    // 第一个矩形不能拿到 rect1（后面已被显式占用），只能是 rect2
    expect(result.warnings).toEqual(['assigned id rect2 to unnamed <rect>']);
    expect(result.document.has('rect2')).toBe(true);
    expect(result.document.has('rect1')).toBe(true);
  });

  it('不认识的元素被跳过，不影响其余图形', () => {
    const result = parser.parse(`<svg width="100" height="100">
      <style>rect{fill:red}</style>
      <defs><clipPath id="c"><rect width="1" height="1"/></clipPath></defs>
      <rect id="r1" x="0" y="0" width="10" height="10"/>
    </svg>`);

    expect(result.document.elementCount).toBe(1);
    expect(result.document.has('r1')).toBe(true);
  });

  it('缺 width / height 时退回 viewBox', () => {
    const result = parser.parse('<svg viewBox="0 0 320 240"></svg>');
    expect([result.document.canvas.width, result.document.canvas.height]).toEqual([320, 240]);
  });

  it('百分比宽度无法静态求值时退回 viewBox', () => {
    const result = parser.parse('<svg width="100%" height="100%" viewBox="0 0 200 100"></svg>');
    expect([result.document.canvas.width, result.document.canvas.height]).toEqual([200, 100]);
  });

  it('缺省几何属性按 0 处理，不炸整个文件', () => {
    const result = parser.parse('<svg width="10" height="10"><rect id="r1"/></svg>');
    expect(result.document.require('r1').describeInline()).toBe('x=0 y=0 w=0 h=0');
  });
});

describe('非法 SVG 的报错', () => {
  const parser = new SvgParser();

  it('根元素不是 svg', () => {
    expect(() => parser.parse('<html/>')).toThrowError('invalid SVG: root element is <html>, expected <svg>');
  });

  it('标签未闭合', () => {
    expect(() => parser.parse('<svg><g id="a"><rect/></svg>')).toThrowError(/^invalid SVG: mismatched closing tag/);
  });

  it('属性引号未结束', () => {
    expect(() => parser.parse('<svg width="10></svg>')).toThrowError(/^invalid SVG:/);
  });

  it('空文档', () => {
    expect(() => parser.parse('')).toThrowError('invalid SVG: expected a root element');
  });
});
