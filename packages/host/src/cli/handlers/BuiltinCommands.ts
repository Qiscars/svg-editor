import type { CommandRegistry, CommandSpec, EditorApp, ShapeRegistry, TreeDecoratorRegistry } from '@svgframe/kernel';
import { ShowRenderer } from '../render/ShowRenderer.js';
import { TreeRenderer } from '../render/TreeRenderer.js';
import { displayCommandHandlers } from './DisplayCommandHandlers.js';
import { documentCommandHandlers } from './DocumentCommandHandlers.js';
import { editCommandHandlers } from './EditCommandHandlers.js';
import { historyCommandHandlers } from './HistoryCommandHandlers.js';

export interface BuiltinCommandOptions {
  readonly shapes: ShapeRegistry;
  readonly decorators: TreeDecoratorRegistry;
}

/**
 * 内置命令（Phase 1 的 17 条：文档 / 编辑 / 显示 / 历史）。
 *
 * 它们通过**与插件完全相同的注册接口**装进注册表——宿主不区分"内置"与"插件"，
 * 内核更不知道谁是谁。`stats`、`dir` 这类命令插件不过是走了另一条 import 路径的
 * 同一种 `CommandSpec`。
 *
 * 注册顺序即 `help` 的输出顺序：文档类 → 编辑类 → 历史类 → 显示类，
 * 与作业 §3 的命令总表一致。`help` 依赖注册表本身，所以最后注册。
 */
export function registerBuiltinCommands(
  registry: CommandRegistry<EditorApp>,
  options: BuiltinCommandOptions,
): void {
  const specs: CommandSpec<EditorApp>[] = [
    ...documentCommandHandlers(),
    ...editCommandHandlers(options.shapes),
    ...historyCommandHandlers(),
  ];
  for (const spec of specs) {
    registry.register(spec);
  }
  for (const spec of displayCommandHandlers(
    registry,
    new TreeRenderer(options.decorators),
    new ShowRenderer(),
  )) {
    registry.register(spec);
  }
}
