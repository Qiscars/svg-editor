import type { Container } from '../../domain/Container.js';
import type { Shape } from '../../domain/Shape.js';
import { ShapeError } from '../../domain/ShapeError.js';
import type { CommandContext } from '../CommandContext.js';
import { DocumentCommand } from '../DocumentCommand.js';

/**
 * `addto <gid> <id>`：把已有图形移入容器（作为最后一个子节点）。
 *
 * 与 `group` 的区别是"移动归属"而非"收编成组"：不新建容器，只改父指针。
 * 撤销时插回**原父容器的原下标**，所以视觉上图形会回到原来的位置。
 */
export class AddToCommand extends DocumentCommand {
  private readonly group: Container;
  private readonly shape: Shape;
  private readonly originParent: Container;
  private readonly originIndex: number;

  constructor(context: CommandContext, groupId: string, id: string) {
    super(context);
    this.group = context.requireContainer(groupId);
    this.shape = context.require(id);
    if (this.shape.contains(this.group)) {
      // 把容器移进自己的子孙会形成环
      throw ShapeError.cannotGroupIntoDescendant(this.shape.id);
    }
    const parent = this.shape.parent;
    if (parent === null) {
      throw new Error(`internal: shape ${id} has no parent`);
    }
    this.originParent = parent;
    this.originIndex = parent.indexOf(this.shape);
  }

  execute(): string {
    this.document.attach(this.group, this.shape);
    return `${this.shape.describeRef()} moved into ${this.group.describeRef()}`;
  }

  undo(): string {
    this.document.attach(this.originParent, this.shape, this.originIndex);
    return `${this.shape.describeRef()} moved back to ${this.originParent.describeRef()}`;
  }
}
