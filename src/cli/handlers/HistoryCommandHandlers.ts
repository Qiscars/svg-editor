import type { EditorApp } from '../../app/EditorApp.js';
import type { CommandSpec } from '../../registry/CommandRegistry.js';

/** 撤销与重做。历史栈的规则在 `CommandHistory` 里，这里只是入口。 */
export function historyCommandHandlers(): CommandSpec<EditorApp>[] {
  return [
    {
      name: 'undo',
      usage: 'undo',
      summary: '撤销上一次编辑命令',
      minArgs: 0,
      maxArgs: 0,
      run: (app) => [app.undo()],
    },
    {
      name: 'redo',
      usage: 'redo',
      summary: '重做；undo 之后若有新编辑则重做栈已清空',
      minArgs: 0,
      maxArgs: 0,
      run: (app) => [app.redo()],
    },
  ];
}
