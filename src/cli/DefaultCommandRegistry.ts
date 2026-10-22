import type { EditorApp } from '../app/EditorApp.js';
import { ShowRenderer } from './render/ShowRenderer.js';
import { TreeRenderer } from './render/TreeRenderer.js';
import { CommandRegistry } from '../registry/CommandRegistry.js';
import { ShapeFactory } from '../registry/ShapeFactory.js';
import { displayCommandHandlers } from './handlers/DisplayCommandHandlers.js';
import { documentCommandHandlers } from './handlers/DocumentCommandHandlers.js';
import { editCommandHandlers } from './handlers/EditCommandHandlers.js';
import { historyCommandHandlers } from './handlers/HistoryCommandHandlers.js';

/**
 * 组装完整的命令表——**这是全项目唯一知道"一共有哪些命令"的地方**。
 *
 * 注册顺序即 `help` 的输出顺序：文档类 → 编辑类 → 显示类 → 历史类，
 * 与作业 §3 的命令总表一致。
 */
export function createDefaultCommandRegistry(
  factory: ShapeFactory = ShapeFactory.createDefault(),
): CommandRegistry<EditorApp> {
  const registry = new CommandRegistry<EditorApp>();
  const specs = [
    ...documentCommandHandlers(),
    ...editCommandHandlers(factory),
    ...historyCommandHandlers(),
  ];
  for (const spec of specs) {
    registry.register(spec);
  }
  // help 需要注册表本身，必须等其他命令注册完再注册它
  for (const spec of displayCommandHandlers(registry, new TreeRenderer(), new ShowRenderer())) {
    registry.register(spec);
  }
  return registry;
}
