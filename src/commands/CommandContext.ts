import type { Container } from '../domain/Container.js';
import type { Document } from '../domain/Document.js';
import type { Shape } from '../domain/Shape.js';

/**
 * 命令执行时能拿到的东西。
 *
 * 存在的理由：让具体命令依赖"上下文"而不是直接抓 `Document`。
 * 现在它只包一份文档，但以后要加输出端口、警告收集、id 生成器时，
 * 只需扩这里，不必改每一条命令的构造函数。
 */
export class CommandContext {
  private readonly documentValue: Document;

  constructor(document: Document) {
    this.documentValue = document;
  }

  get document(): Document {
    return this.documentValue;
  }

  /** 取图形，不存在直接抛 `no such shape`。 */
  require(id: string): Shape {
    return this.documentValue.require(id);
  }

  /** 取容器，区分 `no such container` 与 `not a container`。 */
  requireContainer(id: string): Container {
    return this.documentValue.requireContainer(id);
  }
}
