import { describe, expect, it } from 'vitest';

import {
  OutlineBuilder,
  XmlOutlineError,
  XmlOutlineScanner,
} from '../../packages/vscode-svg/src/OutlineBuilder.js';

const builder = new OutlineBuilder();

describe('OutlineBuilder：层级', () => {
  it('把嵌套的 svg / g / rect 还原成树', () => {
    const roots = builder.build('<svg><g id="g1"><rect id="a"/></g></svg>');

    expect(roots).toHaveLength(1);
    const svg = roots[0];
    expect(svg?.tagName).toBe('svg');
    expect(svg?.children).toHaveLength(1);

    const group = svg?.children[0];
    expect(group?.name).toBe('g#g1');
    expect(group?.children.map((child) => child.name)).toEqual(['rect#a']);
    expect(group?.children[0]?.children).toEqual([]);
  });

  it('没有 id 的节点只显示标签名', () => {
    const roots = builder.build('<svg><g><rect/></g></svg>');

    expect(roots[0]?.name).toBe('svg');
    expect(roots[0]?.children[0]?.name).toBe('g');
    expect(roots[0]?.children[0]?.children[0]?.name).toBe('rect');
  });

  it('根元素带 id 时按 `标签名#id` 展示', () => {
    const roots = builder.build('<svg id="root"><g/></svg>');

    expect(roots[0]?.name).toBe('svg#root');
    expect(roots[0]?.id).toBe('root');
  });
});

describe('OutlineBuilder：源码范围', () => {
  it('第 3 行的元素 range 起点行号为 2（0-based）', () => {
    const source = ['<svg>', '  <g>', '    <rect id="third"/>', '  </g>', '</svg>'].join('\n');
    const rect = builder.build(source)[0]?.children[0]?.children[0];

    expect(rect?.name).toBe('rect#third');
    expect(rect?.range.start.line).toBe(2);
    expect(rect?.range.start.character).toBe(4);
    expect(rect?.selectionRange.start.line).toBe(2);
    // 标签名在 '<' 之后一个字符处开始。
    expect(rect?.selectionRange.start.character).toBe(5);
  });

  it('元素 range 覆盖到结束标签之后，选择范围落在标签名上', () => {
    const source = '<svg>\n  <g id="g1">\n    <rect/>\n  </g>\n</svg>';
    const svg = builder.build(source)[0];
    const group = svg?.children[0];

    expect(svg?.range.start).toEqual({ line: 0, character: 0 });
    expect(svg?.range.end).toEqual({ line: 4, character: 6 });
    expect(group?.selectionRange.start).toEqual({ line: 1, character: 3 });
    expect(group?.selectionRange.end).toEqual({ line: 1, character: 4 });
  });

  it('属性值里的 > 不会被当作标签结束，注释 / CDATA 不进入大纲', () => {
    const source = [
      '<?xml version="1.0"?>',
      '<!-- <fake id="no"/> -->',
      '<svg data-note="a > b">',
      '  <g id="real">',
      '    <![CDATA[ <rect id="cdata"/> ]]>',
      '    <circle/>',
      '  </g>',
      '</svg>',
    ].join('\n');
    const roots = builder.build(source);

    expect(roots).toHaveLength(1);
    const group = roots[0]?.children[0];
    expect(group?.name).toBe('g#real');
    expect(group?.children.map((child) => child.name)).toEqual(['circle']);
    // 引号内的 > 没有提前结束 <svg> 开始标签，根元素的 range 一直覆盖到最后一行。
    expect(roots[0]?.range.end.line).toBe(7);
  });

  it('支持自闭合根元素', () => {
    const source = '<svg id="s"/>';
    const svg = builder.build(source)[0];

    expect(svg?.name).toBe('svg#s');
    expect(svg?.range).toEqual({
      start: { line: 0, character: 0 },
      end: { line: 0, character: source.length },
    });
    expect(svg?.children).toEqual([]);
  });
});

describe('OutlineBuilder：编辑更新与无状态', () => {
  it('同一个 builder 对修改后的文本产生新的结构', () => {
    const before = builder.build('<svg><g id="one"/></svg>');
    const after = builder.build('<svg><g id="one"><rect id="two"/></g></svg>');

    expect(before[0]?.children[0]?.children).toEqual([]);
    expect(after[0]?.children[0]?.children.map((child) => child.name)).toEqual(['rect#two']);
    // 旧结果不应被后续解析改动。
    expect(before[0]?.children[0]?.name).toBe('g#one');
  });

  it('解析失败不会留下状态：失败后仍能解析下一次输入', () => {
    expect(builder.build('<svg><g></svg>')).toEqual([]);
    expect(builder.build('<svg><g/></svg>')[0]?.children[0]?.name).toBe('g');
  });

  it('每次 build 都返回新对象（纯函数，不共享可变状态）', () => {
    const first = builder.build('<svg><g/></svg>');
    const second = builder.build('<svg><g/></svg>');

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first[0]).not.toBe(second[0]);
    expect(first[0]?.children[0]).not.toBe(second[0]?.children[0]);
  });
});

describe('OutlineBuilder：不完整 XML', () => {
  const incompleteSources = [
    '<svg><g><rect/></svg>',
    '<svg',
    '<svg><g></svg>',
    '<svg><rect id="a></svg>',
    '<svg><!-- 没有闭合的注释',
    '<svg><![CDATA[ 没有闭合',
    '<svg/>tail',
    '',
  ];

  it.each(incompleteSources)('Builder 对 %j 返回空数组且不抛异常', (source) => {
    expect(() => builder.build(source)).not.toThrow();
    expect(builder.build(source)).toEqual([]);
  });

  it('扫描器本身会抛 XmlOutlineError，由调用方（Builder）捕获', () => {
    expect(() => new XmlOutlineScanner('<svg><g></svg>').parse()).toThrow(XmlOutlineError);
  });
});
