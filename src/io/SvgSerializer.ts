import type { Document } from '../domain/Document.js';
import { Numbers } from '../domain/Numbers.js';
import type { Shape } from '../domain/Shape.js';

/** 文本内容的属性名：它不是 XML 属性，而是元素内容。 */
const CONTENT_ATTRIBUTE = 'text';

/**
 * 把文档序列化成 SVG 文本。
 *
 * **数据驱动**：遍历 `shape.attributes()`，不按类型写分支、也没有 `switch (tag)`。
 * 每个类型需要写出来的属性由它自己声明，序列化器只负责排版与转义。
 *
 * 这里与 `doc/README.md §1.2 ④` 最初写的"`Shape.toSvgElement()` 由子类实现"不同：
 * 那种做法会让 `domain` 依赖 XML 概念，与 §1.3「domain 不认识 XML」直接冲突。
 * 改为序列化器读属性表后，领域层仍然零 XML 知识，见 §5 修订记录 v1.2。
 */
export class SvgSerializer {
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
    const tag = shape.kind;
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

  /** ` id="r1" x="10" y="20" …`，顺序由各类型的 `attributes()` 决定。 */
  private renderAttributes(shape: Shape): string {
    const parts: string[] = [` id="${escapeAttribute(shape.id)}"`];
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
