import { Numbers } from '../../domain/Numbers.js';
import type { Shape } from '../../domain/Shape.js';
import { ShapeSnapshot } from '../ShapeSnapshot.js';
import type { CommandContext } from '../CommandContext.js';
import { DocumentCommand } from '../DocumentCommand.js';

/**
 * `move <id> <dx> <dy>`：平移，作用于容器时递归到每个子孙。
 *
 * 反馈文本区分两类目标（与作业 §6 的 transcript 一致）：
 * - 叶子有代表点 → `circle#c1 moved to (130,100)`（绝对位置更直观）
 * - 容器没有代表点 → `g#node2 moved by (0,100)`（只能报位移）
 */
export class MoveShapeCommand extends DocumentCommand {
  private readonly shape: Shape;
  private readonly dx: number;
  private readonly dy: number;
  private snapshot: ShapeSnapshot | null = null;

  constructor(context: CommandContext, id: string, dx: number, dy: number) {
    super(context);
    this.shape = context.require(id);
    this.dx = dx;
    this.dy = dy;
  }

  execute(): string {
    this.snapshot = ShapeSnapshot.capture(this.shape);
    this.shape.move(this.dx, this.dy);

    const anchor = this.shape.anchorPoint();
    return anchor === null
      ? `${this.shape.describeRef()} moved by ${formatPair(this.dx, this.dy)}`
      : `${this.shape.describeRef()} moved to ${Numbers.formatPoint(anchor.x, anchor.y)}`;
  }

  undo(): string {
    this.snapshot?.restore();
    this.snapshot = null;

    const anchor = this.shape.anchorPoint();
    return anchor === null
      ? `${this.shape.describeRef()} moved back by ${formatPair(-this.dx, -this.dy)}`
      : `${this.shape.describeRef()} moved back to ${Numbers.formatPoint(anchor.x, anchor.y)}`;
  }
}

function formatPair(x: number, y: number): string {
  return `(${Numbers.format(x)},${Numbers.format(y)})`;
}
