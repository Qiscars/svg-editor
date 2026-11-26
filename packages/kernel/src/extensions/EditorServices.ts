import type { AttributeHandlerRegistry } from './AttributeHandlerRegistry.js';
import type { ShapeRegistry } from './ShapeRegistry.js';
import type { TreeDecoratorRegistry } from './TreeDecoratorRegistry.js';

/**
 * 内核运行所需的全部扩展点注册表。
 *
 * 内核的类（`EditorApp`、`CommandContext`、`SvgParser`、`SvgSerializer`）都通过
 * 这个袋子拿到注册表，而不是自己去创建——于是「进程里有哪几个插件」
 * 完全由装配处决定，内核不持有任何默认实现。
 */
export interface EditorServices {
  readonly shapes: ShapeRegistry;
  readonly attributes: AttributeHandlerRegistry;
  readonly decorators: TreeDecoratorRegistry;
}
