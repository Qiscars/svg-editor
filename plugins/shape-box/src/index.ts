import type { PluginContext, PluginManifest, SvgFramePlugin } from '@svgframe/kernel';
import { BoxAttributeHandler } from './BoxAttributeHandler.js';
import { BoxShapeProvider } from './BoxShapeProvider.js';
import { BoxTypeLabel } from './BoxTypeLabel.js';

export { BoxShape, BOX_DATA_KIND } from './BoxShape.js';
export { BoxShapeProvider } from './BoxShapeProvider.js';
export { BoxAttributeHandler } from './BoxAttributeHandler.js';
export { BoxTypeLabel } from './BoxTypeLabel.js';

/**
 * `box` 插件：一个包同时提供**三种扩展**——
 * 图形类型（`box`）、属性语义（`fill` / `label`）、树标签（`(box)`）。
 *
 * 这正是「一个插件可以横跨多个扩展点」的示例：加载器按 `contributes` 逐类
 * 校验实际注册，三类都在同一个 `activate` 里完成。
 */
export class ShapeBoxPlugin implements SvgFramePlugin {
  readonly name = 'shape-box';
  readonly contributes: PluginManifest = {
    shapes: ['box'],
    attributes: ['box-attributes'],
    decorators: ['box-type-label'],
  };

  activate(context: PluginContext): void {
    context.shapes.register(new BoxShapeProvider());
    context.attributes.register(new BoxAttributeHandler());
    context.decorators.register(new BoxTypeLabel());
  }
}

/** 配置装配与代码装配都通过这个默认导出拿到同一个插件类。 */
export default new ShapeBoxPlugin();
