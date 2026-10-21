import { describe, expect, it } from 'vitest';

import type { Command } from '../../src/commands/Command.js';
import { CommandContext } from '../../src/commands/CommandContext.js';
import { CommandHistory } from '../../src/commands/CommandHistory.js';
import { Document } from '../../src/domain/Document.js';
import { Rect } from '../../src/domain/leaf/Rect.js';

/**
 * 测试替身：把"执行/撤销"变成可观察的记录。
 * 真正的命令在 #12–#16 落地，#17 再验证它们的 execute→undo 深比较。
 */
class FakeEditCommand implements Command {
  private readonly log: string[];
  private readonly name: string;

  constructor(log: string[], name: string) {
    this.log = log;
    this.name = name;
  }

  execute(): string {
    this.log.push(`do:${this.name}`);
    return `${this.name} done`;
  }

  undo(): string {
    this.log.push(`undo:${this.name}`);
    return `${this.name} undone`;
  }
}

describe('CommandHistory：undo / redo 双栈', () => {
  it('run 把命令入栈并返回执行消息', () => {
    const history = new CommandHistory();
    const log: string[] = [];

    expect(history.run(new FakeEditCommand(log, 'a'))).toBe('a done');
    expect(history.undoDepth).toBe(1);
    expect(history.redoDepth).toBe(0);
    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(false);
  });

  it('undo 调命令的 undo 并搬到 redo 栈', () => {
    const history = new CommandHistory();
    const log: string[] = [];
    history.run(new FakeEditCommand(log, 'a'));

    expect(history.undo()).toBe('a undone');
    expect(log).toEqual(['do:a', 'undo:a']);
    expect(history.undoDepth).toBe(0);
    expect(history.redoDepth).toBe(1);
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(true);
  });

  it('redo 重新执行同一条命令', () => {
    const history = new CommandHistory();
    const log: string[] = [];
    history.run(new FakeEditCommand(log, 'a'));
    history.undo();

    expect(history.redo()).toBe('a done');
    expect(log).toEqual(['do:a', 'undo:a', 'do:a']);
    expect(history.undoDepth).toBe(1);
    expect(history.redoDepth).toBe(0);
  });

  it('多步操作按后进先出回滚', () => {
    const history = new CommandHistory();
    const log: string[] = [];
    history.run(new FakeEditCommand(log, 'a'));
    history.run(new FakeEditCommand(log, 'b'));

    history.undo();
    history.undo();

    expect(log).toEqual(['do:a', 'do:b', 'undo:b', 'undo:a']);
  });

  it('undo 之后有新编辑，redo 栈清空', () => {
    const history = new CommandHistory();
    const log: string[] = [];
    history.run(new FakeEditCommand(log, 'a'));
    history.undo();
    expect(history.canRedo).toBe(true);

    history.run(new FakeEditCommand(log, 'b'));

    expect(history.redoDepth).toBe(0);
    expect(history.canRedo).toBe(false);
    expect(() => history.redo()).toThrowError('nothing to redo');
  });

  it('空栈 undo / redo 报错且不改状态', () => {
    const history = new CommandHistory();
    expect(() => history.undo()).toThrowError('nothing to undo');
    expect(() => history.redo()).toThrowError('nothing to redo');
    expect(history.undoDepth).toBe(0);
  });
});

describe('CommandHistory：IO 闸门', () => {
  it('save 之后 undo 被拒绝，报 undo not allowed after io command', () => {
    const history = new CommandHistory();
    const log: string[] = [];
    history.run(new FakeEditCommand(log, 'a'));

    history.markIoBoundary();

    expect(() => history.undo()).toThrowError('undo not allowed after io command');
    expect(history.undoDepth).toBe(1); // 栈没被破坏
    expect(history.canUndo).toBe(false); // 但对外不可用
  });

  it('save 之后 redo 同样被拒绝', () => {
    const history = new CommandHistory();
    const log: string[] = [];
    history.run(new FakeEditCommand(log, 'a'));
    history.undo();
    history.markIoBoundary();

    expect(() => history.redo()).toThrowError('redo not allowed after io command');
  });

  it('下一次编辑命令重新解禁', () => {
    const history = new CommandHistory();
    const log: string[] = [];
    history.run(new FakeEditCommand(log, 'a'));
    history.markIoBoundary();

    history.run(new FakeEditCommand(log, 'b'));

    expect(history.canUndo).toBe(true);
    expect(history.undo()).toBe('b undone');
    expect(history.undo()).toBe('a undone');
  });

  it('init / read 用 reset：两个栈都作废（旧命令指向旧文档）', () => {
    const history = new CommandHistory();
    const log: string[] = [];
    history.run(new FakeEditCommand(log, 'a'));
    history.undo();
    history.run(new FakeEditCommand(log, 'b'));

    history.reset();

    expect(history.undoDepth).toBe(0);
    expect(history.redoDepth).toBe(0);
    expect(() => history.undo()).toThrowError('undo not allowed after io command');
  });
});

describe('CommandContext', () => {
  it('包装文档并转发两类查找', () => {
    const document = new Document(800, 600);
    const rect = new Rect('r1', 0, 0, 10, 10);
    document.attach(document.canvas, rect);
    const context = new CommandContext(document);

    expect(context.document).toBe(document);
    expect(context.require('r1')).toBe(rect);
    expect(() => context.require('zzz')).toThrowError('no such shape: zzz');
    expect(() => context.requireContainer('r1')).toThrowError('not a container: r1');
  });
});
