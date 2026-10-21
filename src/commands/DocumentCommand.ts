import type { Document } from '../domain/Document.js';
import type { Command } from './Command.js';
import type { CommandContext } from './CommandContext.js';

/**
 * 需要访问文档的命令的共同基类。
 *
 * 只做一件事：把 `CommandContext` 收起来并提供 `document` 访问器，
 * 省掉每条命令重复写字段与构造函数。业务逻辑一律留在子类。
 */
export abstract class DocumentCommand implements Command {
  protected readonly context: CommandContext;

  protected constructor(context: CommandContext) {
    this.context = context;
  }

  abstract execute(): string;

  abstract undo(): string;

  protected get document(): Document {
    return this.context.document;
  }
}
