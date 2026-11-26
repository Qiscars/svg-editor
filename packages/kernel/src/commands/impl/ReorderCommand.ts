import type { Container } from '../../domain/Container.js';
import type { Shape } from '../../domain/Shape.js';
import type { CommandContext } from '../CommandContext.js';
import { DocumentCommand } from '../DocumentCommand.js';

export type ReorderTarget = 'front' | 'back';

/**
 * `front <id>` / `back <id>`：在同级里调到最前/最后。
 *
 * front 与 back 只有一个下标差异，所以做成一条命令加方向参数，
 * 而不是两个几乎重复的类。z-order 只改兄弟顺序，不动 id 索引。
 */
export class ReorderCommand extends DocumentCommand {
  private readonly shape: Shape;
  private readonly target: ReorderTarget;
  private previousIndex: number;

  constructor(context: CommandContext, id: string, target: ReorderTarget) {
    super(context);
    this.shape = context.require(id);
    this.target = target;
    this.previousIndex = requireParent(this.shape).indexOf(this.shape);
  }

  execute(): string {
    const parent = requireParent(this.shape);
    this.previousIndex = parent.indexOf(this.shape);
    parent.removeChild(this.shape);
    parent.insertChild(this.target === 'front' ? parent.childCount : 0, this.shape);
    return `${this.shape.describeRef()} moved to ${this.target}`;
  }

  undo(): string {
    const parent = requireParent(this.shape);
    parent.removeChild(this.shape);
    parent.insertChild(this.previousIndex, this.shape);
    return `${this.shape.describeRef()} restored to position ${this.previousIndex + 1}`;
  }
}

function requireParent(shape: Shape): Container {
  const parent = shape.parent;
  if (parent === null) {
    throw new Error(`internal: shape ${shape.id} has no parent`);
  }
  return parent;
}
