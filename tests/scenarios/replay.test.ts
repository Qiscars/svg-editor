import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { Readable, Writable } from 'node:stream';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { EditorApp } from '../../src/app/EditorApp.js';
import { Repl } from '../../src/cli/Repl.js';
import { FileGateway } from '../../src/io/FileGateway.js';
import { ShapeError } from '../../src/domain/ShapeError.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCENARIOS = join(ROOT, 'doc', 'scenarios');

function readScenario(name: string): string {
  return readFileSync(join(SCENARIOS, name), 'utf8');
}

/** 内存文件系统：场景脚本里的 `save demo.svg` / `read other.svg` 不再依赖 cwd。 */
class InMemoryFileGateway extends FileGateway {
  readonly files = new Map<string, string>();

  override read(path: string): string {
    const content = this.files.get(path);
    if (content === undefined) {
      throw ShapeError.cannotReadFile(path);
    }
    return content;
  }

  override write(path: string, content: string): void {
    this.files.set(path, content);
  }

  override exists(path: string): boolean {
    return this.files.has(path);
  }
}

class Collector extends Writable {
  private buffer = '';

  override _write(
    chunk: unknown,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    this.buffer += String(chunk);
    callback();
  }

  get text(): string {
    return this.buffer;
  }
}

async function replay(script: string, files: InMemoryFileGateway): Promise<string> {
  const lines = script.split('\n').filter((line, index, all) => !(line === '' && index === all.length - 1));
  const input = Readable.from(lines.map((line) => `${line}\n`));
  const output = new Collector();
  const repl = new Repl(input, output, new EditorApp(files));
  await repl.run();
  return output.text;
}

describe('场景回放：作业 §6 典型会话', () => {
  it('回放输出与 golden 文件逐字一致', async () => {
    const files = new InMemoryFileGateway();
    files.files.set('other.svg', readScenario('other.svg'));

    const actual = await replay(readScenario('basic-session.txt'), files);
    const expected = readScenario('basic-session.golden.txt');

    expect(actual).toBe(expected);
  });

  it('回放过程确实产出了 demo.svg，且是一个合法可读的 SVG', async () => {
    const files = new InMemoryFileGateway();
    files.files.set('other.svg', readScenario('other.svg'));
    await replay(readScenario('basic-session.txt'), files);

    const saved = files.files.get('demo.svg');
    expect(saved).toBeDefined();
    expect(saved).toContain('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"');
    expect(saved).toContain('<rect id="bg"');
    // 注意标题是 "My Diagram" 而不是 v2：脚本里 set 之后 undo 过
    expect(saved).toContain('>My Diagram</text>');
    expect(saved).not.toContain('v2');
  });
});

describe('场景回放：作业 §6.1 两节点流程图', () => {
  it('八个元素按预期建在正确层级里', async () => {
    const files = new InMemoryFileGateway();
    const output = await replay(readScenario('flowchart-session.txt'), files);

    expect(output).toContain('g#flowchart created');
    expect(output).toContain('g#node1 created in g#flowchart');
    expect(output).toContain('text#start-label created in g#node1');
    expect(output).toContain('line#arrow1 created in g#flowchart');
    expect(output).toContain('g#node2 moved by (0,100)');
    expect(output).toContain('g#node2 moved back by (0,-100)');
    expect(output).toContain('saved to flowchart.svg (8 elements)');
  });

  it('树的结构与作业 §6.1 一致（只比较层级与属性，不比较列宽）', async () => {
    const files = new InMemoryFileGateway();
    const output = await replay(readScenario('flowchart-session.txt'), files);

    const treeLines = output
      .split('\n')
      .filter((line) => /^[│├└ ]*[├└]── /.test(line))
      .map((line) => line.replace(/\s+/g, ' ').trim());

    expect(treeLines).toEqual([
      '└── g#flowchart',
      '├── g#node1',
      '│ ├── rect#start x=120 y=100 w=160 h=60 fill=#4a90d9',
      '│ └── text#start-label (155,135) "开始"',
      '├── g#node2',
      '│ ├── rect#process x=520 y=100 w=160 h=60 fill=#f5a623',
      '│ └── text#process-label (545,135) "处理数据"',
      '└── line#arrow1 (280,130) -> (520,130) stroke=black',
    ]);
  });

  it('保存出的 SVG 能再读回来，结构不丢', async () => {
    const files = new InMemoryFileGateway();
    await replay(readScenario('flowchart-session.txt'), files);

    const saved = files.files.get('flowchart.svg');
    expect(saved).toBeDefined();

    const reopened = new InMemoryFileGateway();
    reopened.files.set('flowchart.svg', saved ?? '');
    const app = new EditorApp(reopened);
    const messages = app.read('flowchart.svg');

    expect(messages).toEqual(['read flowchart.svg (8 elements)']);
    expect(app.document.requireContainer('node1').children.map((shape) => shape.id)).toEqual([
      'start',
      'start-label',
    ]);
  });
});
