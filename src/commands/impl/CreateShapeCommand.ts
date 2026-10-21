import type { Container } from '../../domain/Container.js';
import type { Shape } from '../../domain/Shape.js';
import { ShapeError } from '../../domain/ShapeError.js';
import type { CommandContext } from '../CommandContext.js';
import { DocumentCommand } from '../DocumentCommand.js';

/**
 * `create <type> <id> … [in <containerId>]`。
 *
 * 图形本身由调用方（未来的 ShapeFactory）构造好再交给命令——
 * 这样命令不认识"有哪些图形类型"，只认识"往哪挂一个图形"，
 * `create` 的按类型分派就被隔离在工厂一处。
 *
 * 所有可能失败的前置条件（id 冲突、容器不存在/不是容器）都在构造函数里检查，
 * 因此 `execute()` 一旦开始就不会中途失败，不存在"改了一半"的状态。
 */
export class CreateShapeCommand extends DocumentCommand {
  private readonly shape: Shape;
  private readonly parent: Container;
  private readonly atRoot: boolean;

  constructor(context: CommandContext, shape: Shape, parentId: string | null) {
    super(context);
    if (context.document.has(shape.id)) {
      throw ShapeError.idAlreadyExists(shape.id);
    }
    this.shape = shape;
    this.parent = parentId === null ? context.document.canvas : context.requireContainer(parentId);
    this.atRoot = parentId === null;
  }

  execute(): string {
    this.document.attach(this.parent, this.shape);
    return this.atRoot
      ? `${this.shape.describeRef()} created`
      : `${this.shape.describeRef()} created in ${this.parent.describeRef()}`;
  }

  undo(): string {
    this.document.detach(this.shape);
    return `${this.shape.describeRef()} removed`;
  }
}
