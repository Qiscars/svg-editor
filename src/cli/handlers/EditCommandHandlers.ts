import type { EditorApp } from '../../app/EditorApp.js';
import { CommandError } from '../../commands/CommandError.js';
import { AddToCommand } from '../../commands/impl/AddToCommand.js';
import { CreateShapeCommand } from '../../commands/impl/CreateShapeCommand.js';
import { DeleteShapeCommand } from '../../commands/impl/DeleteShapeCommand.js';
import { GroupCommand } from '../../commands/impl/GroupCommand.js';
import { MoveShapeCommand } from '../../commands/impl/MoveShapeCommand.js';
import { ReorderCommand } from '../../commands/impl/ReorderCommand.js';
import { ScaleShapeCommand } from '../../commands/impl/ScaleShapeCommand.js';
import { SetAttributeCommand } from '../../commands/impl/SetAttributeCommand.js';
import { UngroupCommand } from '../../commands/impl/UngroupCommand.js';
import type { CommandSpec } from '../../registry/CommandRegistry.js';
import type { ShapeFactory } from '../../registry/ShapeFactory.js';
import { Arguments } from './Arguments.js';

const CREATE_USAGE = 'create <type> <id> [params...] [in <containerId>]';

/**
 * 编辑命令：一律经 `app.run` 走命令层，表现层**不直接改图形树**。
 * 这里只做"命令行参数 → 命令对象"的翻译。
 */
export function editCommandHandlers(factory: ShapeFactory): CommandSpec<EditorApp>[] {
  return [
    {
      name: 'create',
      usage: CREATE_USAGE,
      summary: '创建图形；in 子句直接指定父容器，省略时挂在画布根',
      minArgs: 2,
      maxArgs: Number.MAX_SAFE_INTEGER,
      run: (app, args) => [app.run(buildCreateCommand(app, factory, args))],
    },
    {
      name: 'delete',
      usage: 'delete <id>',
      summary: '删除图形（容器则连同全部子孙）',
      minArgs: 1,
      maxArgs: 1,
      run: (app, args) => [app.run(new DeleteShapeCommand(app.context, Arguments.required(args, 0)))],
    },
    {
      name: 'move',
      usage: 'move <id> <dx> <dy>',
      summary: '平移；作用于容器时整体平移',
      minArgs: 3,
      maxArgs: 3,
      run: (app, args) => [
        app.run(
          new MoveShapeCommand(
            app.context,
            Arguments.required(args, 0),
            Arguments.number(args, 1, 'dx'),
            Arguments.number(args, 2, 'dy'),
          ),
        ),
      ],
    },
    {
      name: 'scale',
      usage: 'scale <id> <factor>',
      summary: '等比缩放：factor 同乘到全部几何属性',
      minArgs: 2,
      maxArgs: 2,
      run: (app, args) => [
        app.run(
          new ScaleShapeCommand(
            app.context,
            Arguments.required(args, 0),
            Arguments.number(args, 1, 'factor'),
          ),
        ),
      ],
    },
    {
      name: 'set',
      usage: 'set <id> <attr> <value>',
      summary: '设置属性（白名单见作业 §4.1）',
      minArgs: 3,
      maxArgs: 3,
      run: (app, args) => [
        app.run(
          new SetAttributeCommand(
            app.context,
            Arguments.required(args, 0),
            Arguments.required(args, 1),
            Arguments.required(args, 2),
          ),
        ),
      ],
    },
    {
      name: 'group',
      usage: 'group <newGid> <id1> <id2>...',
      summary: '新建容器并收入若干图形',
      minArgs: 2,
      maxArgs: Number.MAX_SAFE_INTEGER,
      run: (app, args) => [
        app.run(new GroupCommand(app.context, Arguments.required(args, 0), args.slice(1))),
      ],
    },
    {
      name: 'ungroup',
      usage: 'ungroup <gid>',
      summary: '解散容器，子图形提升到原父级',
      minArgs: 1,
      maxArgs: 1,
      run: (app, args) => [app.run(new UngroupCommand(app.context, Arguments.required(args, 0)))],
    },
    {
      name: 'addto',
      usage: 'addto <gid> <id>',
      summary: '把已有图形移入容器（作为最后一个子节点）',
      minArgs: 2,
      maxArgs: 2,
      run: (app, args) => [
        app.run(
          new AddToCommand(app.context, Arguments.required(args, 0), Arguments.required(args, 1)),
        ),
      ],
    },
    {
      name: 'front',
      usage: 'front <id>',
      summary: '调到同级最前',
      minArgs: 1,
      maxArgs: 1,
      run: (app, args) => [
        app.run(new ReorderCommand(app.context, Arguments.required(args, 0), 'front')),
      ],
    },
    {
      name: 'back',
      usage: 'back <id>',
      summary: '调到同级最后',
      minArgs: 1,
      maxArgs: 1,
      run: (app, args) => [
        app.run(new ReorderCommand(app.context, Arguments.required(args, 0), 'back')),
      ],
    },
  ];
}

/**
 * `create` 的参数最多，单独拆出来：
 * `create <type> <id> [几何参数…] [样式值] [in <containerId>]`。
 *
 * `in` 用**最后一个** `in` 标记定位，这样文本内容里出现 "in" 不会被误判成子句
 * （分词阶段已经把带引号的内容合成一个 token 了）。
 */
function buildCreateCommand(app: EditorApp, factory: ShapeFactory, args: readonly string[]): CreateShapeCommand {
  const type = Arguments.required(args, 0);
  const id = Arguments.required(args, 1);

  let rest = args.slice(2);
  let parentId: string | null = null;
  const inIndex = rest.lastIndexOf('in');
  if (inIndex !== -1) {
    const containerId = rest[inIndex + 1];
    if (containerId === undefined) {
      throw CommandError.usage(CREATE_USAGE);
    }
    parentId = containerId;
    rest = rest.slice(0, inIndex);
  }

  const definition = factory.require(type);
  const geometryCount = definition.parameters.length;
  const allowedExtras = definition.optionalStyle === undefined ? 0 : 1;
  if (rest.length < geometryCount || rest.length > geometryCount + allowedExtras) {
    throw CommandError.usage(CREATE_USAGE);
  }

  const values = rest.slice(0, geometryCount);
  const styleValue = rest[geometryCount];
  const shape = factory.create(type, id, values);
  if (styleValue !== undefined && definition.optionalStyle !== undefined) {
    shape.setAttribute(definition.optionalStyle, styleValue);
  }
  return new CreateShapeCommand(app.context, shape, parentId);
}
