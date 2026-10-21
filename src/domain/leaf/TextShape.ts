import { Numbers } from '../Numbers.js';
import { Shape } from '../Shape.js';
import type { AttributeSpec } from '../Shape.js';

/**
 * 文字 `<text>`：插入点 + 文本内容。
 *
 * 注意内容不是属性而是**子文本**（作业 §0.1 表格），所以序列化时它要成为元素内容。
 * 这里把它建模成名为 `text` 的普通属性（`set t1 text "..."` 可直接写），
 * 由序列化层决定把它写成元素内容而不是 XML 属性。
 */
export class TextShape extends Shape {
  private xValue: number;
  private yValue: number;
  private contentValue: string;

  constructor(id: string, x: number, y: number, content: string) {
    super(id);
    this.xValue = x;
    this.yValue = y;
    this.contentValue = content;
  }

  get kind(): string {
    return 'text';
  }

  get x(): number {
    return this.xValue;
  }

  get y(): number {
    return this.yValue;
  }

  /** 文本内容，`set <id> text "..."` 的读取端。 */
  get content(): string {
    return this.contentValue;
  }

  move(dx: number, dy: number): void {
    this.xValue += dx;
    this.yValue += dy;
  }

  scale(factor: number): void {
    this.xValue *= factor;
    this.yValue *= factor;
  }

  clone(): TextShape {
    const copy = new TextShape(this.id, this.xValue, this.yValue, this.contentValue);
    this.copyStyleTo(copy);
    return copy;
  }

  protected geometryAttributes(): readonly AttributeSpec[] {
    return [
      this.numericSpec('x', () => this.xValue, (value) => {
        this.xValue = value;
      }),
      this.numericSpec('y', () => this.yValue, (value) => {
        this.yValue = value;
      }),
      this.stringSpec('text', () => this.contentValue, (value) => {
        this.contentValue = value;
      }),
    ];
  }

  protected geometryInline(): string {
    return `${Numbers.formatPoint(this.xValue, this.yValue)} "${this.contentValue}"`;
  }
}
