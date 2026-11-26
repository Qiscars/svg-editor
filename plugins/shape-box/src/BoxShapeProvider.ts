import type { ReadBackContext, Shape, ShapeProvider } from '@svgframe/kernel';
import { Numbers, Rect, ShapeError, TextShape } from '@svgframe/kernel';
import { BOX_DATA_KIND, BoxShape } from './BoxShape.js';

/**
 * `box` 的图形类型扩展点实现。
 *
 * 三个要点：
 * 1. **`create` 与读回共用同一套派生规则**——子部件 id 一定是 `<id>-rect` / `<id>-label`；
 * 2. **读回是严格的**：缺子部件或类型不对就拒绝整份读入（见 ADR-2），
 *    绝不构造一个"半成品 box"；
 * 3. **不变量守卫**：普通命令想删/移走必要子部件时通过 `guardChildRemoval` 拒绝。
 */
export class BoxShapeProvider implements ShapeProvider {
  readonly kind = 'box';
  readonly parameters = ['x', 'y', 'width', 'height', 'text'] as const;
  /** 渲染成 `<g data-kind="box">`，而不是自定义标签 */
  readonly tagName = 'g';
  readonly dataKind = BOX_DATA_KIND;
  /** 不可被 `ungroup` 拆开：内部结构归插件所有 */
  readonly composite = true;

  build(id: string, values: readonly string[]): Shape {
    const x = readNumber(values, 0, 'x');
    const y = readNumber(values, 1, 'y');
    const width = readNumber(values, 2, 'width');
    const height = readNumber(values, 3, 'height');
    const text = readText(values, 4, 'text');

    const box = new BoxShape(id);
    box.appendChild(new Rect(BoxShape.rectIdOf(id), x, y, width, height));
    box.appendChild(new TextShape(BoxShape.labelIdOf(id), labelX(x, width), labelY(y, height), text));
    return box;
  }

  restore(context: ReadBackContext): Shape {
    const { id, children } = context;
    const rectId = BoxShape.rectIdOf(id);
    const labelId = BoxShape.labelIdOf(id);

    if (children.length !== 2) {
      throw ShapeError.invalidSvg(
        `box ${id} expects exactly 2 children (${rectId}, ${labelId}), got ${children.length}`,
      );
    }
    const rect = children.find((child) => child.id === rectId);
    const label = children.find((child) => child.id === labelId);
    if (rect === undefined || label === undefined) {
      throw ShapeError.invalidSvg(`box ${id} is missing ${rect === undefined ? rectId : labelId}`);
    }
    if (!(rect instanceof Rect) || !(label instanceof TextShape)) {
      throw ShapeError.invalidSvg(`box ${id} has wrong child types for ${rectId} / ${labelId}`);
    }

    const box = new BoxShape(id);
    box.appendChild(rect);
    box.appendChild(label);
    return box;
  }

  /** 必要子部件不允许被普通命令摘走。 */
  guardChildRemoval(parent: Shape, child: Shape): void {
    throw ShapeError.invalidSvg(
      `cannot detach ${child.describeRef()} from ${parent.describeRef()}: the box structure is owned by the plugin`,
    );
  }
}

/** 标题的左内边距 */
const LABEL_PADDING_X = 20;

function labelX(x: number, _width: number): number {
  return x + LABEL_PADDING_X;
}

function labelY(y: number, height: number): number {
  // 基线下移半个高度再补偿半个字高，视觉上大致居中
  return y + height / 2 + 5;
}

function readNumber(values: readonly string[], index: number, name: string): number {
  const raw = values[index];
  if (raw === undefined) {
    throw ShapeError.missingParameter(name);
  }
  return Numbers.parse(name, raw);
}

function readText(values: readonly string[], index: number, name: string): string {
  const raw = values[index];
  if (raw === undefined) {
    throw ShapeError.missingParameter(name);
  }
  return raw;
}
