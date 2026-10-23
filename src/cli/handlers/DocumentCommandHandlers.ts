import type { EditorApp } from '../../app/EditorApp.js';
import { CliError } from '../CliError.js';
import type { CommandSpec } from '../../registry/CommandRegistry.js';
import { Arguments } from './Arguments.js';

const CANVAS_USAGE = 'canvas [w] [h]';

/** 文档类命令：都不进 undo 栈，执行后会关上 undo/redo 的闸门。 */
export function documentCommandHandlers(): CommandSpec<EditorApp>[] {
  return [
    {
      name: 'init',
      usage: 'init [w] [h]',
      summary: '新建空画布（默认 800x600），作为当前文档',
      minArgs: 0,
      maxArgs: 2,
      run: (app, args) =>
        app.init(Arguments.optionalNumber(args, 0, 'w'), Arguments.optionalNumber(args, 1, 'h')),
    },
    {
      name: 'read',
      usage: 'read <file.svg>',
      summary: '读入 SVG 文件为当前文档，缺 id 自动补名并警告',
      minArgs: 1,
      maxArgs: 1,
      run: (app, args) => app.read(Arguments.required(args, 0)),
    },
    {
      name: 'save',
      usage: 'save [file.svg]',
      summary: '保存当前文档；无参数时写回读入时的路径',
      minArgs: 0,
      maxArgs: 1,
      run: (app, args) => app.save(args[0]),
    },
    {
      name: 'canvas',
      usage: CANVAS_USAGE,
      summary: '无参数显示画布尺寸，带参数修改尺寸',
      minArgs: 0,
      maxArgs: 2,
      run: (app, args) => {
        // 只给一个参数无法确定另一个维度，按用法错误处理而不是猜默认值
        if (args.length === 1) {
          throw CliError.usage(CANVAS_USAGE);
        }
        return app.canvas(
          Arguments.optionalNumber(args, 0, 'w'),
          Arguments.optionalNumber(args, 1, 'h'),
        );
      },
    },
  ];
}
