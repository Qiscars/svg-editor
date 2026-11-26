import type { CommandRegistry, EditorApp, EditorServices, TreeDecoratorRegistry } from '@svgframe/kernel';
import { AttributeHandlerRegistry } from '@svgframe/kernel';
import { builtinShapeProviders } from '@svgframe/kernel';
import { CommandRegistry as CommandRegistryClass } from '@svgframe/kernel';
import { EditorApp as EditorAppClass } from '@svgframe/kernel';
import { FileGateway } from '@svgframe/kernel';
import type { ShapeRegistry } from '@svgframe/kernel';
import { ShapeRegistry as ShapeRegistryClass } from '@svgframe/kernel';
import { TreeDecoratorRegistry as TreeDecoratorRegistryClass } from '@svgframe/kernel';
import type { TreeDecoratorRegistry as TreeDecoratorRegistryType } from '@svgframe/kernel';
import { registerBuiltinCommands } from '../cli/handlers/BuiltinCommands.js';

/** 一次装配的产物：注册表、应用实例，以及给测试用的 services。 */
export interface Composition {
  readonly services: EditorServices;
  readonly app: EditorApp;
  readonly commands: CommandRegistry<EditorApp>;
  readonly decorators: TreeDecoratorRegistry;
}

/**
 * 建一套空的服务容器（三个注册表都是空的）。
 *
 * 装配处先用它建容器，再把内置实现与插件逐个注册进来。
 */
export function createEmptyServices(): EditorServices {
  return {
    shapes: new ShapeRegistryClass(),
    attributes: new AttributeHandlerRegistry(),
    decorators: new TreeDecoratorRegistryClass(),
  };
}

export interface DefaultCompositionOptions {
  readonly shapes?: ShapeRegistry;
  readonly files?: FileGateway;
}

/**
 * 注册内置能力：六种图形 + Phase 1 的 17 条内置命令。
 *
 * 单独的 `--config` 装配路径也复用这个函数，保证"内置能力"永远存在，
 * 插件只是在内置之上**追加**。
 */
export function createServicesWithBuiltins(): EditorServices {
  const services = createEmptyServices();
  for (const provider of builtinShapeProviders()) {
    services.shapes.register(provider);
  }
  return services;
}

/**
 * **默认装配**：内置图形 + 内置命令，不加载任何插件。
 *
 * 这条路径必须始终可用——「禁用任何插件框架仍能启动」的兜底就是它。
 */
export function createDefaultComposition(options: DefaultCompositionOptions = {}): Composition {
  const services = createServicesWithBuiltins();
  const app = new EditorAppClass(services, options.files ?? new FileGateway());
  const commands = new CommandRegistryClass<EditorApp>();
  registerBuiltinCommands(commands, {
    shapes: services.shapes,
    decorators: services.decorators as TreeDecoratorRegistryType,
  });
  return { services, app, commands, decorators: services.decorators };
}
