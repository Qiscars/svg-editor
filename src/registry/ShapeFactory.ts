import { Container } from '../domain/Container.js';
import { Circle } from '../domain/leaf/Circle.js';
import { Ellipse } from '../domain/leaf/Ellipse.js';
import { Line } from '../domain/leaf/Line.js';
import { Rect } from '../domain/leaf/Rect.js';
import { TextShape } from '../domain/leaf/TextShape.js';
import { Numbers } from '../domain/Numbers.js';
import type { Shape } from '../domain/Shape.js';
import { ShapeError } from '../domain/ShapeError.js';

/**
 * 一种图形类型的构造说明。
 *
 * `parameters` 是**位置参数名**，同时被两处使用：
 * - `create <type> <id> …` 的 CLI 参数（#21 的 parser 按它校验个数）；
 * - SVG 解析时按同样的名字从属性表里取值（`<rect x y width height>`）。
 *
 * 两处共用一个声明，就不会出现"create 的参数顺序和文件里的属性顺序不一致"。
 */
export interface ShapeDefinition {
  readonly kind: string;
  readonly parameters: readonly string[];
  build(id: string, values: readonly string[]): Shape;
}

/**
 * 图形工厂：**作业允许的两处按名字分派之一**（第 ① 处），已登记为待重构项 R1。
 *
 * 它同时服务于两个入口：CLI 的 `create`（位置参数）和 SVG 解析（属性表）。
 * 将来做插件化时，把这里从"构造函数里硬注册"换成"外部 register"即可，
 * 领域层与命令层都不用动——这正是 doc/README.md §1.4 第 1 条留的口子。
 */
export class ShapeFactory {
  private readonly definitions = new Map<string, ShapeDefinition>();

  /** 内核内置的六种类型（作业 §4.1）。 */
  static createDefault(): ShapeFactory {
    const factory = new ShapeFactory();
    factory.register({
      kind: 'rect',
      parameters: ['x', 'y', 'width', 'height'],
      build: (id, values) =>
        new Rect(id, number(values, 0, 'x'), number(values, 1, 'y'), number(values, 2, 'width'), number(values, 3, 'height')),
    });
    factory.register({
      kind: 'circle',
      parameters: ['cx', 'cy', 'r'],
      build: (id, values) =>
        new Circle(id, number(values, 0, 'cx'), number(values, 1, 'cy'), number(values, 2, 'r')),
    });
    factory.register({
      kind: 'ellipse',
      parameters: ['cx', 'cy', 'rx', 'ry'],
      build: (id, values) =>
        new Ellipse(id, number(values, 0, 'cx'), number(values, 1, 'cy'), number(values, 2, 'rx'), number(values, 3, 'ry')),
    });
    factory.register({
      kind: 'line',
      parameters: ['x1', 'y1', 'x2', 'y2'],
      build: (id, values) =>
        new Line(id, number(values, 0, 'x1'), number(values, 1, 'y1'), number(values, 2, 'x2'), number(values, 3, 'y2')),
    });
    factory.register({
      kind: 'text',
      parameters: ['x', 'y', 'text'],
      build: (id, values) =>
        new TextShape(id, number(values, 0, 'x'), number(values, 1, 'y'), text(values, 2, 'text')),
    });
    factory.register({
      kind: 'g',
      parameters: [],
      build: (id) => new Container(id),
    });
    return factory;
  }

  register(definition: ShapeDefinition): void {
    if (this.definitions.has(definition.kind)) {
      throw new Error(`internal: shape kind already registered: ${definition.kind}`);
    }
    this.definitions.set(definition.kind, definition);
  }

  has(kind: string): boolean {
    return this.definitions.has(kind);
  }

  kinds(): readonly string[] {
    return [...this.definitions.keys()];
  }

  /** 取不到就报作业 §4.2 的 `unknown shape type`（带插件提示）。 */
  require(kind: string): ShapeDefinition {
    const definition = this.definitions.get(kind);
    if (definition === undefined) {
      throw ShapeError.unknownShapeType(kind);
    }
    return definition;
  }

  create(kind: string, id: string, values: readonly string[]): Shape {
    return this.require(kind).build(id, values);
  }
}

function number(values: readonly string[], index: number, name: string): number {
  const raw = values[index];
  if (raw === undefined) {
    throw ShapeError.missingParameter(name);
  }
  return Numbers.parse(name, raw);
}

function text(values: readonly string[], index: number, name: string): string {
  const raw = values[index];
  if (raw === undefined) {
    throw ShapeError.missingParameter(name);
  }
  return raw;
}
