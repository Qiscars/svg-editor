import type { Document } from '../../src/domain/Document.js';
import type { Shape } from '../../src/domain/Shape.js';

export interface ShapeRecord {
  readonly id: string;
  readonly kind: string;
  readonly parentId: string;
  readonly index: number;
  readonly attributes: Record<string, string | undefined>;
}

/**
 * 把整棵树摊平成可比较的记录列表。
 *
 * 撤销正确性的判据是"**整棵树与执行前完全一致**"，包括：
 * 父子关系、同级顺序、每个属性的值，以及"属性到底有没有被设置"。
 * 只比较 id 列表是不够的——那样 `move` 的 undo 即使没生效也会通过。
 */
export function snapshotDocument(document: Document): ShapeRecord[] {
  const records: ShapeRecord[] = [];

  const visit = (shape: Shape, parentId: string, index: number): void => {
    const attributes: Record<string, string | undefined> = {};
    for (const spec of shape.attributes()) {
      attributes[spec.name] = spec.read();
    }
    records.push({ id: shape.id, kind: shape.kind, parentId, index, attributes });
    shape.children.forEach((child, offset) => {
      visit(child, shape.id, offset);
    });
  };

  document.canvas.children.forEach((child, offset) => {
    visit(child, 'svg', offset);
  });
  return records;
}
