import type { ReadBackContext, Shape, ShapeProvider } from '@svgframe/kernel';
import { Numbers, ShapeError } from '@svgframe/kernel';
import { DIAMOND_DATA_KIND, DiamondShape } from './DiamondShape.js';
import { PolygonShape } from './PolygonShape.js';

/**
 * `diamond` 的图形类型扩展点实现。
 *
 * 注册**两种**类型：`diamond`（复合图形，序列化成 `<g data-kind="diamond">`）
 * 与 `polygon`（它的子部件，序列化成 `<polygon>`）。两者都通过内核的
 * `ShapeProvider` 注册，内核不需要任何改动。
 */
export class DiamondShapeProvider implements ShapeProvider {
  readonly kind = 'diamond';
  readonly parameters = ['x', 'y', 'width', 'height'] as const;
  readonly tagName = 'g';
  readonly dataKind = DIAMOND_DATA_KIND;
  readonly composite = true;

  /** `options.fill` 给新菱形一个模板默认色；缺省不填。 */
  private readonly defaultFill: string | undefined;

  constructor(defaultFill?: string) {
    this.defaultFill = defaultFill;
  }

  build(id: string, values: readonly string[]): Shape {
    const x = readNumber(values, 0, 'x');
    const y = readNumber(values, 1, 'y');
    const width = readNumber(values, 2, 'width');
    const height = readNumber(values, 3, 'height');

    const diamond = new DiamondShape(id);
    const polygon = new PolygonShape(DiamondShape.polygonIdOf(id), diamondPoints(x, y, width, height));
    if (this.defaultFill !== undefined) {
      polygon.setAttribute('fill', this.defaultFill);
    }
    diamond.appendChild(polygon);
    return diamond;
  }

  restore(context: ReadBackContext): Shape {
    const { id, children } = context;
    const polygonId = DiamondShape.polygonIdOf(id);
    if (children.length !== 1) {
      throw ShapeError.invalidSvg(`diamond ${id} expects exactly 1 child (${polygonId}), got ${children.length}`);
    }
    const polygon = children[0];
    if (polygon === undefined || polygon.id !== polygonId || !(polygon instanceof PolygonShape)) {
      throw ShapeError.invalidSvg(`diamond ${id} is missing its ${polygonId} polygon`);
    }
    const diamond = new DiamondShape(id);
    diamond.appendChild(polygon);
    return diamond;
  }

  guardChildRemoval(parent: Shape, child: Shape): void {
    throw ShapeError.invalidSvg(
      `cannot detach ${child.describeRef()} from ${parent.describeRef()}: the diamond structure is owned by the plugin`,
    );
  }
}

/** 子部件类型：让序列化知道 `<polygon>` 怎么读怎么写。 */
export class PolygonShapeProvider implements ShapeProvider {
  readonly kind = 'polygon';
  readonly parameters = ['points'] as const;
  readonly tagName = 'polygon';

  build(id: string, values: readonly string[]): Shape {
    const points = values[0];
    if (points === undefined) {
      throw ShapeError.missingParameter('points');
    }
    return new PolygonShape(id, points);
  }
}

/** 四个顶点：上、右、下、左。 */
function diamondPoints(x: number, y: number, width: number, height: number): string {
  const cx = x + width / 2;
  const cy = y + height / 2;
  return [cx, y, x + width, cy, cx, y + height, x, cy].map((value) => Numbers.format(value)).join(',');
}

function readNumber(values: readonly string[], index: number, name: string): number {
  const raw = values[index];
  if (raw === undefined) {
    throw ShapeError.missingParameter(name);
  }
  return Numbers.parse(name, raw);
}
