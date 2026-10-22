import { describe, expect, it } from 'vitest';

import { EditorApp } from '../../src/app/EditorApp.js';
import { createDefaultCommandRegistry } from '../../src/cli/DefaultCommandRegistry.js';
import { CommandRegistry } from '../../src/registry/CommandRegistry.js';

describe('CommandRegistry', () => {
  it('注册后可按名字取到', () => {
    const registry = new CommandRegistry<{ log: string[] }>();
    registry.register({
      name: 'ping',
      usage: 'ping',
      summary: '测试用',
      minArgs: 0,
      maxArgs: 0,
      run: (context) => {
        context.log.push('ping');
        return ['pong'];
      },
    });
    const log: string[] = [];
    expect(registry.execute({ log }, 'ping', [])).toEqual(['pong']);
    expect(log).toEqual(['ping']);
  });

  it('未知命令报 unknown command', () => {
    const registry = new CommandRegistry<object>();
    expect(() => registry.execute({}, 'nope', [])).toThrowError('unknown command: nope');
  });

  it('参数个数不符时报用法', () => {
    const registry = new CommandRegistry<object>();
    registry.register({
      name: 'two',
      usage: 'two <a> <b>',
      summary: '',
      minArgs: 2,
      maxArgs: 2,
      run: () => [],
    });
    expect(() => registry.execute({}, 'two', ['one'])).toThrowError('usage: two <a> <b>');
    expect(() => registry.execute({}, 'two', ['a', 'b', 'c'])).toThrowError(
      'usage: two <a> <b>',
    );
  });

  it('重复注册同一个名字是内部错误', () => {
    const registry = new CommandRegistry<object>();
    const spec = { name: 'dup', usage: 'dup', summary: '', minArgs: 0, maxArgs: 0, run: () => [] };
    registry.register(spec);
    expect(() => registry.register(spec)).toThrowError('command already registered: dup');
  });
});

describe('默认命令表', () => {
  const registry = createDefaultCommandRegistry();

  it('覆盖作业 §3 命令总表的全部命令', () => {
    const names = registry.list().map((spec) => spec.name);
    expect(names.sort()).toEqual(
      [
        'init',
        'read',
        'save',
        'canvas',
        'create',
        'delete',
        'move',
        'scale',
        'set',
        'group',
        'ungroup',
        'addto',
        'front',
        'back',
        'undo',
        'redo',
        'help',
      ].sort(),
    );
  });

  it('help 文本由注册表生成，包含用法与说明', () => {
    const lines = registry.helpLines();
    expect(lines).toHaveLength(registry.list().length);
    expect(lines.some((line) => line.includes('create <type> <id>'))).toBe(true);
    expect(lines.some((line) => line.includes('创建图形'))).toBe(true);
  });

  it('help 命令输出表头与全部行', () => {
    const app = new EditorApp();
    const lines = registry.execute(app, 'help', []);
    expect(lines[0]).toBe('Commands:');
    expect(lines).toHaveLength(registry.list().length + 1);
  });

  it('加一条命令只需注册一次，help 自动包含它（R3 已消除）', () => {
    const custom = createDefaultCommandRegistry();
    const before = custom.helpLines().length;
    custom.register({
      name: 'zoom',
      usage: 'zoom <factor>',
      summary: '缩放视图',
      minArgs: 1,
      maxArgs: 1,
      run: () => [],
    });
    expect(custom.helpLines()).toHaveLength(before + 1);
    expect(custom.helpLines().some((line) => line.includes('zoom <factor>'))).toBe(true);
  });
});
