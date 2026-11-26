import type { PluginContext, PluginManifest, SvgFramePlugin } from '@svgframe/kernel';
import { DiamondShapeProvider, PolygonShapeProvider } from './DiamondShapeProvider.js';

export { DiamondShape, DIAMOND_DATA_KIND } from './DiamondShape.js';
export { PolygonShape } from './PolygonShape.js';
export { DiamondShapeProvider, PolygonShapeProvider } from './DiamondShapeProvider.js';

/**
 * `diamond` 插件（拓展任务）：菱形复合图形。
 *
 * 它同时演示了两件事：
 * 1. **接入新插件不需要改内核**——用到的全是既有的 `ShapeProvider`、
 *    `data-kind` 复合图形、读回还原与 `guardChildRemoval` 钩子；
 * 2. **`options` 的用法**——配置里写 `"options": { "fill": "#f5a623" }`
 *    就成了新菱形的模板默认色。
 */
export class ShapeDiamondPlugin implements SvgFramePlugin {
  readonly name = 'shape-diamond';
  readonly contributes: PluginManifest = { shapes: ['diamond', 'polygon'] };

  activate(context: PluginContext): void {
    const fill = context.options.fill;
    context.shapes.register(new DiamondShapeProvider(typeof fill === 'string' ? fill : undefined));
    context.shapes.register(new PolygonShapeProvider());
  }
}

export default new ShapeDiamondPlugin();
