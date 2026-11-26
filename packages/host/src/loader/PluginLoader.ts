import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { EditorApp, PluginTargets, SvgFramePlugin } from '@svgframe/kernel';
import { activatePlugin } from './activatePlugin.js';

/** `plugins.config.json` 里的一项。 */
export interface PluginConfigEntry {
  readonly module: string;
  readonly enabled?: boolean;
  readonly options?: Readonly<Record<string, unknown>>;
}

export interface PluginConfig {
  readonly plugins: readonly PluginConfigEntry[];
}

export interface LoadReport {
  /** 已加载成功的插件名（按加载顺序） */
  readonly loaded: readonly string[];
  /** 以 `error: ` 开头的行 */
  readonly errors: readonly string[];
}

/**
 * 插件加载器（配置装配的入口）。
 *
 * 关键约束（phase_cli_2.md §6）：
 * - **不硬编码任何具体插件**：模块名是配置里的字符串，加载器只做 `import()`，
 *   既不列插件清单，也没有"名字 → 包"的映射表；
 * - 四条失败路径各自一条固定文案，失败后**继续加载后面的插件**，主程序不退出；
 * - 清单校验、重复注册、激活失败都由 `activatePlugin` 统一处理并回滚；
 * - 配置语法/结构不合法 → `error: invalid plugin config`，以默认内置能力启动。
 */
export class PluginLoader {
  private readonly targets: PluginTargets<EditorApp>;

  constructor(targets: PluginTargets<EditorApp>) {
    this.targets = targets;
  }

  /** 读取并加载配置文件。配置文件本身坏掉时只报一条错并返回。 */
  async loadFromFile(configPath: string): Promise<LoadReport> {
    let config: PluginConfig;
    let baseDir: string;
    try {
      const raw = readFileSync(configPath, 'utf8');
      config = validateConfig(JSON.parse(raw));
      baseDir = dirname(resolve(configPath));
    } catch {
      return { loaded: [], errors: ['error: invalid plugin config'] };
    }
    return this.load(config, baseDir);
  }

  /** 按数组顺序加载；返回加载结果与错误行。 */
  async load(config: PluginConfig, baseDir: string): Promise<LoadReport> {
    const loaded: string[] = [];
    const errors: string[] = [];

    for (const entry of config.plugins) {
      if (entry.enabled === false) {
        continue;
      }
      const specifier = resolveSpecifier(entry.module, baseDir);

      let module: Record<string, unknown>;
      try {
        module = (await import(specifier)) as Record<string, unknown>;
      } catch (error) {
        if (isModuleNotFound(error)) {
          errors.push(`error: plugin not found: ${entry.module}`);
        } else {
          // 模块找到了但求值失败（依赖缺失、语法错误等）——属于插件加载失败
          errors.push(
            `error: plugin failed to activate: ${entry.module} (${reasonOf(error)})`,
          );
        }
        continue;
      }

      const candidate = module.default;
      if (candidate === undefined) {
        errors.push(`error: plugin has no default export: ${entry.module}`);
        continue;
      }
      const plugin = candidate as SvgFramePlugin<EditorApp>;
      if (typeof plugin.activate !== 'function' || typeof plugin.name !== 'string') {
        errors.push(
          `error: plugin failed to activate: ${entry.module} (not a plugin: missing name or activate)`,
        );
        continue;
      }

      const outcome = activatePlugin(plugin, this.targets, entry.options ?? {});
      if (outcome.ok) {
        loaded.push(plugin.name);
      } else {
        errors.push(outcome.error);
      }
    }

    return { loaded, errors };
  }
}

/** 相对路径以配置文件所在目录为基准；包名按运行环境的解析规则原样 import。 */
function resolveSpecifier(module: string, baseDir: string): string {
  if (module.startsWith('./') || module.startsWith('../')) {
    const absolute = isAbsolute(module) ? module : resolve(baseDir, module);
    return pathToFileURL(absolute).href;
  }
  return module;
}

function isModuleNotFound(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === 'ERR_MODULE_NOT_FOUND' || code === 'MODULE_NOT_FOUND';
}

function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function validateConfig(parsed: unknown): PluginConfig {
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('invalid config');
  }
  const plugins = (parsed as { plugins?: unknown }).plugins;
  if (!Array.isArray(plugins)) {
    throw new Error('invalid config');
  }
  for (const entry of plugins) {
    if (typeof entry !== 'object' || entry === null) {
      throw new Error('invalid entry');
    }
    const record = entry as Record<string, unknown>;
    if (typeof record.module !== 'string' || record.module === '') {
      throw new Error('invalid module');
    }
    if (record.enabled !== undefined && typeof record.enabled !== 'boolean') {
      throw new Error('invalid enabled');
    }
    if (record.options !== undefined && (typeof record.options !== 'object' || record.options === null)) {
      throw new Error('invalid options');
    }
  }
  return { plugins: plugins as PluginConfigEntry[] };
}
