import { Readable, Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';

import { Repl } from '../../src/cli/Repl.js';

/** 把 REPL 的输出收集成字符串，便于逐行断言。 */
class Collector extends Writable {
  private buffer = '';

  override _write(chunk: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.buffer += String(chunk);
    callback();
  }

  get text(): string {
    return this.buffer;
  }

  /** 去掉横幅与空行，返回实际输出行。 */
  get lines(): string[] {
    return this.text.split('\n');
  }
}

async function runScript(script: readonly string[]): Promise<string[]> {
  const input = Readable.from(script.map((line) => `${line}\n`));
  const output = new Collector();
  const repl = new Repl(input, output);
  await repl.run();
  return output.lines;
}

/** 去掉 `svg> ` 回显行与横幅，只留命令产生的输出。 */
function producedLines(lines: readonly string[]): string[] {
  return lines.filter((line) => line !== '' && !line.startsWith('svg> ') && !line.includes('svg-editor 0.1'));
}

describe('Repl 端到端', () => {
  it('作业 §6 的关键序列逐行复现', async () => {
    const lines = producedLines(
      await runScript([
        'init 800 600',
        'create rect bg 0 0 800 600 #ffffff',
        'create circle c1 100 100 20 red',
        'move c1 30 0',
        'undo',
        'redo',
        'set c1 fill blue',
        'undo',
        'save out/repl-demo.svg',
        'undo',
      ]),
    );

    expect(lines).toEqual([
      'canvas 800x600 created',
      'rect#bg created',
      'circle#c1 created',
      'circle#c1 moved to (130,100)',
      'circle#c1 moved back to (100,100)',
      'circle#c1 moved to (130,100)',
      'circle#c1 updated: fill=blue',
      'circle#c1 updated: fill=red',
      'saved to out/repl-demo.svg (2 elements)',
      'error: undo not allowed after io command',
    ]);
  });

  it('空行与 # 注释不产生输出', async () => {
    expect(producedLines(await runScript(['', '   ', '# 这是注释', 'init']))).toEqual([
      'canvas 800x600 created',
    ]);
  });

  it('未知命令报 unknown command', async () => {
    expect(producedLines(await runScript(['nonsense']))).toEqual([
      'error: unknown command: nonsense',
    ]);
  });

  it('参数个数不符报用法', async () => {
    expect(producedLines(await runScript(['move c1']))).toEqual([
      'error: usage: move <id> <dx> <dy>',
    ]);
  });

  it('未 init / read 就执行命令报 no document', async () => {
    expect(producedLines(await runScript(['move c1 1 2', 'undo', 'tree']))).toEqual([
      "error: no document. use 'init' or 'read' first",
      "error: no document. use 'init' or 'read' first",
      "error: no document. use 'init' or 'read' first",
    ]);
  });

  it('引号未闭合报错而不是吞掉整行', async () => {
    expect(producedLines(await runScript(['init', 'create text t1 1 2 "abc']))).toEqual([
      'canvas 800x600 created',
      'error: unclosed double quote',
    ]);
  });

  it('一次失败不改变状态，后续命令照常工作', async () => {
    const lines = producedLines(
      await runScript([
        'init',
        'create rect r1 0 0 10 10',
        'set r1 radius 5',
        'tree',
      ]),
    );
    expect(lines).toEqual([
      'canvas 800x600 created',
      'rect#r1 created',
      'error: unknown attribute: radius',
      'svg (800x600)',
      '└── rect#r1  x=0 y=0 w=10 h=10',
    ]);
  });
});
