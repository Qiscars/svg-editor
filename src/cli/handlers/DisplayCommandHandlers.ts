import type { EditorApp } from '../../app/EditorApp.js';
import type { CommandRegistry, CommandSpec } from '../../registry/CommandRegistry.js';
import type { ShowRenderer } from '../render/ShowRenderer.js';
import type { TreeRenderer } from '../render/TreeRenderer.js';

/**
 * 显示类命令。它们不进入 undo 栈，也不改任何状态。
 *
 * `help` 需要读注册表本身（用法与说明都在那里），所以这里接收一个已注册好的
 * 注册表——这也是**待重构项 R3 被真正消除**的地方：帮助文本不再是一份
 * 需要手工同步的静态常量，而是由各命令自己的声明汇总出来。
 */
export function displayCommandHandlers(
  registry: CommandRegistry<EditorApp>,
  treeRenderer: TreeRenderer,
  showRenderer: ShowRenderer,
): CommandSpec<EditorApp>[] {
  return [
    {
      name: 'tree',
      usage: 'tree [id]',
      summary: '显示结构树（默认整份文档，带 id 时只显示该子树）',
      minArgs: 0,
      maxArgs: 1,
      run: (app, args) => treeRenderer.render(app.document, args[0]),
    },
    {
      name: 'show',
      usage: 'show <id>',
      summary: '显示单个图形的属性明细',
      minArgs: 1,
      maxArgs: 1,
      run: (app, args) => {
        const id = args[0];
        if (id === undefined) {
          throw new Error('internal: argument 0 missing after arity check');
        }
        return showRenderer.render(app.document.require(id));
      },
    },
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
