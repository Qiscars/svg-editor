import { Numbers } from '../Numbers.js';
import { Shape } from '../Shape.js';
import type { AttributeSpec } from '../Shape.js';

/** 圆 `<circle>`：圆心 + 半径。 */
export class Circle extends Shape {
  private cxValue: number;
  private cyValue: number;
  private rValue: number;

  constructor(id: string, cx: number, cy: number, r: number) {
    super(id);
    this.cxValue = cx;
    this.cyValue = cy;
    this.rValue = r;
  }

  get kind(): string {
    return 'circle';
  }

  get cx(): number {
    return this.cxValue;
  }

  get cy(): number {
    return this.cyValue;
  }

  get r(): number {
    return this.rValue;
  }

  move(dx: number, dy: number): void {
    this.cxValue += dx;
    this.cyValue += dy;
  }

  scale(factor: number): void {
    this.cxValue *= factor;
    this.cyValue *= factor;
    this.rValue *= factor;
  }

  clone(): Circle {
    const copy = new Circle(this.id, this.cxValue, this.cyValue, this.rValue);
    this.copyStyleTo(copy);
    return copy;
  }

  protected geometryAttributes(): readonly AttributeSpec[] {
    return [
      this.numericSpec('cx', () => this.cxValue, (value) => {
        this.cxValue = value;
      }),
      this.numericSpec('cy', () => this.cyValue, (value) => {
        this.cyValue = value;
      }),
      this.numericSpec('r', () => this.rValue, (value) => {
        this.rValue = value;
      }),
    ];
  }

  protected geometryInline(): string {
    const format = Numbers.format;
    return `cx=${format(this.cxValue)} cy=${format(this.cyValue)} r=${format(this.rValue)}`;
  }
}
