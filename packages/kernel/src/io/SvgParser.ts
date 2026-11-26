import { Container } from '../domain/Container.js';
import { Document } from '../domain/Document.js';
import type { Shape } from '../domain/Shape.js';
import { ShapeError } from '../domain/ShapeError.js';
import type { ShapeProvider } from '../extensions/ShapeProvider.js';
import type { ShapeRegistry } from '../extensions/ShapeRegistry.js';
import { XmlElement } from './xml/XmlElement.js';
import { XmlParser } from './xml/XmlParser.js';

export interface ParseResult {
  readonly document: Document;
  /** 需要提示给用户的行（不带 `warning: ` 前缀，前缀由表现层加）。 */
  readonly warnings: readonly string[];
}

const DATA_KIND_ATTRIBUTE = 'data-kind';

/**
 * SVG 文本 → `Document`。
 *
 * Phase 2 的关键变化：**解析器不认识任何图形类型**。
 * 它按 `data-kind` / 标签名去 `ShapeRegistry` 问"谁是这种元素"，
 * 再由 `ShapeProvider` 负责构造与（复合图形的）读回还原。
 *
 * 因此：
 * - 装上 `box` 插件 → `<g data-kind="box">` 被还原成复合图形；
 * - 没装 → `data-kind` 找不到提供者，回落成普通 `<g>`，语义降级但功能不损；
 * - 插件在还原时抛错 → 整份读入被拒绝，**原文档保持不变**（`Document` 是新建的，
 *   只有全部成功才由调用方替换当前文档）。
 *
 * 解析先建**游离**的子树、最后才 `attach` 到文档，因此 id 冲突时不会留下半个文档。
 */
export class SvgParser {
  private readonly shapes: ShapeRegistry;

  constructor(shapes: ShapeRegistry) {
    this.shapes = shapes;
  }

  parse(source: string): ParseResult {
    const root = this.parseXml(source);
    if (root.tagName !== 'svg') {
      throw ShapeError.invalidSvg(`root element is <${root.tagName}>, expected <svg>`);
    }

    const { width, height } = readCanvasSize(root);
    const document = new Document(width, height);

    const taken = new Set<string>();
    collectExplicitIds(root, taken);
    const counters = new Map<string, number>();
    const warnings: string[] = [];

    const build = (element: XmlElement): Shape | undefined => {
      const provider = this.providerFor(element);
      if (provider === undefined) {
        return undefined;
      }
      const id = this.resolveId(element, taken, counters, warnings);
      const children: Shape[] = [];
      for (const child of element.children) {
        const built = build(child);
        if (built !== undefined) {
          children.push(built);
        }
      }
      return this.instantiate(provider, element, id, children);
    };

    for (const child of root.children) {
      const shape = build(child);
      if (shape !== undefined) {
        document.attach(document.canvas, shape);
      }
    }

    return { document, warnings };
  }

  /** `data-kind` 优先；没有或没人认领时按标签名找。 */
  private providerFor(element: XmlElement): ShapeProvider | undefined {
    const dataKind = element.attribute(DATA_KIND_ATTRIBUTE);
    if (dataKind !== undefined) {
      const specialized = this.shapes.forDataKind(dataKind);
      if (specialized !== undefined) {
        return specialized;
      }
    }
    return this.shapes.forTag(element.tagName);
  }

  private instantiate(
    provider: ShapeProvider,
    element: XmlElement,
    id: string,
    children: readonly Shape[],
  ): Shape {
    const attributes = new Map(element.attributes);

    if (provider.composite === true && provider.restore !== undefined) {
      // 复合图形：先把子节点装进一个临时容器，交给插件还原成它自己的类型
      const shell = new Container(id);
      for (const child of children) {
        shell.appendChild(child);
      }
      return provider.restore({ id, attributes, children: [...shell.children] });
    }

    const values = provider.parameters.map((name) =>
      name === 'text' ? element.text : (element.attribute(name) ?? '0'),
    );
    const shape = provider.build(id, values);
    applyStyleAttributes(shape, element, provider.parameters);
    if (shape instanceof Container) {
      for (const child of children) {
        shape.appendChild(child);
      }
    }
    return shape;
  }

  private resolveId(
    element: XmlElement,
    taken: Set<string>,
    counters: Map<string, number>,
    warnings: string[],
  ): string {
    const explicit = element.attribute('id');
    if (explicit !== undefined && explicit.trim() !== '') {
      return explicit;
    }
    const id = nextGeneratedId(element.tagName, taken, counters);
    warnings.push(`assigned id ${id} to unnamed <${element.tagName}>`);
    return id;
  }

  private parseXml(source: string): XmlElement {
    try {
      return new XmlParser().parse(source);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw ShapeError.invalidSvg(detail);
    }
  }
}

/** 把 fill / stroke / stroke-width 等非几何属性套到刚建好的图形上。 */
function applyStyleAttributes(
  shape: Shape,
  element: XmlElement,
  parameters: readonly string[],
): void {
  const settable = shape.settableAttributes();
  for (const [name, value] of element.attributes) {
    if (name === 'id' || name === DATA_KIND_ATTRIBUTE || parameters.includes(name) || !settable.includes(name)) {
      continue;
    }
    shape.setAttribute(name, value);
  }
}

function collectExplicitIds(element: XmlElement, taken: Set<string>): void {
  const id = element.attribute('id');
  if (id !== undefined && id.trim() !== '') {
    taken.add(id);
  }
  for (const child of element.children) {
    collectExplicitIds(child, taken);
  }
}

function nextGeneratedId(
  tagName: string,
  taken: Set<string>,
  counters: Map<string, number>,
): string {
  let sequence = counters.get(tagName) ?? 0;
  let candidate = '';
  do {
    sequence += 1;
    candidate = `${tagName}${sequence}`;
  } while (taken.has(candidate));
  counters.set(tagName, sequence);
  taken.add(candidate);
  return candidate;
}

function readCanvasSize(root: XmlElement): { width: number; height: number } {
  const viewBox = (root.attribute('viewBox') ?? '').split(/[\s,]+/).map(Number);
  const width = parseLength(root.attribute('width')) ?? viewBox[2] ?? 800;
  const height = parseLength(root.attribute('height')) ?? viewBox[3] ?? 600;
  return { width, height };
}

/** `400` / `400px` → 400；`100%` 这类无法静态求值的长度返回 undefined。 */
function parseLength(raw: string | undefined): number | undefined {
  if (raw === undefined) {
    return undefined;
  }
  const match = /^\s*(-?\d+(?:\.\d+)?)\s*(px)?\s*$/.exec(raw);
  return match?.[1] === undefined ? undefined : Number(match[1]);
}
