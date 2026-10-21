import { Canvas } from './Canvas.js';
import { Container } from './Container.js';
import { IdIndex } from './IdIndex.js';
import type { Shape } from './Shape.js';
import { ShapeError } from './ShapeError.js';

/**
 * 当前编辑的文档：画布根 + id 索引 + 结构不变量。
 *
 * 它是**结构变更的唯一入口**。任何挂载/摘除都必须走 `attach` / `detach`，
 * 否则 id 索引和父指针会不同步——而 id 索引正是命令定位图形的唯一依据。
 */
export class Document {
  private readonly canvasValue: Canvas;
  private readonly index: IdIndex;
  private sourceFileValue: string | null = null;

  constructor(width: number, height: number) {
    this.canvasValue = new Canvas(width, height);
    this.index = new IdIndex();
  }

  get canvas(): Canvas {
    return this.canvasValue;
  }

  get idIndex(): IdIndex {
    return this.index;
  }

  /** 已登记的元素总数（不含画布根）。`save` 的 "(N elements)" 用它。 */
  get elementCount(): number {
    return this.index.size;
  }

  /** `read` 时的文件路径；`save` 不带参数时回写到这里。 */
  get sourceFile(): string | null {
    return this.sourceFileValue;
  }

  setSourceFile(path: string | null): void {
    this.sourceFileValue = path;
  }

  // ── 查找 ────────────────────────────────────────────────────────────────

  has(id: string): boolean {
    return this.index.has(id);
  }

  find(id: string): Shape | undefined {
    return this.index.get(id);
  }

  /** 取不到抛 `no such shape`。 */
  require(id: string): Shape {
    return this.index.require(id);
  }

  /** `in <containerId>` 子句用：区分"不存在"与"存在但不是容器"两种错误。 */
  requireContainer(id: string): Container {
    const shape = this.index.get(id);
    if (shape === undefined) {
      throw ShapeError.noSuchContainer(id);
    }
    if (!(shape instanceof Container)) {
      throw ShapeError.notAContainer(id);
    }
    return shape;
  }

  // ── 结构变更 ────────────────────────────────────────────────────────────

  /**
   * 把图形挂到 `parent` 下并登记整棵子树的 id。
   *
   * 两种情况要区分开：
   * - **首次挂载**（图形是新建的游离节点）：登记整棵子树；
   * - **移动归属**（`group` / `addto`）：图形已在本文档的索引里，
   *   只改父指针，不能重复登记——否则会误报 `id already exists`。
   */
  attach(parent: Container, shape: Shape, index?: number): void {
    if (shape.contains(parent)) {
      // 把容器插进自己的子孙会形成环，树就不成立了
      throw ShapeError.cannotGroupIntoDescendant(shape.id);
    }
    const alreadyRegistered = this.index.get(shape.id) === shape;
    if (!alreadyRegistered) {
      this.registerTree(shape);
    }
    try {
      parent.insertChild(index ?? parent.childCount, shape);
    } catch (error) {
      // 插入失败不能让索引留下幽灵条目
      if (!alreadyRegistered) {
        this.unregisterTree(shape);
      }
      throw error;
    }
  }

  /** 从父容器摘下并注销整棵子树的 id。 */
  detach(shape: Shape): void {
    const parent = shape.parent;
    if (parent === null) {
      throw ShapeError.noSuchShape(shape.id);
    }
    parent.removeChild(shape);
    this.unregisterTree(shape);
  }

  // ── 遍历 ────────────────────────────────────────────────────────────────

  /** 深度优先遍历全部图形（不含画布根）。 */
  *shapes(): Generator<Shape> {
    for (const child of this.canvasValue.children) {
      yield* Document.walkSubtree(child);
    }
  }

  private static *walkSubtree(shape: Shape): Generator<Shape> {
    yield shape;
    for (const child of shape.children) {
      yield* Document.walkSubtree(child);
    }
  }

  /** 结构性失败前的清空（`init` / `read` 换文档时用）。 */
  clear(): void {
    for (const child of [...this.canvasValue.children]) {
      this.canvasValue.removeChild(child);
    }
    this.index.clear();
  }

  private registerTree(shape: Shape): void {
    this.index.add(shape);
    for (const child of shape.children) {
      this.registerTree(child);
    }
  }

  private unregisterTree(shape: Shape): void {
    for (const child of shape.children) {
      this.unregisterTree(child);
    }
    this.index.remove(shape.id);
  }
}
