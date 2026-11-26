import { Container } from '../../domain/Container.js';
import type { Shape } from '../../domain/Shape.js';
import { ShapeError } from '../../domain/ShapeError.js';
import type { CommandContext } from '../CommandContext.js';
import { CommandError } from '../CommandError.js';
import { DocumentCommand } from '../DocumentCommand.js';

interface Origin {
  readonly parent: Container;
  readonly index: number;
}

/**
 * `group <newGid> <id1> <id2> …`：新建容器并收编若干已有图形。
 *
 * 三个要点：
 * 1. **收编顺序按命令行的顺序**，不是文档顺序——用户写了什么顺序就是什么顺序；
 * 2. 新容器插在**第一个被收编图形的原位置**，这样视觉上"就地成组"；
 * 3. 撤销要逐个把子节点插回**各自原来的父容器与下标**。
 *    插回时必须按原下标升序，否则后插入的会把先插入的挤走。
 */
export class GroupCommand extends DocumentCommand {
  private readonly group: Container;
  private readonly children: readonly Shape[];
  private readonly hostParent: Container;
  private readonly hostIndex: number;
  private origins: readonly Origin[] = [];

  constructor(context: CommandContext, newGroupId: string, ids: readonly string[]) {
    super(context);
    if (ids.length === 0) {
      throw CommandError.emptyGroupList();
    }
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) {
        throw CommandError.duplicateGroupMember(id);
      }
      seen.add(id);
    }
    if (context.document.has(newGroupId)) {
      throw ShapeError.idAlreadyExists(newGroupId);
    }

    const children = ids.map((id) => context.require(id));

    // 同时选中一个容器和它自己的子孙：合并后会形成环，必须拒绝。
    // contains() 是 Composite 语义，这里是多态的，不需要 instanceof。
    for (const candidate of children) {
      for (const other of children) {
        if (other !== candidate && candidate.contains(other)) {
          throw ShapeError.cannotGroupIntoDescendant(candidate.id);
        }
      }
    }

    const first = children[0];
    const hostParent = first?.parent ?? null;
    if (first === undefined || hostParent === null) {
      throw new Error('internal: grouped shape has no parent');
    }

    this.group = new Container(newGroupId);
    this.children = children;
    this.hostParent = hostParent;
    this.hostIndex = hostParent.indexOf(first);
  }

  execute(): string {
    this.origins = this.children.map((shape) => {
      const parent = shape.parent;
      if (parent === null) {
        throw new Error(`internal: shape ${shape.id} has no parent`);
      }
      return { parent, index: parent.indexOf(shape) };
    });

    this.document.attach(this.hostParent, this.group, this.hostIndex);
    for (const child of this.children) {
      this.document.attach(this.group, child);
    }
    return `${this.group.describeRef()} created with ${this.children.length} children`;
  }

  undo(): string {
    const ordered = this.children
      .map((shape, offset) => ({ shape, origin: this.origins[offset] }))
      .sort((left, right) => (left.origin?.index ?? 0) - (right.origin?.index ?? 0));

    for (const { shape, origin } of ordered) {
      if (origin === undefined) {
        continue;
      }
      this.document.attach(origin.parent, shape, origin.index);
    }
    this.document.detach(this.group);
    return `${this.group.describeRef()} dissolved`;
  }
}
