import type { CommandRegistry, EditorApp } from '@svgframe/kernel';
import { CommandRegistry as CommandRegistryClass, EditorApp as EditorAppClass } from '@svgframe/kernel';
import { PluginLoader } from '../loader/PluginLoader.js';
import type { LoadReport } from '../loader/PluginLoader.js';
import { registerBuiltinCommands } from '../cli/handlers/BuiltinCommands.js';
import type { Composition } from './Composition.js';
import { createServicesWithBuiltins } from './Composition.js';

export interface ConfiguredComposition extends Composition {
  readonly report: LoadReport;
}

/**
 * **配置装配（方式 B）**：内置能力 + 按 `plugins.config.json` 加载的插件。
 *
 * 与代码装配（`createDefaultComposition` + 手动 `activate`）的差别只在最外层：
 * 谁来实例化插件、谁决定装哪些。两者共用同一套注册表与同一条
 * `PluginContext` 注册路径，因此插件行为完全一致。
 */
export async function createConfiguredComposition(configPath: string): Promise<ConfiguredComposition> {
  const services = createServicesWithBuiltins();
  const app = new EditorAppClass(services);
  const commands = new CommandRegistryClass<EditorApp>();
  registerBuiltinCommands(commands, { shapes: services.shapes, decorators: services.decorators });

  const loader = new PluginLoader({
    shapes: services.shapes,
    commands,
    decorators: services.decorators,
    attributes: services.attributes,
  });
  const report = await loader.loadFromFile(configPath);

  return { services, app, commands, decorators: services.decorators, report };
}
