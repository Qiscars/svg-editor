import { Container } from '../domain/Container.js';
import { Circle } from '../domain/leaf/Circle.js';
import { Ellipse } from '../domain/leaf/Ellipse.js';
import { Line } from '../domain/leaf/Line.js';
import { Rect } from '../domain/leaf/Rect.js';
import { TextShape } from '../domain/leaf/TextShape.js';
import { Numbers } from '../domain/Numbers.js';
import { ShapeError } from '../domain/ShapeError.js';
import type { ShapeProvider } from '../extensions/ShapeProvider.js';

/**
 * Phase 1 的六种内置图形。
 *
 * 它们**不是特例**：与插件提供的 `box` 走完全相同的 `ShapeProvider` 注册路径，
 * 由宿主的默认装配注册进 `ShapeRegistry`。这样「内置」与「插件」在内核眼里没有区别，
 * 加载器也就不需要为内置实现开任何后门。
 *
 * 之所以放在内核包里而不是宿主包里：图形类型是领域概念，宿主只负责装配。
 */
export function builtinShapeProviders(): ShapeProvider[] {
  return [
    {
      kind: 'rect',
      parameters: ['x', 'y', 'width', 'height'],
      optionalStyle: 'fill',
      build: (id, values) =>
        new Rect(id, number(values, 0, 'x'), number(values, 1, 'y'), number(values, 2, 'width'), number(values, 3, 'height')),
    },
    {
      kind: 'circle',
      parameters: ['cx', 'cy', 'r'],
      optionalStyle: 'fill',
      build: (id, values) =>
        new Circle(id, number(values, 0, 'cx'), number(values, 1, 'cy'), number(values, 2, 'r')),
    },
    {
      kind: 'ellipse',
      parameters: ['cx', 'cy', 'rx', 'ry'],
      optionalStyle: 'fill',
      build: (id, values) =>
        new Ellipse(id, number(values, 0, 'cx'), number(values, 1, 'cy'), number(values, 2, 'rx'), number(values, 3, 'ry')),
    },
    {
      kind: 'line',
      parameters: ['x1', 'y1', 'x2', 'y2'],
      optionalStyle: 'stroke',
      build: (id, values) =>
        new Line(id, number(values, 0, 'x1'), number(values, 1, 'y1'), number(values, 2, 'x2'), number(values, 3, 'y2')),
    },
    {
      kind: 'text',
      parameters: ['x', 'y', 'text'],
      build: (id, values) =>
        new TextShape(id, number(values, 0, 'x'), number(values, 1, 'y'), raw(values, 2, 'text')),
    },
    {
      kind: 'g',
      parameters: [],
      build: (id) => new Container(id),
    },
  ];
}

function number(values: readonly string[], index: number, name: string): number {
  return Numbers.parse(name, raw(values, index, name));
}

function raw(values: readonly string[], index: number, name: string): string {
  const value = values[index];
  if (value === undefined) {
    throw ShapeError.missingParameter(name);
  }
  return value;
}
