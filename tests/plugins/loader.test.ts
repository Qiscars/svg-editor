import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PluginLoader } from '@svgframe/host';
import { createTestComposition } from '../helpers/kernel.js';

const BASE = resolve('out', 'loader-fixture');

function writeFixture(name: string, source: string): void {
  writeFileSync(join(BASE, name), source, 'utf8');
}

function configFile(name: string, content: unknown): string {
  const path = join(BASE, name);
  writeFileSync(path, typeof content === 'string' ? content : JSON.stringify(content), 'utf8');
  return path;
}

function loaderFor(composition: ReturnType<typeof createTestComposition>): PluginLoader {
  return new PluginLoader({
    shapes: composition.services.shapes,
    commands: composition.commands,
    decorators: composition.services.decorators,
    attributes: composition.services.attributes,
  });
}

beforeEach(() => {
  rmSync(BASE, { recursive: true, force: true });
  mkdirSync(BASE, { recursive: true });
});

afterEach(() => {
  rmSync(BASE, { recursive: true, force: true });
});

describe('加载器：四条失败路径', () => {
  it('模块找不到 → plugin not found', async () => {
    const composition = createTestComposition();
    const report = await loaderFor(composition).loadFromFile(
      configFile('c1.json', { plugins: [{ module: '@svgframe/definitely-not-a-plugin' }] }),
    );
    expect(report.errors).toEqual(['error: plugin not found: @svgframe/definitely-not-a-plugin']);
  });

  it('没有默认导出 → plugin has no default export', async () => {
    writeFixture('no-default.mjs', 'export const notDefault = 1;\n');
    const composition = createTestComposition();
    const report = await loaderFor(composition).loadFromFile(
      configFile('c2.json', { plugins: [{ module: './no-default.mjs' }] }),
    );
    expect(report.errors).toEqual(['error: plugin has no default export: ./no-default.mjs']);
  });

  it('清单与注册不一致 → plugin manifest mismatch', async () => {
    writeFixture(
      'mismatch.mjs',
      `export default {
  name: 'liar',
  contributes: { commands: ['declared-but-not-registered'] },
  activate(context) {
    context.decorators.register({ name: 'some-label', decorate: () => undefined });
  },
};
`,
    );
    const composition = createTestComposition();
    const report = await loaderFor(composition).loadFromFile(
      configFile('c3.json', { plugins: [{ module: './mismatch.mjs' }] }),
    );
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0]).toContain('error: plugin manifest mismatch: liar');
    expect(report.errors[0]).toContain('declared:');
    expect(report.errors[0]).toContain('registered:');
  });

  it('activate 抛错 → plugin failed to activate', async () => {
    writeFixture(
      'boom.mjs',
      `export default {
  name: 'boom',
  activate() {
    throw new Error('kaboom');
  },
};
`,
    );
    const composition = createTestComposition();
    const report = await loaderFor(composition).loadFromFile(
      configFile('c4.json', { plugins: [{ module: './boom.mjs' }] }),
    );
    expect(report.errors).toEqual(['error: plugin failed to activate: boom (kaboom)']);
  });

  it('模块存在但求值失败 → 归为激活失败，不误报为找不到', async () => {
    writeFixture('bad-import.mjs', "import '@svgframe/no-such-dependency';\nexport default { name: 'x', activate() {} };\n");
    const composition = createTestComposition();
    const report = await loaderFor(composition).loadFromFile(
      configFile('c5.json', { plugins: [{ module: './bad-import.mjs' }] }),
    );
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0]).toContain('error: plugin failed to activate: ./bad-import.mjs');
    expect(report.errors[0]).not.toContain('plugin not found');
  });
});

describe('加载器：注册冲突与回滚', () => {
  it('重复注册被拒，且该插件的其他注册全部回滚', async () => {
    writeFixture(
      'good.mjs',
      `export default {
  name: 'good',
  contributes: { decorators: ['good-label'] },
  activate(context) {
    context.decorators.register({ name: 'good-label', decorate: () => 'G' });
  },
};
`,
    );
    writeFixture(
      'duplicate.mjs',
      `export default {
  name: 'dup',
  contributes: { decorators: ['dup-label'] },
  activate(context) {
    context.decorators.register({ name: 'dup-label', decorate: () => 'D' });
    // 与内置的 rect 冲突
    context.shapes.register({
      kind: 'rect',
      parameters: [],
      build: () => { throw new Error('unused'); },
    });
  },
};
`,
    );
    const composition = createTestComposition();
    const loader = loaderFor(composition);
    const config = {
      plugins: [{ module: './good.mjs' }, { module: './duplicate.mjs' }],
    };
    const report = await loader.load(config, BASE);

    expect(report.errors).toEqual(['error: duplicate registration: shapes/rect']);
    // 第一个插件保留
    expect(composition.services.decorators.list().map((d) => d.name)).toEqual(['good-label']);
    // 失败插件的另一个注册已回滚
    expect(composition.services.decorators.list().map((d) => d.name)).not.toContain('dup-label');
  });

  it('清单不一致时回滚该插件的全部注册', async () => {
    writeFixture(
      'mismatch2.mjs',
      `export default {
  name: 'mismatch2',
  contributes: {},
  activate(context) {
    context.commands.register({ name: 'tmp', usage: 'tmp', summary: '', minArgs: 0, maxArgs: 0, run: () => [] });
  },
};
`,
    );
    const composition = createTestComposition();
    const report = await loaderFor(composition).load(
      { plugins: [{ module: './mismatch2.mjs' }] },
      BASE,
    );
    expect(report.errors[0]).toContain('plugin manifest mismatch: mismatch2');
    expect(composition.commands.has('tmp')).toBe(false);
  });
});

describe('加载器：配置语义', () => {
  it('enabled:false 完全跳过', async () => {
    const composition = createTestComposition();
    const report = await loaderFor(composition).loadFromFile(
      configFile('c6.json', {
        plugins: [{ module: '@svgframe/definitely-not-a-plugin', enabled: false }],
      }),
    );
    expect(report.errors).toEqual([]);
    expect(report.loaded).toEqual([]);
  });

  it('配置语法不合法 → invalid plugin config', async () => {
    const composition = createTestComposition();
    const path = configFile('broken.json', '{ "plugins": [ ');
    const report = await loaderFor(composition).loadFromFile(path);
    expect(report.errors).toEqual(['error: invalid plugin config']);
  });

  it('配置结构不合法（缺 module 字段）也会被拒绝', async () => {
    const composition = createTestComposition();
    const report = await loaderFor(composition).loadFromFile(
      configFile('c7.json', { plugins: [{ name: 'x' }] }),
    );
    expect(report.errors).toEqual(['error: invalid plugin config']);
  });

  it('一个插件失败不影响后面的插件加载', async () => {
    writeFixture(
      'ok.mjs',
      `export default {
  name: 'ok',
  contributes: { commands: ['okcmd'] },
  activate(context) {
    context.commands.register({ name: 'okcmd', usage: 'okcmd', summary: '', minArgs: 0, maxArgs: 0, run: () => ['ok'] });
  },
};
`,
    );
    const composition = createTestComposition();
    const report = await loaderFor(composition).load(
      { plugins: [{ module: './boom.mjs' }, { module: './ok.mjs' }] },
      BASE,
    );
    expect(report.errors).toHaveLength(1);
    expect(report.loaded).toEqual(['ok']);
    expect(composition.commands.has('okcmd')).toBe(true);
  });

  it('options 会传给插件', async () => {
    writeFixture(
      'opts.mjs',
      `export default {
  name: 'opts',
  contributes: { shapes: ['optshape'] },
  activate(context) {
    const fill = context.options.fill ?? 'none';
    context.shapes.register({
      kind: 'optshape',
      parameters: [],
      build: (id) => { throw new Error('not built in this test: ' + id + fill); },
    });
  },
};
`,
    );
    const composition = createTestComposition();
    const report = await loaderFor(composition).load(
      { plugins: [{ module: './opts.mjs', options: { fill: '#f5a623' } }] },
      BASE,
    );
    expect(report.errors).toEqual([]);
    expect(composition.services.shapes.has('optshape')).toBe(true);
  });

  it('相对路径以配置文件所在目录为基准', async () => {
    writeFixture(
      'rel.mjs',
      `export default {
  name: 'rel',
  contributes: { decorators: ['rel-label'] },
  activate(context) {
    context.decorators.register({ name: 'rel-label', decorate: () => 'R' });
  },
};
`,
    );
    const composition = createTestComposition();
    const report = await loaderFor(composition).loadFromFile(
      configFile('c8.json', { plugins: [{ module: './rel.mjs' }] }),
    );
    expect(report.errors).toEqual([]);
    expect(report.loaded).toEqual(['rel']);
  });
});
