import { Shape } from './Shape.js';
import type { AttributeSpec } from './Shape.js';
import { ShapeError } from './ShapeError.js';

/**
 * 容器（对应 `<g>`）——Composite 模式的组合节点。
 *
 * 关键点：它**没有自己的几何**。`move` / `scale` 只是把操作递归给每个子孙，
 * 因此命令层不需要知道目标是不是容器——`move node2 0 100` 与 `move c1 30 0`
 * 走的是同一个 `command → shape.move()`，命令实现里没有任何 `if (isContainer)` 分支。
 *
 * 为什么不用 `transform="translate()"`：作业 §2 规定 `scale` 要把 factor 同乘到
 * 图形的全部几何属性，用 transform 会让 `tree` / `show` 显示的坐标与文件里的
 * 坐标对不上，违反"属性内联的树才能脱离画布工作"这条要求。
 */
export class Container extends Shape {
  private readonly childrenList: Shape[] = [];

  constructor(id: string) {
    super(id);
  }

  get kind(): string {
    return 'g';
  }

  override get children(): readonly Shape[] {
    return this.childrenList;
  }

  get childCount(): number {
    return this.childrenList.length;
  }

  // ── 结构 ────────────────────────────────────────────────────────────────

  /** 追加为最后一个子节点（`create ... in <g>` / `addto` 的语义）。 */
  appendChild(shape: Shape): void {
    this.insertChild(this.childrenList.length, shape);
  }

  /**
   * 插入到指定位置。若图形已属于别的容器，先从原父容器摘下——
   * 这样"移动归属"不会产生悬空父指针。
   */
  insertChild(index: number, shape: Shape): void {
    if (shape === this) {
      throw ShapeError.cannotInsertIntoSelf(shape.id);
    }
    const currentParent = shape.parent;
    if (currentParent !== null) {
      currentParent.removeChild(shape);
    }
    const at = Math.max(0, Math.min(index, this.childrenList.length));
    this.childrenList.splice(at, 0, shape);
    shape.attachTo(this);
  }

  removeChild(shape: Shape): boolean {
    const index = this.childrenList.indexOf(shape);
    if (index === -1) {
      return false;
    }
    this.childrenList.splice(index, 1);
    shape.attachTo(null);
    return true;
  }

  indexOf(shape: Shape): number {
    return this.childrenList.indexOf(shape);
  }

  // ── Composite 语义 ─────────────────────────────────────────────────────

  move(dx: number, dy: number): void {
    for (const child of this.childrenList) {
      child.move(dx, dy);
    }
  }

  scale(factor: number): void {
    for (const child of this.childrenList) {
      child.scale(factor);
    }
  }

  override contains(shape: Shape): boolean {
    if (shape === this) {
      return true;
    }
    return this.childrenList.some((child) => child.contains(shape));
  }

  clone(): Container {
    const copy = this.createClone();
    for (const child of this.childrenList) {
      copy.appendChild(child.clone());
    }
    return copy;
  }

  /** 子类（`Canvas`）用它换掉克隆体的构造方式，而不用重写整个 `clone`。 */
  protected createClone(): Container {
    const copy = new Container(this.id);
    this.copyStyleTo(copy);
    return copy;
  }

  // ── 几何（容器没有自己的几何）─────────────────────────────────────────

  protected geometryAttributes(): readonly AttributeSpec[] {
    return [];
  }

  protected geometryInline(): string {
    return '';
  }
}
