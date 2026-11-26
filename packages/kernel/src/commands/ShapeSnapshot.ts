import type { Shape } from '../domain/Shape.js';

interface AttributeEntry {
  readonly name: string;
  readonly value: string | undefined;
}

interface ShapeEntry {
  readonly shape: Shape;
  readonly attributes: readonly AttributeEntry[];
}

/**
 * 一棵子树的属性快照（Memento）。
 *
 * 为什么不用"反向操作"（`move(dx,dy)` 的逆是 `move(-dx,-dy)`）：
 * 浮点加减不保证回到原值（`0.1 + 0.2 - 0.2 !== 0.1`），而
 * `scale(3)` 的逆 `scale(1/3)` 更是必然带误差。
 * 快照记的是**属性的字符串原值**，恢复时逐字写回，因此 undo 是精确的。
 *
 * 为什么不是整文档快照：撤销栈里每一层都存整棵树，深度一上去内存就爆。
 * 这里只记受影响的子树，且只记属性、不复制结构——
 * `move` / `scale` 不改变树结构，所以这样做是完备的。
 */
export class ShapeSnapshot {
  private readonly entries: readonly ShapeEntry[];

  private constructor(entries: readonly ShapeEntry[]) {
    this.entries = entries;
  }

  /** 深度优先记录整棵子树的全部可写属性（含"未设置"）。 */
  static capture(root: Shape): ShapeSnapshot {
    const entries: ShapeEntry[] = [];
    const visit = (shape: Shape): void => {
      entries.push({
        shape,
        attributes: shape.attributes().map((spec) => ({ name: spec.name, value: spec.read() })),
      });
      for (const child of shape.children) {
        visit(child);
      }
    };
    visit(root);
    return new ShapeSnapshot(entries);
  }

  /** 逐字写回。结构没有变化，所以只需要恢复属性。 */
  restore(): void {
    for (const entry of this.entries) {
      for (const attribute of entry.attributes) {
        if (attribute.value === undefined) {
          entry.shape.unsetAttribute(attribute.name);
        } else {
          entry.shape.setAttribute(attribute.name, attribute.value);
        }
      }
    }
  }
}
