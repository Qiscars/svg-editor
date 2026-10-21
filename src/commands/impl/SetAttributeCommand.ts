import type { Shape } from '../../domain/Shape.js';
import { ShapeError } from '../../domain/ShapeError.js';
import type { CommandContext } from '../CommandContext.js';
import { DocumentCommand } from '../DocumentCommand.js';

/**
 * `set <id> <attr> <value>`：改一个属性。
 *
 * 白名单与类型校验都不在这里——`Shape.setAttribute` 是模板方法，先查
 * 类型自己声明的白名单，再交给对应 `AttributeSpec` 做类型化赋值。
 * 命令只负责**记住旧值**，撤销时写回（原本没有该属性就真的去掉，而不是设成空串）。
 *
 * 白名单在构造函数里先查一遍，让错误在命令入栈之前就暴露。
 */
export class SetAttributeCommand extends DocumentCommand {
  private readonly shape: Shape;
  private readonly attribute: string;
  private readonly nextValue: string;
  private previousValue: string | undefined = undefined;
  private previousExisted = false;

  constructor(context: CommandContext, id: string, attribute: string, value: string) {
    super(context);
    this.shape = context.require(id);
    if (!this.shape.settableAttributes().includes(attribute)) {
      throw ShapeError.unknownAttribute(attribute);
    }
    this.attribute = attribute;
    this.nextValue = value;
  }

  execute(): string {
    this.previousValue = this.shape.getAttribute(this.attribute);
    this.previousExisted = this.previousValue !== undefined;
    this.shape.setAttribute(this.attribute, this.nextValue);
    return `${this.shape.describeRef()} updated: ${formatAssignment(this.attribute, this.nextValue)}`;
  }

  undo(): string {
    const previous = this.previousValue;
    if (this.previousExisted && previous !== undefined) {
      this.shape.setAttribute(this.attribute, previous);
      return `${this.shape.describeRef()} updated: ${formatAssignment(this.attribute, previous)}`;
    }
    this.shape.unsetAttribute(this.attribute);
    return `${this.shape.describeRef()} ${this.attribute} removed`;
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
