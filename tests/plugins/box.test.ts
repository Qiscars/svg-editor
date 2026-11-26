import { describe, expect, it } from 'vitest';
import { FileGateway, ShapeError, SvgParser, SvgSerializer } from '@svgframe/kernel';
import { TreeRenderer } from '@svgframe/host';
import shapeBox from '@svgframe/plugin-shape-box';
import { createTestComposition, createTestServices } from '../helpers/kernel.js';

/** 内存文件系统，避免测试碰真实磁盘。 */
class MemoryGateway extends FileGateway {
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
}

function withBox() {
  const files = new MemoryGateway();
  return { ...createTestComposition({ plugins: [shapeBox], files }), files };
}

const BOX_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <g id="n1" data-kind="box">
    <rect id="n1-rect" x="120" y="100" width="160" height="60"/>
    <text id="n1-label" x="140" y="135">开始</text>
  </g>
</svg>
`;

describe('box 图形插件', () => {
  it('create 生成容器 + 两个子部件，消息里报出派生 id', () => {
    const { app } = withBox();
    app.init(800, 600);
    expect(app.createShape('box', 'n1', ['120', '100', '160', '60', '开始'], undefined, null)).toBe(
      'box#n1 created (g#n1 + rect#n1-rect + text#n1-label)',
    );
    expect(app.document.require('n1').children.map((s) => s.id)).toEqual(['n1-rect', 'n1-label']);
  });

  it('支持 in 子句与整体 move（Composite 语义）', () => {
    const { app } = withBox();
    app.init(800, 600);
    app.createShape('g', 'outer', [], undefined, null);
    app.createShape('box', 'n1', ['0', '0', '100', '40', 'A'], undefined, 'outer');
    app.moveShape('n1', 10, 20);
    expect(app.document.require('n1-rect').describeInline()).toBe('x=10 y=20 w=100 h=40');
  });

  it('ungroup 被拒绝（内部结构归插件所有）', () => {
    const { app } = withBox();
    app.init();
    app.createShape('g', 'outer', [], undefined, null);
    app.createShape('box', 'n1', ['0', '0', '100', '40', 'A'], undefined, 'outer');
    expect(() => app.ungroupShape('n1')).toThrowError('cannot ungroup composite shape: n1');
  });

  it('set fill 传播到内部矩形，构成一个 undo 单元', () => {
    const { app } = withBox();
    app.init();
    app.createShape('box', 'n1', ['0', '0', '100', '40', 'A'], undefined, null);

    expect(app.setAttribute('n1', 'fill', '#f5a623')).toBe('box#n1 fill propagated to n1-rect');
    expect(app.document.require('n1-rect').getAttribute('fill')).toBe('#f5a623');

    expect(app.undo()).toContain('fill');
    expect(app.document.require('n1-rect').getAttribute('fill')).toBeUndefined();

    app.redo();
    expect(app.document.require('n1-rect').getAttribute('fill')).toBe('#f5a623');
  });

  it('set label 改写内部文字，undo/redo 各一次即可整体还原', () => {
    const { app } = withBox();
    app.init();
    app.createShape('box', 'n1', ['0', '0', '100', '40', '开始'], undefined, null);

    expect(app.setAttribute('n1', 'label', '处理数据 v2')).toBe('box#n1 label updated: "处理数据 v2"');
    expect(app.undo()).toBe('box#n1 label restored: "开始"');
    expect(app.document.require('n1-label').getAttribute('text')).toBe('开始');

    app.redo();
    expect(app.document.require('n1-label').getAttribute('text')).toBe('处理数据 v2');
  });

  it('label 不在内核白名单里，普通图形设置它会报 unknown attribute', () => {
    const { app } = withBox();
    app.init();
    app.createShape('rect', 'r1', ['0', '0', '10', '10'], undefined, null);
    expect(() => app.setAttribute('r1', 'label', 'x')).toThrowError('unknown attribute: label');
  });

  it('子部件 id 冲突时整条命令失败，不留半成品', () => {
    const { app } = withBox();
    app.init();
    app.createShape('rect', 'n1-rect', ['0', '0', '1', '1'], undefined, null);

    expect(() => app.createShape('box', 'n1', ['0', '0', '100', '40', 'A'], undefined, null)).toThrowError(
      'id already exists: n1-rect',
    );
    expect(app.document.has('n1')).toBe(false);
    expect(app.document.has('n1-label')).toBe(false);
  });

  it('删除/移走必要子部件被拒绝', () => {
    const { app } = withBox();
    app.init();
    app.createShape('g', 'other', [], undefined, null);
    app.createShape('box', 'n1', ['0', '0', '100', '40', 'A'], undefined, null);

    expect(() => app.deleteShape('n1-rect')).toThrowError(/cannot detach rect#n1-rect/);
    expect(() => app.addToGroup('other', 'n1-label')).toThrowError(/cannot detach text#n1-label/);
    expect(app.document.has('n1-rect')).toBe(true);
  });

  it('序列化写 data-kind，读回还原成 box', () => {
    const { app, services, files } = withBox();
    app.init(800, 600);
    app.createShape('box', 'n1', ['120', '100', '160', '60', '开始'], undefined, null);
    files.write('b.svg', new SvgSerializer(services.shapes).serialize(app.document));

    const svg = files.read('b.svg');
    expect(svg).toContain('<g id="n1" data-kind="box">');

    const parsed = new SvgParser(services.shapes).parse(svg);
    const box = parsed.document.require('n1');
    expect(box.dataKind).toBe('box');
    expect(box.children.map((child) => child.id)).toEqual(['n1-rect', 'n1-label']);
  });

  it('未装插件时读回降级为普通 g（功能不损、语义降级）', () => {
    const plain = createTestServices();
    const parsed = new SvgParser(plain.shapes).parse(BOX_SVG);
    const node = parsed.document.require('n1');
    expect(node.dataKind).toBeUndefined();
    expect(node.children).toHaveLength(2);
  });

  it('已装插件但子部件缺失时拒绝整份读入，原文档保持不变', () => {
    const { app, services } = withBox();
    app.init(400, 300);
    app.createShape('rect', 'keep', ['0', '0', '10', '10'], undefined, null);

    const broken = BOX_SVG.replace('<text id="n1-label" x="140" y="135">开始</text>', '');
    expect(() => new SvgParser(services.shapes).parse(broken)).toThrowError(/box n1 expects exactly 2 children/);
    // 解析失败不会碰当前文档
    expect(app.document.has('keep')).toBe(true);
  });

  it('重复 id 在已装插件时仍然被拒绝（不能靠降级掩盖）', () => {
    const { services } = withBox();
    const duplicated = BOX_SVG.replace('<rect id="n1-rect"', '<rect id="dup"').replace(
      '<text id="n1-label"',
      '<text id="dup"',
    );
    expect(() => new SvgParser(services.shapes).parse(duplicated)).toThrowError(/box n1 is missing/);
  });
});

describe('(box) 树标签', () => {
  it('box 行追加 (box)，普通 g 不追加', () => {
    const { app, services } = withBox();
    app.init(400, 300);
    app.createShape('box', 'n1', ['0', '0', '100', '40', 'A'], undefined, null);
    app.createShape('g', 'plain', [], undefined, null);

    const lines = new TreeRenderer(services.decorators).render(app.document);
    expect(lines.some((line) => line.includes('g#n1 (box)'))).toBe(true);
    expect(lines.some((line) => line.includes('g#plain (box)'))).toBe(false);
  });
});
