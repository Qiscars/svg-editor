import { describe, expect, it } from 'vitest';

import { CommandContext } from '../../src/commands/CommandContext.js';
import { CommandHistory } from '../../src/commands/CommandHistory.js';
import { AddToCommand } from '../../src/commands/impl/AddToCommand.js';
import { CreateShapeCommand } from '../../src/commands/impl/CreateShapeCommand.js';
import { DeleteShapeCommand } from '../../src/commands/impl/DeleteShapeCommand.js';
import { GroupCommand } from '../../src/commands/impl/GroupCommand.js';
import { MoveShapeCommand } from '../../src/commands/impl/MoveShapeCommand.js';
import { ReorderCommand } from '../../src/commands/impl/ReorderCommand.js';
import { ScaleShapeCommand } from '../../src/commands/impl/ScaleShapeCommand.js';
import { SetAttributeCommand } from '../../src/commands/impl/SetAttributeCommand.js';
import { UngroupCommand } from '../../src/commands/impl/UngroupCommand.js';
import { Document } from '../../src/domain/Document.js';
import { Circle } from '../../src/domain/leaf/Circle.js';
import { Rect } from '../../src/domain/leaf/Rect.js';
import { TextShape } from '../../src/domain/leaf/TextShape.js';
import { snapshotDocument } from '../helpers/snapshot.js';

interface Fixture {
  readonly document: Document;
  readonly context: CommandContext;
  readonly history: CommandHistory;
}

/** 与作业 §6 相同的初始文档：bg / title / c1 / box 四个顶层元素。 */
function fixture(): Fixture {
  const document = new Document(800, 600);
  const bg = new Rect('bg', 0, 0, 800, 600);
  bg.setAttribute('fill', '#ffffff');
  const title = new TextShape('title', 20, 40, 'My Diagram');
  const c1 = new Circle('c1', 100, 100, 20);
  c1.setAttribute('fill', 'red');
  const box = new Rect('box', 200, 80, 60, 60);

  document.attach(document.canvas, bg);
  document.attach(document.canvas, title);
  document.attach(document.canvas, c1);
  document.attach(document.canvas, box);

  return { document, context: new CommandContext(document), history: new CommandHistory() };
}

/** 一条命令的完整往返：执行 → undo 回到原状 → redo 回到执行后。 */
function expectRoundTrip(
  setup: Fixture,
  makeCommand: (context: CommandContext) => { execute(): string; undo(): string },
): { executed: string; undone: string } {
  const { document, context, history } = setup;
  const before = snapshotDocument(document);

  const executed = history.run(makeCommand(context));
  const after = snapshotDocument(document);

  const undone = history.undo();
  expect(snapshotDocument(document)).toStrictEqual(before);

  history.redo();
  expect(snapshotDocument(document)).toStrictEqual(after);

  return { executed, undone };
}

describe('create', () => {
  it('在画布根创建，undo 后整棵树回到创建前', () => {
    const setup = fixture();
    const { executed, undone } = expectRoundTrip(setup, (context) =>
      new CreateShapeCommand(context, new Rect('n1', 10, 20, 100, 50), null),
    );
    expect(executed).toBe('rect#n1 created');
    expect(undone).toBe('rect#n1 removed');
    expect(setup.document.has('n1')).toBe(true);
  });

  it('用 in 子句创建到容器内，消息带 in g#…', () => {
    const setup = fixture();
    setup.history.run(new GroupCommand(setup.context, 'markers', ['c1', 'box']));

    const message = setup.history.run(
      new CreateShapeCommand(setup.context, new Rect('n1', 0, 0, 10, 10), 'markers'),
    );

    expect(message).toBe('rect#n1 created in g#markers');
    expect(setup.document.require('n1').parent?.id).toBe('markers');
  });

  it('in 目标不存在或不是容器时报错', () => {
    const setup = fixture();
    expect(
      () => new CreateShapeCommand(setup.context, new Rect('n1', 0, 0, 1, 1), 'node9'),
    ).toThrowError('no such container: node9');
    expect(
      () => new CreateShapeCommand(setup.context, new Rect('n1', 0, 0, 1, 1), 'c1'),
    ).toThrowError('not a container: c1');
  });

  it('id 已存在时在构造阶段就报错', () => {
    const setup = fixture();
    expect(
      () => new CreateShapeCommand(setup.context, new Rect('bg', 0, 0, 1, 1), null),
    ).toThrowError('id already exists: bg');
  });
});

describe('delete', () => {
  it('删除叶子，undo 后回到原位置', () => {
    const setup = fixture();
    const { executed, undone } = expectRoundTrip(setup, (context) =>
      new DeleteShapeCommand(context, 'c1'),
    );
    expect(executed).toBe('circle#c1 deleted');
    expect(undone).toBe('circle#c1 restored');
  });

  it('删除容器的同时删掉整棵子树，undo 时 id 全部回来', () => {
    const setup = fixture();
    setup.history.run(new GroupCommand(setup.context, 'markers', ['c1', 'box']));

    setup.history.run(new DeleteShapeCommand(setup.context, 'markers'));
    expect(setup.document.has('markers')).toBe(false);
    expect(setup.document.has('c1')).toBe(false);
    expect(setup.document.has('box')).toBe(false);

    setup.history.undo();
    expect(setup.document.has('c1')).toBe(true);
    expect(setup.document.require('c1').parent?.id).toBe('markers');
  });

  it('从容器里删一个子节点，undo 消息写明恢复到哪个容器', () => {
    const setup = fixture();
    setup.history.run(new GroupCommand(setup.context, 'markers', ['c1', 'box']));

    setup.history.run(new DeleteShapeCommand(setup.context, 'box'));
    expect(setup.history.undo()).toBe('rect#box restored into g#markers');
  });
});

describe('move', () => {
  it('叶子报绝对位置，undo 精确回到原坐标', () => {
    const setup = fixture();
    const { executed, undone } = expectRoundTrip(setup, (context) =>
      new MoveShapeCommand(context, 'c1', 30, 0),
    );
    expect(executed).toBe('circle#c1 moved to (130,100)');
    expect(undone).toBe('circle#c1 moved back to (100,100)');
  });

  it('容器报位移，子孙整体跟随', () => {
    const setup = fixture();
    setup.history.run(new GroupCommand(setup.context, 'markers', ['c1', 'box']));

    const message = setup.history.run(new MoveShapeCommand(setup.context, 'markers', 0, 100));
    expect(message).toBe('g#markers moved by (0,100)');
    expect(setup.document.require('c1').describeInline()).toBe('cx=100 cy=200 r=20 fill=red');
  });

  it('小数位移撤销后也能精确还原（快照写回，不靠反向加减）', () => {
    const setup = fixture();
    setup.history.run(new MoveShapeCommand(setup.context, 'c1', 0.1, 0.2));
    const afterMove = setup.document.require('c1').getAttribute('cx');
    setup.history.undo();
    expect(setup.document.require('c1').getAttribute('cx')).toBe('100');
    expect(afterMove).toBe('100.1');
  });
});

describe('scale', () => {
  it('缩放叶子，undo 精确还原', () => {
    const setup = fixture();
    const { executed, undone } = expectRoundTrip(setup, (context) =>
      new ScaleShapeCommand(context, 'c1', 2),
    );
    expect(executed).toBe('circle#c1 scaled by 2');
    expect(undone).toBe('circle#c1 scaled back by 0.5');
  });

  it('缩放容器时递归到子孙，undo 一次全部还原', () => {
    const setup = fixture();
    setup.history.run(new GroupCommand(setup.context, 'markers', ['c1', 'box']));

    setup.history.run(new ScaleShapeCommand(setup.context, 'markers', 2));
    expect(setup.document.require('c1').describeInline()).toBe('cx=200 cy=200 r=40 fill=red');

    setup.history.undo();
    expect(setup.document.require('c1').describeInline()).toBe('cx=100 cy=100 r=20 fill=red');
  });

  it('非正数因子被拒绝，且不改状态', () => {
    const setup = fixture();
    expect(() => new ScaleShapeCommand(setup.context, 'c1', 0)).toThrowError(
      'scale factor must be positive',
    );
    expect(() => new ScaleShapeCommand(setup.context, 'c1', -2)).toThrowError(
      'scale factor must be positive',
    );
  });

  it('scale(3) 撤销后回到精确原值，而不是 99.99999', () => {
    const setup = fixture();
    setup.history.run(new ScaleShapeCommand(setup.context, 'c1', 3));
    setup.history.undo();
    expect(setup.document.require('c1').describeInline()).toBe('cx=100 cy=100 r=20 fill=red');
  });
});

describe('set', () => {
  it('改文本内容，undo 恢复原文（消息与作业 §6 一致）', () => {
    const setup = fixture();
    const { executed, undone } = expectRoundTrip(setup, (context) =>
      new SetAttributeCommand(context, 'title', 'text', 'My Diagram v2'),
    );
    expect(executed).toBe('text#title updated: text="My Diagram v2"');
    expect(undone).toBe('text#title updated: text="My Diagram"');
  });

  it('原本没有的属性，undo 后真的不在了', () => {
    const setup = fixture();
    expect(setup.document.require('bg').getAttribute('stroke')).toBeUndefined();

    setup.history.run(new SetAttributeCommand(setup.context, 'bg', 'stroke', 'black'));
    expect(setup.document.require('bg').getAttribute('stroke')).toBe('black');

    expect(setup.history.undo()).toBe('rect#bg stroke removed');
    expect(setup.document.require('bg').getAttribute('stroke')).toBeUndefined();
  });

  it('未知属性在构造阶段被拒绝', () => {
    const setup = fixture();
    expect(() => new SetAttributeCommand(setup.context, 'c1', 'radius', '5')).toThrowError(
      'unknown attribute: radius',
    );
  });

  it('非法数值被拒绝，且不会进撤销栈、不会污染状态', () => {
    const setup = fixture();
    expect(() =>
      setup.history.run(new SetAttributeCommand(setup.context, 'c1', 'r', 'abc')),
    ).toThrowError('invalid value for r: abc');
    expect(setup.history.undoDepth).toBe(0);
    expect(setup.document.require('c1').getAttribute('r')).toBe('20');
  });
});

describe('group / ungroup / addto', () => {
  it('group 收编多个图形，undo 后各自回到原位置', () => {
    const setup = fixture();
    const before = snapshotDocument(setup.document);

    const executed = setup.history.run(new GroupCommand(setup.context, 'markers', ['c1', 'box']));
    expect(executed).toBe('g#markers created with 2 children');
    expect(setup.document.require('markers').children.map((s) => s.id)).toEqual(['c1', 'box']);

    expect(setup.history.undo()).toBe('g#markers dissolved');
    expect(snapshotDocument(setup.document)).toStrictEqual(before);
  });

  it('group 保持命令行给出的顺序', () => {
    const setup = fixture();
    setup.history.run(new GroupCommand(setup.context, 'markers', ['box', 'c1']));
    expect(setup.document.require('markers').children.map((s) => s.id)).toEqual(['box', 'c1']);
  });

  it('同时选中容器与它的子孙被拒绝', () => {
    const setup = fixture();
    setup.history.run(new GroupCommand(setup.context, 'markers', ['c1', 'box']));
    expect(() => new GroupCommand(setup.context, 'bad', ['c1', 'markers'])).toThrowError(
      'cannot group a container into its own descendant: markers',
    );
  });

  it('group 的 id 已存在时被拒绝', () => {
    const setup = fixture();
    expect(() => new GroupCommand(setup.context, 'bg', ['c1', 'box'])).toThrowError(
      'id already exists: bg',
    );
  });

  it('ungroup 把子节点提升到父级，undo 还原整个容器', () => {
    const setup = fixture();
    setup.history.run(new GroupCommand(setup.context, 'outer', ['c1', 'box']));
    setup.history.run(new GroupCommand(setup.context, 'inner', ['c1']));
    const before = snapshotDocument(setup.document);

    const executed = setup.history.run(new UngroupCommand(setup.context, 'inner'));
    expect(executed).toBe('g#inner ungrouped, 1 children moved to g#outer');
    expect(setup.document.require('c1').parent?.id).toBe('outer');

    setup.history.undo();
    expect(snapshotDocument(setup.document)).toStrictEqual(before);
  });

  it('顶层容器不能 ungroup', () => {
    const setup = fixture();
    setup.history.run(new GroupCommand(setup.context, 'markers', ['c1', 'box']));
    expect(() => new UngroupCommand(setup.context, 'markers')).toThrowError(
      'cannot ungroup top-level container: markers',
    );
  });

  it('对叶子 ungroup 报 not a container', () => {
    const setup = fixture();
    expect(() => new UngroupCommand(setup.context, 'c1')).toThrowError('not a container: c1');
  });

  it('addto 移动归属，undo 回到原父容器原位置', () => {
    const setup = fixture();
    setup.history.run(new GroupCommand(setup.context, 'markers', ['box']));
    const before = snapshotDocument(setup.document);

    const executed = setup.history.run(new AddToCommand(setup.context, 'markers', 'c1'));
    expect(executed).toBe('circle#c1 moved into g#markers');
    expect(setup.document.require('c1').parent?.id).toBe('markers');

    expect(setup.history.undo()).toBe('circle#c1 moved back to svg');
    expect(snapshotDocument(setup.document)).toStrictEqual(before);
  });

  it('addto 成环被拒绝', () => {
    const setup = fixture();
    setup.history.run(new GroupCommand(setup.context, 'outer', ['c1']));
    setup.history.run(new GroupCommand(setup.context, 'inner', ['outer']));
    // 注意 outer 现在在 inner 里
    expect(() => new AddToCommand(setup.context, 'outer', 'inner')).toThrowError(
      'cannot group a container into its own descendant: inner',
    );
  });
});

describe('front / back', () => {
  it('front 把元素调到同级最后，undo 回到原位置', () => {
    const setup = fixture();
    const before = snapshotDocument(setup.document);

    expect(setup.history.run(new ReorderCommand(setup.context, 'bg', 'front'))).toBe(
      'rect#bg moved to front',
    );
    expect(setup.document.canvas.children.map((s) => s.id)).toEqual(['title', 'c1', 'box', 'bg']);

    expect(setup.history.undo()).toBe('rect#bg restored to position 1');
    expect(snapshotDocument(setup.document)).toStrictEqual(before);
  });

  it('back 把元素调到同级最前，子节点顺序随之变化', () => {
    const setup = fixture();
    setup.history.run(new ReorderCommand(setup.context, 'box', 'back'));
    expect(setup.document.canvas.children.map((s) => s.id)).toEqual(['box', 'bg', 'title', 'c1']);

    setup.history.undo();
    expect(setup.document.canvas.children.map((s) => s.id)).toEqual(['bg', 'title', 'c1', 'box']);
  });
});

describe('undo / redo 的交互规则', () => {
  it('group 收编三个图形只算一个 undo 单元', () => {
    const setup = fixture();
    const before = snapshotDocument(setup.document);
    setup.history.run(new GroupCommand(setup.context, 'markers', ['bg', 'title', 'c1']));

    expect(setup.history.undoDepth).toBe(1);
    setup.history.undo();
    expect(snapshotDocument(setup.document)).toStrictEqual(before);
  });

  it('多次编辑逐步回退，再逐步重做，最终状态一致', () => {
    const setup = fixture();
    const initial = snapshotDocument(setup.document);

    setup.history.run(new CreateShapeCommand(setup.context, new Rect('n1', 0, 0, 10, 10), null));
    setup.history.run(new MoveShapeCommand(setup.context, 'n1', 5, 5));
    setup.history.run(new SetAttributeCommand(setup.context, 'n1', 'fill', '#123456'));
    const final = snapshotDocument(setup.document);

    setup.history.undo();
    setup.history.undo();
    setup.history.undo();
    expect(snapshotDocument(setup.document)).toStrictEqual(initial);

    setup.history.redo();
    setup.history.redo();
    setup.history.redo();
    expect(snapshotDocument(setup.document)).toStrictEqual(final);
  });
});
