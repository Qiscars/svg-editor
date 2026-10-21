import { Numbers } from '../Numbers.js';
import { Shape } from '../Shape.js';
import type { AttributeSpec } from '../Shape.js';

/** 椭圆 `<ellipse>`：圆心 + 两个半径。 */
export class Ellipse extends Shape {
  private cxValue: number;
  private cyValue: number;
  private rxValue: number;
  private ryValue: number;

  constructor(id: string, cx: number, cy: number, rx: number, ry: number) {
    super(id);
    this.cxValue = cx;
    this.cyValue = cy;
    this.rxValue = rx;
    this.ryValue = ry;
  }

  get kind(): string {
    return 'ellipse';
  }

  get cx(): number {
    return this.cxValue;
  }

  get cy(): number {
    return this.cyValue;
  }

  get rx(): number {
    return this.rxValue;
  }

  get ry(): number {
    return this.ryValue;
  }

  move(dx: number, dy: number): void {
    this.cxValue += dx;
    this.cyValue += dy;
  }

  scale(factor: number): void {
    this.cxValue *= factor;
    this.cyValue *= factor;
    this.rxValue *= factor;
    this.ryValue *= factor;
  }

  clone(): Ellipse {
    const copy = new Ellipse(this.id, this.cxValue, this.cyValue, this.rxValue, this.ryValue);
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
      this.numericSpec('rx', () => this.rxValue, (value) => {
        this.rxValue = value;
      }),
      this.numericSpec('ry', () => this.ryValue, (value) => {
        this.ryValue = value;
      }),
    ];
  }

  protected geometryInline(): string {
    const format = Numbers.format;
    return `cx=${format(this.cxValue)} cy=${format(this.cyValue)} rx=${format(this.rxValue)} ry=${format(this.ryValue)}`;
  }
}
