import type { Container } from '../domain/Container.js';
import type { Document } from '../domain/Document.js';
import type { Shape } from '../domain/Shape.js';
import type { EditorServices } from '../extensions/EditorServices.js';

/**
 * 命令执行时能拿到的东西。
 *
 * 除了文档，还带上了扩展点注册表——`set` 要查属性处理器、`ungroup` 要查
 * 图形类型是否为"不可拆开的复合图形"。命令因此不需要知道任何具体插件。
 */
export class CommandContext {
  readonly document: Document;
  readonly services: EditorServices;

  constructor(document: Document, services: EditorServices) {
    this.document = document;
    this.services = services;
  }

  /** 取图形，不存在直接抛 `no such shape`。 */
  require(id: string): Shape {
    return this.document.require(id);
  }

  /** 取容器，区分 `no such container` 与 `not a container`。 */
  requireContainer(id: string): Container {
    return this.document.requireContainer(id);
  }
}
