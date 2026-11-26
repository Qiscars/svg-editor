import type { Container } from '../../domain/Container.js';
import type { Shape } from '../../domain/Shape.js';
import type { CommandContext } from '../CommandContext.js';
import { DocumentCommand } from '../DocumentCommand.js';

/**
 * `delete <id>`：删除图形，容器则连同全部子孙。
 *
 * 撤销用的 Memento 只有三样东西：被删对象本身、原父容器、原下标。
 * 子树不用深拷贝，因为摘下来的对象一直活着，只是脱离了树与 id 索引；
 * 重新挂回去时 `Document.attach` 会把整棵子树的 id 一并登记回来。
 *
 * 这也是"一条命令 = 一个 undo 单元"的直接体现：删一个容器连同它的子孙，
 * 只产生一个栈元素。
 */
export class DeleteShapeCommand extends DocumentCommand {
  private readonly shape: Shape;
  private readonly parent: Container;
  private readonly index: number;

  constructor(context: CommandContext, id: string) {
    super(context);
    const shape = context.require(id);
    const parent = shape.parent;
    if (parent === null) {
      throw new Error(`internal: indexed shape ${id} has no parent`);
    }
    this.shape = shape;
    this.parent = parent;
    this.index = parent.indexOf(shape);
  }

  execute(): string {
    this.document.detach(this.shape);
    return `${this.shape.describeRef()} deleted`;
  }

  undo(): string {
    this.document.attach(this.parent, this.shape, this.index);
    return this.parent === this.document.canvas
      ? `${this.shape.describeRef()} restored`
      : `${this.shape.describeRef()} restored into ${this.parent.describeRef()}`;
  }
}
