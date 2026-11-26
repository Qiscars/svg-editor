import type { Shape } from '../../domain/Shape.js';
import { ShapeError } from '../../domain/ShapeError.js';
import type { AttributeHandler } from '../../extensions/AttributeHandler.js';
import { ShapeSnapshot } from '../ShapeSnapshot.js';
import type { CommandContext } from '../CommandContext.js';
import { DocumentCommand } from '../DocumentCommand.js';

/**
 * `set <id> <attr> <value>`：改一个属性。
 *
 * Phase 2 之后这里有三条路径，顺序固定（见 doc/README.md ADR-1）：
 *
 * 1. **处理器路径**：注册表里有处理器认领该「图形 + 属性」，由它们按注册顺序执行；
 * 2. **默认路径**：没有处理器时走 Phase 1 的白名单规则（行为与输出逐字节不变）；
 * 3. **报错**：都没有负责方 → `unknown attribute`。
 *
 * 事务性由**子树快照**保证：执行前对整个子树拍快照，处理器即便连改多个子部件，
 * 一次 `undo` 也能整体还原；处理器中途抛错则立刻用快照回滚并继续抛出
 * （**不再回落到默认路径**，避免掩盖错误或重复修改）。
 */
export class SetAttributeCommand extends DocumentCommand {
  private readonly shape: Shape;
  private readonly attribute: string;
  private readonly nextValue: string;

  private snapshot: ShapeSnapshot | null = null;
  private handledBy: readonly AttributeHandler[] = [];
  private previousValue: string | undefined = undefined;
  private previousExisted = false;

  constructor(context: CommandContext, id: string, attribute: string, value: string) {
    super(context);
    this.shape = context.require(id);
    if (!this.matchesHandler(attribute) && !this.shape.settableAttributes().includes(attribute)) {
      throw ShapeError.unknownAttribute(attribute);
    }
    this.attribute = attribute;
    this.nextValue = value;
  }

  execute(): string {
    const handlers = this.context.services.attributes.matching(this.shape, this.attribute);
    this.snapshot = ShapeSnapshot.capture(this.shape);

    if (handlers.length > 0) {
      this.handledBy = handlers;
      const messages: string[] = [];
      try {
        for (const handler of handlers) {
          const message = handler.apply(this.shape, this.attribute, this.nextValue);
          if (message !== undefined) {
            messages.push(message);
          }
        }
      } catch (error) {
        // 部分修改后失败：整棵子树回滚，且调用方不会把这条命令压进 undo 栈
        this.snapshot.restore();
        this.snapshot = null;
        this.handledBy = [];
        throw error;
      }
      return messages.length > 0
        ? messages.join('\n')
        : `${this.shape.describeRef()} updated: ${formatAssignment(this.attribute, this.nextValue)}`;
    }

    // 默认路径：Phase 1 的行为，消息逐字节保持一致
    this.previousValue = this.shape.getAttribute(this.attribute);
    this.previousExisted = this.previousValue !== undefined;
    this.shape.setAttribute(this.attribute, this.nextValue);
    return `${this.shape.describeRef()} updated: ${formatAssignment(this.attribute, this.nextValue)}`;
  }

  undo(): string {
    if (this.handledBy.length > 0) {
      this.snapshot?.restore();
      this.snapshot = null;
      const custom = this.handledBy
        .map((handler) => handler.undoMessage?.(this.shape, this.attribute))
        .filter((message): message is string => message !== undefined);
      return custom.length > 0
        ? custom.join('\n')
        : `${this.shape.describeRef()} ${this.attribute} restored`;
    }

    const previous = this.previousValue;
    if (this.previousExisted && previous !== undefined) {
      this.shape.setAttribute(this.attribute, previous);
      return `${this.shape.describeRef()} updated: ${formatAssignment(this.attribute, previous)}`;
    }
    this.shape.unsetAttribute(this.attribute);
    return `${this.shape.describeRef()} ${this.attribute} removed`;
  }

  private matchesHandler(attribute: string): boolean {
    return this.context.services.attributes.matching(this.shape, attribute).length > 0;
  }
}

/**
 * 作业 §5/§6 的写法：`text="My Diagram v2"`。
 * 文本内容与含空格的值加引号，其余原样输出（`fill=#ffffff`）。
 */
function formatAssignment(attribute: string, value: string): string {
  const needsQuote = attribute === 'text' || /\s/.test(value);
  return needsQuote ? `${attribute}="${value}"` : `${attribute}=${value}`;
}
