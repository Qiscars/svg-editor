import { describe, expect, it } from 'vitest';
import { ShapeError, SvgParser, SvgSerializer } from '@svgframe/kernel';
import shapeDiamond, {
  DiamondShape,
  DiamondShapeProvider,
  PolygonShape,
  PolygonShapeProvider,
} from '@svgframe/plugin-shape-diamond';
import { createTestComposition, createTestServices } from '../helpers/kernel.js';

function withDiamond(options: Record<string, unknown> = {}) {
  const composition = createTestComposition();
  // 直接用 activatePlugin 的等价路径：注册两种图形类型
  composition.services.shapes.register(new DiamondShapeProvider(undefined));
  composition.services.shapes.register(new PolygonShapeProvider());
  void options;
  return composition;
}

describe('diamond 图形插件', () => {
  it('create 生成容器 + 多边形子部件', () => {
    const { app } = withDiamond();
    app.init(400, 300);
    expect(app.createShape('diamond', 'd1', ['50', '50', '120', '80'], undefined, null)).toBe(
      'diamond#d1 created (g#d1 + polygon#d1-poly)',
    );
    const node = app.document.require('d1');
    expect(node.dataKind).toBe('diamond');
    expect(node.children.map((child) => child.id)).toEqual(['d1-poly']);
    expect(node.children[0]).toBeInstanceOf(PolygonShape);
  });

  it('顶点按菱形四角算出，顺序为上右下左', () => {
    const { app } = withDiamond();
    app.init();
    app.createShape('diamond', 'd1', ['0', '0', '100', '50'], undefined, null);
    const polygon = app.document.require('d1-poly') as PolygonShape;
    expect(polygon.points).toBe('50,0,100,25,50,50,0,25');
  });

  it('整体 move 会带动子部件顶点', () => {
    const { app } = withDiamond();
    app.init();
    app.createShape('diamond', 'd1', ['0', '0', '100', '50'], undefined, null);
    app.moveShape('d1', 10, 20);
    expect((app.document.require('d1-poly') as PolygonShape).points).toBe('60,20,110,45,60,70,10,45');
  });

  it('ungroup 被拒绝（复合图形）', () => {
    const { app } = withDiamond();
    app.init();
    app.createShape('g', 'outer', [], undefined, null);
    app.createShape('diamond', 'd1', ['0', '0', '100', '50'], undefined, 'outer');
    expect(() => app.ungroupShape('d1')).toThrowError('cannot ungroup composite shape: d1');
  });

  it('必要子部件不可被删除或移走', () => {
    const { app } = withDiamond();
    app.init();
    app.createShape('g', 'other', [], undefined, null);
    app.createShape('diamond', 'd1', ['0', '0', '100', '50'], undefined, null);

    expect(() => app.deleteShape('d1-poly')).toThrowError(/cannot detach polygon#d1-poly/);
    expect(() => app.addToGroup('other', 'd1-poly')).toThrowError(/cannot detach polygon#d1-poly/);
  });

  it('序列化写 polygon 标签，读回还原成 diamond 并保留 data-kind', () => {
    const { app, services } = withDiamond();
    app.init(400, 300);
    app.createShape('diamond', 'd1', ['50', '50', '120', '80'], undefined, null);

    const serializer = new SvgSerializer(services.shapes);
    const svg = serializer.serialize(app.document);
    expect(svg).toContain('<g id="d1" data-kind="diamond">');
    expect(svg).toContain('<polygon id="d1-poly"');

    const parsed = new SvgParser(services.shapes).parse(svg);
    const node = parsed.document.require('d1');
    expect(node).toBeInstanceOf(DiamondShape);
    expect(node.dataKind).toBe('diamond');
    expect(serializer.serialize(parsed.document)).toBe(svg);
  });

  it('读回缺子部件时拒绝整份读入', () => {
    const { services } = withDiamond();
    const broken = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">
  <g id="d1" data-kind="diamond"/>
</svg>`;
    expect(() => new SvgParser(services.shapes).parse(broken)).toThrowError(
      /diamond d1 expects exactly 1 child/,
    );
  });

  it('未装插件时 unknown shape type，读入则降级为普通 g', () => {
    const plain = createTestServices();
    expect(() => new SvgParser(plain.shapes).parse('<svg width="10" height="10"><g id="d1" data-kind="diamond"/></svg>')).not.toThrowError();

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">
  <g id="d1" data-kind="diamond"><polygon id="d1-poly" points="1,2,3,4"/></g>
</svg>`;
    const parsed = new SvgParser(plain.shapes).parse(svg);
    expect(parsed.document.require('d1').dataKind).toBeUndefined();
  });

  it('options.fill 成为模板默认色；不给 options 则没有 fill', () => {
    const withFill = createTestComposition();
    withFill.services.shapes.register(new DiamondShapeProvider('#f5a623'));
    withFill.services.shapes.register(new PolygonShapeProvider());
    withFill.app.init();
    withFill.app.createShape('diamond', 'd1', ['0', '0', '100', '50'], undefined, null);
    expect(withFill.app.document.require('d1-poly').getAttribute('fill')).toBe('#f5a623');

    const withoutFill = createTestComposition();
    withoutFill.services.shapes.register(new DiamondShapeProvider(undefined));
    withoutFill.services.shapes.register(new PolygonShapeProvider());
    withoutFill.app.init();
    withoutFill.app.createShape('diamond', 'd1', ['0', '0', '100', '50'], undefined, null);
    expect(withoutFill.app.document.require('d1-poly').getAttribute('fill')).toBeUndefined();
  });

  it('插件独立激活：不依赖其他插件', () => {
    const composition = createTestComposition({ plugins: [shapeDiamond] });
    expect(composition.errors).toEqual([]);
    expect(composition.services.shapes.has('diamond')).toBe(true);
    expect(composition.services.shapes.has('polygon')).toBe(true);
    expect(composition.services.shapes.has('box')).toBe(false);
  });

  it('插件自己的图形类型不会被内置类型覆盖', () => {
    const composition = createTestComposition({ plugins: [shapeDiamond] });
    expect(() => composition.services.shapes.register(new DiamondShapeProvider())).toThrowError(
      'duplicate registration: shapes/diamond',
    );
  });

  it('缺必要参数时报 missing parameter', () => {
    const { app } = withDiamond();
    app.init();
    expect(() => app.createShape('diamond', 'd1', ['0', '0', '100'], undefined, null)).toThrowError(
      ShapeError.missingParameter('height').message,
    );
  });
});
