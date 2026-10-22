import type { EditorApp } from '../../app/EditorApp.js';
import type { CommandRegistry, CommandSpec } from '../../registry/CommandRegistry.js';

/**
 * 显示类命令。它们不进入 undo 栈，也不改任何状态。
 *
 * `help` 需要读注册表本身（用法与说明都在那里），所以这里接收一个已注册好的
 * 注册表——这也是**待重构项 R3 被真正消除**的地方：帮助文本不再是一份
 * 需要手工同步的静态常量，而是由各命令自己的声明汇总出来。
 */
export function displayCommandHandlers(
  registry: CommandRegistry<EditorApp>,
): CommandSpec<EditorApp>[] {
  return [
    {
      name: 'help',
      usage: 'help',
      summary: '显示全部命令与语法',
      minArgs: 0,
      maxArgs: 0,
      run: () => ['Commands:', ...registry.helpLines()],
    },
  ];
}
