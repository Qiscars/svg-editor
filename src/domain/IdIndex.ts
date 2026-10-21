import type { Shape } from './Shape.js';
import { ShapeError } from './ShapeError.js';

/**
 * id → 图形的唯一索引。
 *
 * 为什么需要独立索引：id 是命令、agent、鼠标三种通道唯一的定位手段，
 * 每次都遍历整棵树找是 O(n)，而 `create` 还要判断"id 是否已存在"。
 * 索引集中一处，也便于将来换成结构路径寻址时只改这里（见 doc/README.md §1.4 第 6 条）。
 *
 * 职责很窄：只管一张表，不管树结构；子树的批量登记/注销由 `Document` 负责遍历。
 */
export class IdIndex {
  private readonly entries = new Map<string, Shape>();

  get size(): number {
    return this.entries.size;
  }

  has(id: string): boolean {
    return this.entries.has(id);
  }

  get(id: string): Shape | undefined {
    return this.entries.get(id);
  }

  /** 取不到就抛 `no such shape`，命令层不必到处写空值判断。 */
  require(id: string): Shape {
    const shape = this.entries.get(id);
    if (shape === undefined) {
      throw ShapeError.noSuchShape(id);
    }
    return shape;
  }

  add(shape: Shape): void {
    if (this.entries.has(shape.id)) {
      throw ShapeError.idAlreadyExists(shape.id);
    }
    this.entries.set(shape.id, shape);
  }

  remove(id: string): void {
    this.entries.delete(id);
  }

  values(): IterableIterator<Shape> {
    return this.entries.values();
  }

  clear(): void {
    this.entries.clear();
  }
}
