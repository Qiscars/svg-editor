import { describe, expect, it } from 'vitest';

import { CommandParser } from '../../src/cli/CommandParser.js';
import { Tokenizer } from '../../src/cli/Tokenizer.js';

describe('Tokenizer', () => {
  it('按空白切分', () => {
    expect(Tokenizer.tokenize('create rect r1 0 0 10 10')).toEqual([
      'create',
      'rect',
      'r1',
      '0',
      '0',
      '10',
      '10',
    ]);
  });

  it('双引号里的空格被保留，引号本身去掉', () => {
    expect(Tokenizer.tokenize('create text t1 20 40 "My Diagram"')).toEqual([
      'create',
      'text',
      't1',
      '20',
      '40',
      'My Diagram',
    ]);
  });

  it('空引号产生一个空字符串参数', () => {
    expect(Tokenizer.tokenize('set t1 text ""')).toEqual(['set', 't1', 'text', '']);
  });

  it('引号内部的引号不会被当成结束（只有成对的才结束）', () => {
    expect(Tokenizer.tokenize('a "b c" d')).toEqual(['a', 'b c', 'd']);
  });

  it('# 开头的十六进制颜色不会被吞掉', () => {
    expect(Tokenizer.tokenize('create rect bg 0 0 800 600 #ffffff')).toContain('#ffffff');
  });

  it('多个连续空格不产生空参数', () => {
    expect(Tokenizer.tokenize('  init   800    600  ')).toEqual(['init', '800', '600']);
  });

  it('引号未闭合报错', () => {
    expect(() => Tokenizer.tokenize('create text t1 20 40 "abc')).toThrowError(
      'unclosed double quote',
    );
  });
});

describe('CommandParser', () => {
  const parser = new CommandParser();

  it('空行返回 null', () => {
    expect(parser.parse('   ')).toBeNull();
  });

  it('# 开头的整行是注释，返回 null', () => {
    expect(parser.parse('# 建一个画布')).toBeNull();
  });

  it('拆出命令名与参数', () => {
    expect(parser.parse('move c1 30 0')).toEqual({ name: 'move', args: ['c1', '30', '0'] });
  });

  it('只有命令名时参数为空数组', () => {
    expect(parser.parse('help')).toEqual({ name: 'help', args: [] });
  });

  it('create 的 in 子句作为普通参数保留', () => {
    expect(parser.parse('create rect start 120 100 160 60 #4a90d9 in node1')).toEqual({
      name: 'create',
      args: ['rect', 'start', '120', '100', '160', '60', '#4a90d9', 'in', 'node1'],
    });
  });

  it('带引号的文本内容保持完整', () => {
    expect(parser.parse('create text t1 20 40 "开始"')).toEqual({
      name: 'create',
      args: ['text', 't1', '20', '40', '开始'],
    });
  });
});
