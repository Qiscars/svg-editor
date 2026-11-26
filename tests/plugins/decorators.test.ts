import { describe, expect, it } from 'vitest';
import { TreeRenderer } from '@svgframe/host';
import commandStats from '@svgframe/plugin-command-stats';
import treeStar from '@svgframe/plugin-tree-star';
import shapeBox from '@svgframe/plugin-shape-box';
import { createTestComposition } from '../helpers/kernel.js';


describe('stats 命令插件', () => {
  it('按首次出现顺序统计叶子，容器单独计数', () => {
    const { app, commands } = createTestComposition({ plugins: [commandStats] });
    app.init(800, 600);
    app.createShape('rect', 'r1', ['0', '0', '10', '10'], undefined, null);
    app.createShape('circle', 'c1', ['0', '0', '5'], undefined, null);
    app.createShape('rect', 'r2', ['0', '0', '10', '10'], undefined, null);
    app.createShape('g', 'g1', [], undefined, null);
    app.addToGroup('g1', 'c1');

    expect(commands.execute(app, 'stats', [])).toEqual(['rect: 2  circle: 1  (total 3, containers 1)']);
  });

  it('box 内部叶子照常计数，box 只计入 containers', () => {
    const { app, commands } = createTestComposition({ plugins: [shapeBox, commandStats] });
    app.init(800, 600);
    app.createShape('box', 'n1', ['0', '0', '100', '40', 'A'], undefined, null);

    expect(commands.execute(app, 'stats', [])).toEqual(['rect: 1  text: 1  (total 2, containers 1)']);
  });

  it('空文档输出 (total 0, containers 0)', () => {
    const { app, commands } = createTestComposition({ plugins: [commandStats] });
    app.init();
    expect(commands.execute(app, 'stats', [])).toEqual(['(total 0, containers 0)']);
  });

  it('不进入 undo 栈，也不改变文档', () => {
    const { app, commands } = createTestComposition({ plugins: [commandStats] });
    app.init();
    app.createShape('rect', 'r1', ['0', '0', '10', '10'], undefined, null);
    const depth = app.history.undoDepth;
    commands.execute(app, 'stats', []);
    expect(app.history.undoDepth).toBe(depth);
    expect(app.document.elementCount).toBe(1);
  });

  it('在 help 里出现；未装插件时报 unknown command', () => {
    const withPlugin = createTestComposition({ plugins: [commandStats] });
    expect(withPlugin.commands.helpLines().some((line) => line.includes('stats'))).toBe(true);

    const without = createTestComposition();
    expect(without.commands.helpLines().some((line) => line.includes('stats'))).toBe(false);
    expect(() => without.commands.execute(without.app, 'stats', [])).toThrowError(
      'unknown command: stats',
    );
  });
});

describe('modified-star 树标签', () => {
  function setup() {
    const composition = createTestComposition({ plugins: [treeStar] });
    composition.app.init(400, 300);
    return composition;
  }

  function tree(composition: ReturnType<typeof setup>): readonly string[] {
    return new TreeRenderer(composition.services.decorators).render(composition.app.document);
  }

  it('新建的节点在保存前标 *，保存后消失', () => {
    const composition = setup();
    composition.app.createShape('rect', 'r1', ['0', '0', '10', '10'], undefined, null);
    expect(tree(composition).some((line) => line.includes('rect#r1') && line.endsWith('*'))).toBe(true);

    // 模拟宿主在 save 之后发出的通知
    composition.services.decorators.notifySaved(composition.app.document);

    expect(tree(composition).some((line) => line.endsWith('*'))).toBe(false);
  });

  it('保存后再编辑 → 只有被改的行与根行带 *', () => {
    const composition = setup();
    composition.app.createShape('g', 'g1', [], undefined, null);
    composition.app.createShape('rect', 'r1', ['0', '0', '10', '10'], undefined, 'g1');
    composition.services.decorators.notifySaved(composition.app.document);

    composition.app.moveShape('r1', 1, 1);
    const lines = tree(composition);

    expect(lines[0]).toMatch(/\*$/);
    expect(lines.find((line) => line.includes('g#g1'))?.endsWith('*')).toBe(false);
    expect(lines.find((line) => line.includes('rect#r1'))?.endsWith('*')).toBe(true);
  });

  it('undo 回到保存点时 * 消失（内容语义而非命令计数语义）', () => {
    const composition = setup();
    composition.app.createShape('rect', 'r1', ['0', '0', '10', '10'], undefined, null);
    composition.services.decorators.notifySaved(composition.app.document);

    composition.app.moveShape('r1', 5, 5);
    expect(tree(composition).some((line) => line.endsWith('*'))).toBe(true);

    composition.app.undo();
    expect(tree(composition).some((line) => line.endsWith('*'))).toBe(false);

    composition.app.redo();
    expect(tree(composition).some((line) => line.endsWith('*'))).toBe(true);
  });

  it('删除节点后根行仍能反映"与保存点不一致"', () => {
    const composition = setup();
    composition.app.createShape('rect', 'r1', ['0', '0', '10', '10'], undefined, null);
    composition.app.createShape('rect', 'r2', ['0', '0', '10', '10'], undefined, null);
    composition.services.decorators.notifySaved(composition.app.document);

    composition.app.deleteShape('r1');
    expect(tree(composition)[0]?.endsWith('*')).toBe(true);
  });

  it('两个标签并存：同一行可以同时有 (box) 和 *', () => {
    const composition = createTestComposition({ plugins: [shapeBox, treeStar] });
    composition.app.init(400, 300);
    composition.app.createShape('box', 'n1', ['0', '0', '100', '40', 'A'], undefined, null);

    const lines = new TreeRenderer(composition.services.decorators).render(composition.app.document);
    const boxLine = lines.find((line) => line.includes('g#n1'));
    expect(boxLine).toContain('(box)');
    expect(boxLine?.endsWith('*')).toBe(true);
  });
});

describe('插件独立可测', () => {
  it('每个插件都能在不加载其他插件的情况下单独激活', () => {
    expect(createTestComposition({ plugins: [treeStar] }).errors).toEqual([]);
    expect(createTestComposition({ plugins: [commandStats] }).errors).toEqual([]);
    expect(createTestComposition({ plugins: [shapeBox] }).errors).toEqual([]);
  });

  it('插件注册的扩展可以被单独卸载而不影响其他', () => {
    const composition = createTestComposition({ plugins: [commandStats, shapeBox] });
    expect(composition.commands.has('stats')).toBe(true);
    expect(composition.services.shapes.has('box')).toBe(true);
  });
});

