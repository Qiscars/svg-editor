import { describe, expect, it } from 'vitest';

import { EditorApp } from '../../src/app/EditorApp.js';
import { CommandParser } from '../../src/cli/CommandParser.js';
import { createDefaultCommandRegistry } from '../../src/cli/DefaultCommandRegistry.js';
import type { CommandRegistry } from '../../src/registry/CommandRegistry.js';
import { snapshotDocument } from '../helpers/snapshot.js';

interface Attempt {
  readonly lines?: readonly string[];
  readonly error?: string;
}

const parser = new CommandParser();
const registry: CommandRegistry<EditorApp> = createDefaultCommandRegistry();

function attempt(app: EditorApp, line: string): Attempt {
  const invocation = parser.parse(line);
  if (invocation === null) {
    return { lines: [] };
  }
  try {
    return { lines: registry.execute(app, invocation.name, invocation.args) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

/** 作业 §6 同款起始文档：bg / title / c1 / box 四个顶层元素。 */
function setup(): EditorApp {
  const app = new EditorApp();
  attempt(app, 'init 800 600');
  attempt(app, 'create rect bg 0 0 800 600 #ffffff');
  attempt(app, 'create text title 20 40 "My Diagram"');
  attempt(app, 'create circle c1 100 100 20 red');
  attempt(app, 'create rect box 200 80 60 60 #3366ff');
  return app;
}

/** 断言一条命令失败，并且**整棵树一个字节都没变**。 */
function expectFailure(app: EditorApp, line: string, expectedError: string): void {
  const before = snapshotDocument(app.document);
  const undoDepthBefore = app.history.undoDepth;

  const result = attempt(app, line);

  expect(result.error).toBe(expectedError);
  expect(snapshotDocument(app.document)).toStrictEqual(before);
  // 失败的命令也不能进入撤销栈
  expect(app.history.undoDepth).toBe(undoDepthBefore);
}

/**
 * 作业 §4.2 的错误信息表逐条覆盖。
 *
 * 每条都同时验证两件事：**报出规定的文案** + **失败不改变任何状态**。
 * 后者才是"错误处理做对了"的真正判据——只对文案的话，实现里先改一半再抛错
 * 也能通过。
 */
describe('作业 §4.2 错误信息逐条覆盖', () => {
  it('1. id 已存在', () => {
    const app = setup();
    expectFailure(app, 'create rect bg 10 10 5 5', 'id already exists: bg');
  });

  it('2. id 不存在', () => {
    const app = setup();
    expectFailure(app, 'delete r9', 'no such shape: r9');
  });

  it('3. in 目标不存在', () => {
    const app = setup();
    expectFailure(app, 'create rect n1 0 0 1 1 in node9', 'no such container: node9');
  });

  it('4. in 目标不是容器', () => {
    const app = setup();
    expectFailure(app, 'create rect n1 0 0 1 1 in bg', 'not a container: bg');
  });

  it('5. 未注册的图形类型', () => {
    const app = setup();
    expectFailure(
      app,
      'create hexagon h1 0 0 10 10',
      'unknown shape type: hexagon (is the plugin loaded?)',
    );
  });

  it('6. ungroup 复合图形 —— 本阶段不适用（box 属插件阶段），普通 g 可以解散', () => {
    const app = setup();
    attempt(app, 'create g outer');
    attempt(app, 'create g inner in outer');
    attempt(app, 'addto inner c1');

    // 没有 box 插件，所以 `cannot ungroup composite shape` 永远不会触发；
    // 非顶层普通容器的解散必须正常工作
    expect(attempt(app, 'ungroup inner').error).toBeUndefined();
    expect(app.document.has('inner')).toBe(false);
    expect(app.document.require('c1').parent?.id).toBe('outer');
  });

  it('7. group 目标同时含某容器与其子孙', () => {
    const app = setup();
    attempt(app, 'group markers c1 box');
    expectFailure(
      app,
      'group bad c1 markers',
      'cannot group a container into its own descendant: markers',
    );
  });

  it('8. ungroup 根级容器', () => {
    const app = setup();
    attempt(app, 'group scene c1 box');
    expectFailure(app, 'ungroup scene', 'cannot ungroup top-level container: scene');
  });

  it('9. scale 非正数', () => {
    const app = setup();
    expectFailure(app, 'scale c1 0', 'scale factor must be positive');
    expectFailure(app, 'scale c1 -2', 'scale factor must be positive');
  });

  it('10a. 文件不存在', () => {
    const app = setup();
    expectFailure(app, 'read no-such-file.svg', 'cannot read file: no-such-file.svg');
  });

  it('10b. 文件不可写', () => {
    const app = setup();
    expectFailure(
      app,
      'save out/definitely-missing-dir/x.svg',
      'cannot write file: out/definitely-missing-dir/x.svg',
    );
  });

  it('11. 未 read/init 就执行命令', () => {
    const app = new EditorApp();
    for (const line of ['move c1 1 2', 'undo', 'redo', 'tree', 'show c1', 'save']) {
      const result = attempt(app, line);
      expect(result.error).toBe("no document. use 'init' or 'read' first");
    }
    expect(app.hasDocument).toBe(false);
  });
});

describe('§4.2 之外的实现定义错误，同样不改状态', () => {
  it('白名单外的属性', () => {
    const app = setup();
    expectFailure(app, 'set c1 radius 5', 'unknown attribute: radius');
  });

  it('别的类型的几何属性不是本类型的白名单', () => {
    const app = setup();
    expectFailure(app, 'set bg r 5', 'unknown attribute: r');
  });

  it('属性值非法', () => {
    const app = setup();
    expectFailure(app, 'set c1 r abc', 'invalid value for r: abc');
  });

  it('参数个数不符', () => {
    const app = setup();
    expectFailure(app, 'move c1 1', 'usage: move <id> <dx> <dy>');
    expectFailure(app, 'create', 'usage: create <type> <id> [params...] [in <containerId>]');
  });

  it('未知命令', () => {
    const app = setup();
    expectFailure(app, 'frobnicate', 'unknown command: frobnicate');
  });

  it('save 之后 undo / redo 被闸门拦住（§4.3）', () => {
    const app = setup();
    attempt(app, 'move c1 10 10');
    expect(attempt(app, 'save out/error-paths-tmp.svg').error).toBeUndefined();

    const before = snapshotDocument(app.document);
    expect(attempt(app, 'undo').error).toBe('undo not allowed after io command');
    expect(attempt(app, 'redo').error).toBe('redo not allowed after io command');
    expect(snapshotDocument(app.document)).toStrictEqual(before);

    // 下一次编辑命令重新解禁
    attempt(app, 'move c1 1 1');
    expect(attempt(app, 'undo').error).toBeUndefined();
  });
});
