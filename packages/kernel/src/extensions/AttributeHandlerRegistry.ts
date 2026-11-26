import type { Shape } from '../domain/Shape.js';
import { RegistryError } from './RegistryError.js';
import type { AttributeHandler } from './AttributeHandler.js';

/**
 * 属性处理器注册表。
 *
 * 冲突规则（见 doc/README.md ADR-1）：**所有命中的处理器按注册顺序依次执行**。
 * 选择"组合"而不是"拒绝"或"首个胜出"，是因为同一条 `set` 可能确实需要
 * 多个关注点（例如一个处理器管几何传播、另一个管级联样式），
 * 而顺序在清单里是确定的，不会出现未定义的覆盖。
 */
export class AttributeHandlerRegistry {
  private readonly handlers: AttributeHandler[] = [];

  register(handler: AttributeHandler): void {
    if (this.handlers.some((existing) => existing.name === handler.name)) {
      throw RegistryError.duplicateRegistration(`attributes/${handler.name}`);
    }
    this.handlers.push(handler);
  }

  unregister(name: string): void {
    const index = this.handlers.findIndex((handler) => handler.name === name);
    if (index >= 0) {
      this.handlers.splice(index, 1);
    }
  }

  /** 按注册顺序返回全部命中的处理器。 */
  matching(shape: Shape, attr: string): readonly AttributeHandler[] {
    return this.handlers.filter((handler) => handler.handles(shape, attr));
  }

  has(shape: Shape, attr: string): boolean {
    return this.handlers.some((handler) => handler.handles(shape, attr));
  }

  list(): readonly AttributeHandler[] {
    return [...this.handlers];
  }
}
