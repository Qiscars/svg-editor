import type { CommandRegistry, EditorApp, EditorServices } from '@svgframe/kernel';
import {
  AttributeHandlerRegistry,
  builtinShapeProviders,
  CommandRegistry as CommandRegistryClass,
  EditorApp as EditorAppClass,
  FileGateway,
  ShapeRegistry,
  TreeDecoratorRegistry,
} from '@svgframe/kernel';
import { registerBuiltinCommands } from '@svgframe/host';

/**
 * 测试用的最小装配。
 *
 * 与宿主的默认装配走同一条路径：建三个空注册表 → 注册六种内置图形 →
 * 建 `EditorApp` → 注册 17 条内置命令。插件测试需要什么就自己再往上注册，
 * 不共享任何全局状态，因此每个用例互不干扰。
 */
export function createTestServices(): EditorServices {
  const shapes = new ShapeRegistry();
  for (const provider of builtinShapeProviders()) {
    shapes.register(provider);
  }
  return {
    shapes,
    attributes: new AttributeHandlerRegistry(),
    decorators: new TreeDecoratorRegistry(),
  };
}

export interface TestComposition {
  readonly services: EditorServices;
  readonly app: EditorApp;
  readonly commands: CommandRegistry<EditorApp>;
}

export function createTestComposition(files: FileGateway = new FileGateway()): TestComposition {
  const services = createTestServices();
  const app = new EditorAppClass(services, files);
  const commands = new CommandRegistryClass<EditorApp>();
  registerBuiltinCommands(commands, { shapes: services.shapes, decorators: services.decorators });
  return { services, app, commands };
}

/** 只要一个可用的 `EditorApp` 时的便捷入口。 */
export function createTestApp(files: FileGateway = new FileGateway()): EditorApp {
  return createTestComposition(files).app;
}
