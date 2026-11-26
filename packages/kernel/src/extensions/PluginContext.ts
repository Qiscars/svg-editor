import type { ShapeProvider } from './ShapeProvider.js';
import type { AttributeHandler } from './AttributeHandler.js';
import type { CommandSpec } from './CommandRegistry.js';
import type { ShapeRegistry } from './ShapeRegistry.js';
import type { AttributeHandlerRegistry } from './AttributeHandlerRegistry.js';
import type { CommandRegistry } from './CommandRegistry.js';
import type { TreeDecorator } from './TreeDecorator.js';
import type { TreeDecoratorRegistry } from './TreeDecoratorRegistry.js';

export type PluginCategory = 'shapes' | 'commands' | 'decorators' | 'attributes';

/** 插件在 `package.json` 的 `contributes` 里声明自己提供哪些扩展。 */
export interface PluginManifest {
  readonly shapes?: readonly string[];
  readonly commands?: readonly string[];
  readonly decorators?: readonly string[];
  readonly attributes?: readonly string[];
}

/**
 * 插件的唯一入口。
 *
 * `TContext` 是宿主用来执行命令的东西（CLI 里就是 `EditorApp`）。
 * 做成泛型之后，`extensions` 层不必知道任何具体的宿主类型——
 * 它只依赖 `domain`，依赖方向因此是单向的。
 */
export interface SvgFramePlugin<TContext = unknown> {
  readonly name: string;
  readonly contributes?: PluginManifest;
  activate(context: PluginContext<TContext>): void;
}

/**
 * 插件能用的**注册面**：只有 `register`，没有查询、删除或枚举。
 *
 * 这样插件既拿不到别的插件的实现，也没有办法在激活之后偷偷改注册表。
 * 清单校验与回滚都建立在这个窄接口上。
 */
export interface ShapeRegistration {
  register(provider: ShapeProvider): void;
}
export interface CommandRegistration<TContext = unknown> {
  register(spec: CommandSpec<TContext>): void;
}
export interface DecoratorRegistration {
  register(decorator: TreeDecorator): void;
}
export interface AttributeRegistration {
  register(handler: AttributeHandler): void;
}

export interface PluginContext<TContext = unknown> {
  readonly shapes: ShapeRegistration;
  readonly commands: CommandRegistration<TContext>;
  readonly decorators: DecoratorRegistration;
  readonly attributes: AttributeRegistration;
  /** 配置里该插件条目的 `options`，插件自行解释 */
  readonly options: Readonly<Record<string, unknown>>;
}

interface RegistrationRecord {
  readonly category: PluginCategory;
  readonly name: string;
}

export interface PluginTargets<TContext> {
  readonly shapes: ShapeRegistry;
  readonly commands: CommandRegistry<TContext>;
  readonly decorators: TreeDecoratorRegistry;
  readonly attributes: AttributeHandlerRegistry;
}

/**
 * 一次插件激活的上下文实现。
 *
 * 它把"注册"包成"记录 + 委托"：每个 register 都同时登记到本次激活的流水里，
 * 于是加载器可以在激活结束后**比对清单**，并在任一步失败时**按逆序全部撤销**。
 */
export class PluginContextImpl<TContext = unknown> implements PluginContext<TContext> {
  private readonly log: RegistrationRecord[] = [];
  private readonly targets: PluginTargets<TContext>;

  readonly options: Readonly<Record<string, unknown>>;

  readonly shapes: ShapeRegistration;
  readonly commands: CommandRegistration<TContext>;
  readonly decorators: DecoratorRegistration;
  readonly attributes: AttributeRegistration;

  constructor(targets: PluginTargets<TContext>, options: Readonly<Record<string, unknown>> = {}) {
    this.targets = targets;
    this.options = options;

    this.shapes = {
      register: (provider) => {
        this.targets.shapes.register(provider);
        this.record('shapes', provider.kind);
      },
    };
    this.commands = {
      register: (spec) => {
        this.targets.commands.register(spec);
        this.record('commands', spec.name);
      },
    };
    this.decorators = {
      register: (decorator) => {
        this.targets.decorators.register(decorator);
        this.record('decorators', decorator.name);
      },
    };
    this.attributes = {
      register: (handler) => {
        this.targets.attributes.register(handler);
        this.record('attributes', handler.name);
      },
    };
  }

  /** 本次激活实际注册了哪些扩展（按注册顺序）。 */
  get registrations(): readonly RegistrationRecord[] {
    return [...this.log];
  }

  /** 按类别分组后的实际注册名，便于与 `contributes` 逐类比较。 */
  registeredByCategory(): Record<PluginCategory, string[]> {
    const grouped: Record<PluginCategory, string[]> = {
      shapes: [],
      commands: [],
      decorators: [],
      attributes: [],
    };
    for (const record of this.log) {
      grouped[record.category].push(record.name);
    }
    return grouped;
  }

  /**
   * 撤销本次激活的全部注册（逆序）。
   *
   * 加载器在三种情况下调用它：清单不一致、激活抛错、以及重复注册被拒。
   */
  rollback(): void {
    for (const record of [...this.log].reverse()) {
      switch (record.category) {
        case 'shapes':
          this.targets.shapes.unregister(record.name);
          break;
        case 'commands':
          this.targets.commands.unregister(record.name);
          break;
        case 'decorators':
          this.targets.decorators.unregister(record.name);
          break;
        case 'attributes':
          this.targets.attributes.unregister(record.name);
          break;
        default: {
          const exhaustive: never = record.category;
          throw new Error(`internal: unknown category ${String(exhaustive)}`);
        }
      }
    }
    this.log.length = 0;
  }

  private record(category: PluginCategory, name: string): void {
    this.log.push({ category, name });
  }
}
