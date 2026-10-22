import type { Container } from '../domain/Container.js';
import { Document } from '../domain/Document.js';
import type { Shape } from '../domain/Shape.js';
import { ShapeError } from '../domain/ShapeError.js';
import { ShapeFactory } from '../registry/ShapeFactory.js';
import { XmlElement } from './xml/XmlElement.js';
import { XmlParser } from './xml/XmlParser.js';

export interface ParseResult {
  readonly document: Document;
  /** 需要提示给用户的行（不带 `warning: ` 前缀，前缀由表现层加）。 */
  readonly warnings: readonly string[];
}

/**
 * SVG 文本 → `Document`。
 *
 * 两件容易做错的事在这里被显式处理：
 * 1. **缺 id 自动补名**：按「标签名 + 序号」补，且必须在**扫描完所有显式 id 之后**再生成，
 *    否则文件里若先出现无名的 `<rect>`、后出现 `id="rect1"`，就会撞名；
 * 2. **不认识的元素**（`<defs>`、`<style>`、`<title>` 等）直接跳过，
 *    而不是让整份文件解析失败——编辑器的目标是能编辑图形部分。
 */
export class SvgParser {
  private readonly factory: ShapeFactory;

  constructor(factory: ShapeFactory = ShapeFactory.createDefault()) {
    this.factory = factory;
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

    const visit = (element: XmlElement, parent: Container): void => {
      for (const child of element.children) {
        if (!this.factory.has(child.tagName)) {
          continue;
        }
        const definition = this.factory.require(child.tagName);
        const values = definition.parameters.map((name) => parameterOf(child, name));

        const explicitId = child.attribute('id');
        let id = explicitId;
        if (id === undefined || id.trim() === '') {
          id = nextGeneratedId(child.tagName, taken, counters);
          warnings.push(`assigned id ${id} to unnamed <${child.tagName}>`);
        }

        const shape = this.factory.create(child.tagName, id, values);
        applyNonGeometryAttributes(shape, child, definition.parameters);
        document.attach(parent, shape);

        // 只有容器需要往下递归。判断依据是标签名，这属于 io 层的职责
        // （io 本来就是唯一认识 SVG 标签的地方）。
        if (child.tagName === 'g') {
          visit(child, document.requireContainer(id));
        }
      }
    };

    visit(root, document.canvas);
    return { document, warnings };
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

/** 参数取值：`text` 取元素内容，其余取同名属性，缺失的几何属性按 0 处理。 */
function parameterOf(element: XmlElement, name: string): string {
  if (name === 'text') {
    return element.text;
  }
  return element.attribute(name) ?? '0';
}

/** 把 fill / stroke / stroke-width 等非几何属性套到刚建好的图形上。 */
function applyNonGeometryAttributes(
  shape: Shape,
  element: XmlElement,
  parameters: readonly string[],
): void {
  const settable = shape.settableAttributes();
  for (const [name, value] of element.attributes) {
    if (name === 'id' || parameters.includes(name) || !settable.includes(name)) {
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
