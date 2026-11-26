import { Numbers } from '../../domain/Numbers.js';
import type { Shape } from '../../domain/Shape.js';
import { ShapeError } from '../../domain/ShapeError.js';
import { ShapeSnapshot } from '../ShapeSnapshot.js';
import type { CommandContext } from '../CommandContext.js';
import { DocumentCommand } from '../DocumentCommand.js';

/**
 * `scale <id> <factor>`：等比缩放，factor 同乘到图形的全部几何属性。
 *
 * 撤销同样走属性快照而不是 `scale(1/factor)`：
 * `scale(3)` 之后再 `scale(1/3)` 会因为浮点误差回不到原坐标。
 */
export class ScaleShapeCommand extends DocumentCommand {
  private readonly shape: Shape;
  private readonly factor: number;
  private snapshot: ShapeSnapshot | null = null;

  constructor(context: CommandContext, id: string, factor: number) {
    super(context);
    if (!(factor > 0) || !Number.isFinite(factor)) {
      throw ShapeError.scaleFactorNotPositive();
    }
    this.shape = context.require(id);
    this.factor = factor;
  }

  execute(): string {
    this.snapshot = ShapeSnapshot.capture(this.shape);
    this.shape.scale(this.factor);
    return `${this.shape.describeRef()} scaled by ${Numbers.format(this.factor)}`;
  }

  undo(): string {
    this.snapshot?.restore();
    this.snapshot = null;
    return `${this.shape.describeRef()} scaled back by ${Numbers.format(1 / this.factor)}`;
  }
}
