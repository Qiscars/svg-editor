import type { PluginContext, PluginManifest, SvgFramePlugin } from '@svgframe/kernel';
import { ModifiedStarDecorator } from './ModifiedStarDecorator.js';

export { ModifiedStarDecorator } from './ModifiedStarDecorator.js';

/** `modified-star` 标签插件。状态全部在插件实例里，不共享。 */
export class TreeStarPlugin implements SvgFramePlugin {
  readonly name = 'tree-star';
  readonly contributes: PluginManifest = { decorators: ['modified-star'] };

  activate(context: PluginContext): void {
    context.decorators.register(new ModifiedStarDecorator());
  }
}

export default new TreeStarPlugin();
