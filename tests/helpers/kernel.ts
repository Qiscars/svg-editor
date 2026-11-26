import type { EditorApp, EditorServices, SvgFramePlugin } from '@svgframe/kernel';
import {
  AttributeHandlerRegistry,
  builtinShapeProviders,
  CommandRegistry as CommandRegistryClass,
  EditorApp as EditorAppClass,
  FileGateway,
  ShapeRegistry,
  TreeDecoratorRegistry,
} from '@svgframe/kernel';
import { activatePlugin, registerBuiltinCommands } from '@svgframe/host';

/**
 * 测试用的最小装配。
 *
 * 与宿主的默认装配走同一条路径：建三个空注册表 → 注册六种内置图形 →
 * 建 `EditorApp` → 注册 17 条内置命令。插件测试在此基础上按需追加，
 * 每个用例互不干扰（没有全局状态）。
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
  readonly commands: import('@svgframe/kernel').CommandRegistry<EditorApp>;
  readonly errors: readonly string[];
}

export interface TestCompositionOptions {
  readonly plugins?: readonly SvgFramePlugin<EditorApp>[];
  readonly files?: FileGateway;
}

export function createTestComposition(options: TestCompositionOptions = {}): TestComposition {
  const services = createTestServices();
  const app = new EditorAppClass(services, options.files ?? new FileGateway());
  const commands = new CommandRegistryClass<EditorApp>();
  registerBuiltinCommands(commands, { shapes: services.shapes, decorators: services.decorators });

  const targets = {
    shapes: services.shapes,
    commands,
    decorators: services.decorators,
    attributes: services.attributes,
  };

  const errors: string[] = [];
  for (const plugin of options.plugins ?? []) {
    const outcome = activatePlugin(plugin, targets);
    if (!outcome.ok) {
      errors.push(outcome.error);
    }
  }

  return { services, app, commands, errors };
}

/** 只要一个可用的 `EditorApp` 时的便捷入口。 */
export function createTestApp(files: FileGateway = new FileGateway()): EditorApp {
  return createTestComposition({ files }).app;
}
