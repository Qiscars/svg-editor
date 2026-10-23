import type { EditorApp } from '../../app/EditorApp.js';
import type { CommandSpec } from '../../registry/CommandRegistry.js';
import type { ShapeFactory } from '../../registry/ShapeFactory.js';
import { CliError } from '../CliError.js';
import { Arguments } from './Arguments.js';

const CREATE_USAGE = 'create <type> <id> [params...] [in <containerId>]';

/**
 * 编辑命令的参数翻译层。
 *
 * 这里**不做业务**，也不构造命令对象——只把命令行文本切成
 * 「图形类型 / id / 几何参数 / 可选样式 / 父容器」，然后调 `EditorApp` 上对应的
 * 方法。命令类由应用层实例化，所以本文件不 import `commands/*`，
 * 依赖方向（doc/README.md §1.3）才守得住。
 *
 * `factory` 只用来查"这个类型的几何参数有几个"，以便切分位置参数、
 * 并在参数个数不对时报用法。
 */
export function editCommandHandlers(factory: ShapeFactory): CommandSpec<EditorApp>[] {
  return [
    {
      name: 'create',
      usage: CREATE_USAGE,
      summary: '创建图形；in 子句直接指定父容器，省略时挂在画布根',
      minArgs: 2,
      maxArgs: Number.MAX_SAFE_INTEGER,
      run: (app, args) => {
        const type = Arguments.required(args, 0);
        const id = Arguments.required(args, 1);

        let rest = args.slice(2);
        let parentId: string | null = null;
        // 用**最后一个** in 定位子句，带引号的文本内容里出现 "in" 不会被误判
        const inIndex = rest.lastIndexOf('in');
        if (inIndex !== -1) {
          const containerId = rest[inIndex + 1];
          if (containerId === undefined) {
            throw CliError.usage(CREATE_USAGE);
          }
          parentId = containerId;
          rest = rest.slice(0, inIndex);
        }

        const definition = factory.require(type);
        const geometryCount = definition.parameters.length;
        const allowedExtras = definition.optionalStyle === undefined ? 0 : 1;
        if (rest.length < geometryCount || rest.length > geometryCount + allowedExtras) {
          throw CliError.usage(CREATE_USAGE);
        }

        return [
          app.createShape(type, id, rest.slice(0, geometryCount), rest[geometryCount], parentId),
        ];
      },
    },
    {
      name: 'delete',
      usage: 'delete <id>',
      summary: '删除图形（容器则连同全部子孙）',
      minArgs: 1,
      maxArgs: 1,
      run: (app, args) => [app.deleteShape(Arguments.required(args, 0))],
    },
    {
      name: 'move',
      usage: 'move <id> <dx> <dy>',
      summary: '平移；作用于容器时整体平移',
      minArgs: 3,
      maxArgs: 3,
      run: (app, args) => [
        app.moveShape(
          Arguments.required(args, 0),
          Arguments.number(args, 1, 'dx'),
          Arguments.number(args, 2, 'dy'),
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
        app.scaleShape(Arguments.required(args, 0), Arguments.number(args, 1, 'factor')),
      ],
    },
    {
      name: 'set',
      usage: 'set <id> <attr> <value>',
      summary: '设置属性（白名单见作业 §4.1）',
      minArgs: 3,
      maxArgs: 3,
      run: (app, args) => [
        app.setAttribute(
          Arguments.required(args, 0),
          Arguments.required(args, 1),
          Arguments.required(args, 2),
        ),
      ],
    },
    {
      name: 'group',
      usage: 'group <newGid> <id1> <id2>...',
      summary: '新建容器并收入若干图形',
      minArgs: 2,
      maxArgs: Number.MAX_SAFE_INTEGER,
      run: (app, args) => [app.groupShapes(Arguments.required(args, 0), args.slice(1))],
    },
    {
      name: 'ungroup',
      usage: 'ungroup <gid>',
      summary: '解散容器，子图形提升到原父级',
      minArgs: 1,
      maxArgs: 1,
      run: (app, args) => [app.ungroupShape(Arguments.required(args, 0))],
    },
    {
      name: 'addto',
      usage: 'addto <gid> <id>',
      summary: '把已有图形移入容器（作为最后一个子节点）',
      minArgs: 2,
      maxArgs: 2,
      run: (app, args) => [
        app.addToGroup(Arguments.required(args, 0), Arguments.required(args, 1)),
      ],
    },
    {
      name: 'front',
      usage: 'front <id>',
      summary: '调到同级最前',
      minArgs: 1,
      maxArgs: 1,
      run: (app, args) => [app.reorderShape(Arguments.required(args, 0), 'front')],
    },
    {
      name: 'back',
      usage: 'back <id>',
      summary: '调到同级最后',
      minArgs: 1,
      maxArgs: 1,
      run: (app, args) => [app.reorderShape(Arguments.required(args, 0), 'back')],
    },
  ];
}
