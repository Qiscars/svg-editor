import { Container } from '../../domain/Container.js';
import type { Shape } from '../../domain/Shape.js';
import { ShapeError } from '../../domain/ShapeError.js';
import type { CommandContext } from '../CommandContext.js';
import { DocumentCommand } from '../DocumentCommand.js';

/**
 * `ungroup <gid>`：解散容器，子图形提升到原容器的父级并占据原位置。
 *
 * 拒绝两种情况：
 * - **顶层容器**（画布的直接子节点）不能解散——作业 §4.2 明确要求
 *   `cannot ungroup top-level container`，否则一解散子节点就直接挂到画布根上，
 *   层级信息丢失且无处"撤销回去"；
 * - **复合图形**（后续插件阶段的 `box`）不能解散——内部结构归插件所有。
 *   本阶段没有插件，所以这个分支还没落地。
 */
export class UngroupCommand extends DocumentCommand {
  private readonly group: Container;
  private readonly parent: Container;
  private readonly index: number;
  private readonly children: readonly Shape[];

  constructor(context: CommandContext, groupId: string) {
    super(context);
    const shape = context.require(groupId);
    if (!(shape instanceof Container)) {
      throw ShapeError.notAContainer(groupId);
    }
    const parent = shape.parent;
    if (parent === null) {
      throw new Error(`internal: container ${groupId} has no parent`);
    }
    if (parent === context.document.canvas) {
      throw ShapeError.cannotUngroupTopLevel(groupId);
    }
    this.group = shape;
    this.parent = parent;
    this.index = parent.indexOf(shape);
    this.children = [...shape.children];
  }

  execute(): string {
    this.children.forEach((child, offset) => {
      this.document.attach(this.parent, child, this.index + offset);
    });
    this.document.detach(this.group);
    return `${this.group.describeRef()} ungrouped, ${this.children.length} children moved to ${this.parent.describeRef()}`;
  }

  undo(): string {
    this.document.attach(this.parent, this.group, this.index);
    for (const child of this.children) {
      this.document.attach(this.group, child);
    }
    return `${this.group.describeRef()} restored with ${this.children.length} children`;
  }
}
