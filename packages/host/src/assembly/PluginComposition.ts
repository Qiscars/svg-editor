import shapeBox from '@svgframe/plugin-shape-box';
import shapeDiamond from '@svgframe/plugin-shape-diamond';
import commandDir from '@svgframe/plugin-command-dir';
import commandStats from '@svgframe/plugin-command-stats';
import treeStar from '@svgframe/plugin-tree-star';
import type { CommandRegistry, EditorApp, SvgFramePlugin } from '@svgframe/kernel';
import { CommandRegistry as CommandRegistryClass, EditorApp as EditorAppClass } from '@svgframe/kernel';
import { registerBuiltinCommands } from '../cli/handlers/BuiltinCommands.js';
import { activatePlugin } from '../loader/activatePlugin.js';
import type { Composition } from './Composition.js';
import { createServicesWithBuiltins } from './Composition.js';

/**
 * **代码装配（方式 A）的组合根**。
 *
 * 这里是全项目唯一"用 `import` 写死插件清单"的地方：新增一个插件
 * 只需在上面加一行 import、在 `PLUGINS` 数组里加一项，**别的运行代码一行不动**。
 *
 * 它与配置装配（`--config plugins.config.json`）共用 `activatePlugin`，
 * 因此两条路径的校验与回滚行为完全一致。
 */
const PLUGINS: readonly SvgFramePlugin<EditorApp>[] = [shapeBox, shapeDiamond, commandStats, commandDir, treeStar];

export interface CodeAssemblyResult extends Composition {
  readonly errors: readonly string[];
}

export function createCodeAssembledComposition(): CodeAssemblyResult {
  const services = createServicesWithBuiltins();
  const app = new EditorAppClass(services);
  const commands = new CommandRegistryClass<EditorApp>();
  registerBuiltinCommands(commands, { shapes: services.shapes, decorators: services.decorators });

  const targets = {
    shapes: services.shapes,
    commands: commands as CommandRegistry<EditorApp>,
    decorators: services.decorators,
    attributes: services.attributes,
  };

  const errors: string[] = [];
  for (const plugin of PLUGINS) {
    const outcome = activatePlugin(plugin, targets);
    if (!outcome.ok) {
      errors.push(outcome.error);
    }
  }

  return { services, app, commands, decorators: services.decorators, errors };
}
