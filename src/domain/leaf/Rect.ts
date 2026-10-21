import { Numbers } from '../Numbers.js';
import { Shape } from '../Shape.js';
import type { AttributeSpec } from '../Shape.js';

/** 矩形 `<rect>`：位置 + 宽高。 */
export class Rect extends Shape {
  private xValue: number;
  private yValue: number;
  private widthValue: number;
  private heightValue: number;

  constructor(id: string, x: number, y: number, width: number, height: number) {
    super(id);
    this.xValue = x;
    this.yValue = y;
    this.widthValue = width;
    this.heightValue = height;
  }

  get kind(): string {
    return 'rect';
  }

  get x(): number {
    return this.xValue;
  }

  get y(): number {
    return this.yValue;
  }

  get width(): number {
    return this.widthValue;
  }

  get height(): number {
    return this.heightValue;
  }

  move(dx: number, dy: number): void {
    this.xValue += dx;
    this.yValue += dy;
  }

  scale(factor: number): void {
    this.xValue *= factor;
    this.yValue *= factor;
    this.widthValue *= factor;
    this.heightValue *= factor;
  }

  clone(): Rect {
    const copy = new Rect(this.id, this.xValue, this.yValue, this.widthValue, this.heightValue);
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
      this.numericSpec('width', () => this.widthValue, (value) => {
        this.widthValue = value;
      }),
      this.numericSpec('height', () => this.heightValue, (value) => {
        this.heightValue = value;
      }),
    ];
  }

  protected geometryInline(): string {
    const format = Numbers.format;
    return `x=${format(this.xValue)} y=${format(this.yValue)} w=${format(this.widthValue)} h=${format(this.heightValue)}`;
  }
}
