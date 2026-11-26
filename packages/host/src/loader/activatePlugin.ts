import type { EditorApp, PluginCategory, PluginManifest, PluginTargets, SvgFramePlugin } from '@svgframe/kernel';
import { PluginContextImpl, RegistryError } from '@svgframe/kernel';

const CATEGORIES: readonly PluginCategory[] = ['shapes', 'commands', 'decorators', 'attributes'];

export type ActivationOutcome = { readonly ok: true } | { readonly ok: false; readonly error: string };

/**
 * **唯一的插件激活与校验路径**。
 *
 * 代码装配（方式 A）与配置装配（方式 B）都调用它，因此两边的
 * 清单校验、重复注册处理、失败回滚**完全一致**——这正是
 * phase_cli_2.md §6「两种方式必须经过同一注册与校验路径」的落点。
 *
 * 失败时一定会 `rollback()`：不留半个插件的注册。
 */
export function activatePlugin(
  plugin: SvgFramePlugin<EditorApp>,
  targets: PluginTargets<EditorApp>,
  options: Readonly<Record<string, unknown>> = {},
): ActivationOutcome {
  const context = new PluginContextImpl<EditorApp>(targets, options);

  try {
    plugin.activate(context);
  } catch (error) {
    context.rollback();
    // 注册名冲突有自己的一行文案（作业 §6 的格式表），不包裹成"激活失败"
    if (error instanceof RegistryError && error.message.startsWith('duplicate registration:')) {
      return { ok: false, error: `error: ${error.message}` };
    }
    return {
      ok: false,
      error: `error: plugin failed to activate: ${plugin.name} (${reasonOf(error)})`,
    };
  }

  const mismatch = compareManifest(plugin.name, plugin.contributes ?? {}, context.registeredByCategory());
  if (mismatch !== undefined) {
    context.rollback();
    return { ok: false, error: mismatch };
  }
  return { ok: true };
}

/**
 * 逐类比较声明与实际注册。
 *
 * 比较的是**名称集合**（顺序不敏感）：插件在 `activate` 里的注册顺序
 * 不应成为清单的一部分，否则清单会变成实现细节的镜像。
 */
function compareManifest(
  name: string,
  declared: PluginManifest,
  registered: Record<PluginCategory, string[]>,
): string | undefined {
  for (const category of CATEGORIES) {
    const expected = [...(declared[category] ?? [])].sort().join(',');
    const actual = [...registered[category]].sort().join(',');
    if (expected !== actual) {
      return `error: plugin manifest mismatch: ${name} (declared: ${describe(declared)}, registered: ${describeRegistered(registered)})`;
    }
  }
  return undefined;
}

function describe(manifest: PluginManifest): string {
  return CATEGORIES.map((category) => `${category}:[${[...(manifest[category] ?? [])].sort().join(' ')}]`).join(' ');
}

function describeRegistered(registered: Record<PluginCategory, string[]>): string {
  return CATEGORIES.map((category) => `${category}:[${[...registered[category]].sort().join(' ')}]`).join(' ');
}

function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
