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

  /**
   * 结构守卫：把 `shape` 从它当前父节点上摘走之前必须先过这一关。
   *
   * 内核不认识任何具体类型，只问父节点所属的 `ShapeProvider` 是否声明了
   * `guardChildRemoval`。复合图形（如 box）借此拒绝"少一个必要子部件"的请求。
   */
  assertDetachable(shape: Shape): void {
    const parent = shape.parent;
    if (parent === null) {
      return;
    }
    const provider = this.services.shapes.find(parent.dataKind ?? parent.kind);
    provider?.guardChildRemoval?.(parent, shape);
  }
}
