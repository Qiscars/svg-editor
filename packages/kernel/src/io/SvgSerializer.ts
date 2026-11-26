import type { Document } from '../domain/Document.js';
import { Numbers } from '../domain/Numbers.js';
import type { Shape } from '../domain/Shape.js';
import type { ShapeRegistry } from '../extensions/ShapeRegistry.js';

/** 文本内容的属性名：它不是 XML 属性，而是元素内容。 */
const CONTENT_ATTRIBUTE = 'text';

/** 复合图形的类型标记属性名。 */
const DATA_KIND_ATTRIBUTE = 'data-kind';

/**
 * 把文档序列化成 SVG 文本。
 *
 * **数据驱动**：遍历 `shape.attributes()` 与图形类型注册表，不按类型写分支。
 * 标签名与 `data-kind` 都来自 `ShapeProvider` 的声明：
 * - 普通图形 `tagName` 缺省等于 `kind`；
 * - 复合图形（`box`）声明 `tagName="g"` 与 `dataKind="box"`，
 *   于是内核**不需要知道 box 存在**就能把它写成 `<g data-kind="box">`。
 */
export class SvgSerializer {
  private readonly shapes: ShapeRegistry;

  constructor(shapes: ShapeRegistry) {
    this.shapes = shapes;
  }

  serialize(document: Document): string {
    const canvas = document.canvas;
    const width = Numbers.format(canvas.width);
    const height = Numbers.format(canvas.height);

    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    ];
    for (const child of canvas.children) {
      this.writeShape(child, 1, lines);
    }
    lines.push('</svg>');
    return `${lines.join('\n')}\n`;
  }

  private writeShape(shape: Shape, depth: number, lines: string[]): void {
    const indent = '  '.repeat(depth);
    const tag = this.tagNameOf(shape);
    const attributes = this.renderAttributes(shape);
    const content = shape.getAttribute(CONTENT_ATTRIBUTE);
    const children = shape.children;

    if (children.length === 0) {
      if (content === undefined) {
        lines.push(`${indent}<${tag}${attributes}/>`);
      } else {
        lines.push(`${indent}<${tag}${attributes}>${escapeText(content)}</${tag}>`);
      }
      return;
    }

    lines.push(`${indent}<${tag}${attributes}>`);
    for (const child of children) {
      this.writeShape(child, depth + 1, lines);
    }
    lines.push(`${indent}</${tag}>`);
  }

  private tagNameOf(shape: Shape): string {
    const provider = this.shapes.find(shape.kind);
    return provider?.tagName ?? shape.kind;
  }

  /** ` id="r1" [data-kind="box"] x="10" …`，顺序由各类型的 `attributes()` 决定。 */
  private renderAttributes(shape: Shape): string {
    const parts: string[] = [` id="${escapeAttribute(shape.id)}"`];
    const dataKind = shape.dataKind;
    if (dataKind !== undefined) {
      parts.push(` ${DATA_KIND_ATTRIBUTE}="${escapeAttribute(dataKind)}"`);
    }
    for (const spec of shape.attributes()) {
      if (spec.name === CONTENT_ATTRIBUTE) {
        continue;
      }
      const value = spec.read();
      if (value !== undefined) {
        parts.push(` ${spec.name}="${escapeAttribute(value)}"`);
      }
    }
    return parts.join('');
  }
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
