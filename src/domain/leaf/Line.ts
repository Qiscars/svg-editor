import { Numbers } from '../Numbers.js';
import { Shape } from '../Shape.js';
import type { AttributeSpec, Point } from '../Shape.js';

/** 线段 `<line>`：两个端点。 */
export class Line extends Shape {
  private x1Value: number;
  private y1Value: number;
  private x2Value: number;
  private y2Value: number;

  constructor(id: string, x1: number, y1: number, x2: number, y2: number) {
    super(id);
    this.x1Value = x1;
    this.y1Value = y1;
    this.x2Value = x2;
    this.y2Value = y2;
  }

  get kind(): string {
    return 'line';
  }

  get x1(): number {
    return this.x1Value;
  }

  get y1(): number {
    return this.y1Value;
  }

  get x2(): number {
    return this.x2Value;
  }

  get y2(): number {
    return this.y2Value;
  }

  move(dx: number, dy: number): void {
    this.x1Value += dx;
    this.y1Value += dy;
    this.x2Value += dx;
    this.y2Value += dy;
  }

  /** 线段的代表点是起点。 */
  override anchorPoint(): Point {
    return { x: this.x1Value, y: this.y1Value };
  }

  scale(factor: number): void {
    this.x1Value *= factor;
    this.y1Value *= factor;
    this.x2Value *= factor;
    this.y2Value *= factor;
  }

  clone(): Line {
    const copy = new Line(this.id, this.x1Value, this.y1Value, this.x2Value, this.y2Value);
    this.copyStyleTo(copy);
    return copy;
  }

  protected geometryAttributes(): readonly AttributeSpec[] {
    return [
      this.numericSpec('x1', () => this.x1Value, (value) => {
        this.x1Value = value;
      }),
      this.numericSpec('y1', () => this.y1Value, (value) => {
        this.y1Value = value;
      }),
      this.numericSpec('x2', () => this.x2Value, (value) => {
        this.x2Value = value;
      }),
      this.numericSpec('y2', () => this.y2Value, (value) => {
        this.y2Value = value;
      }),
    ];
  }

  protected geometryInline(): string {
    return `${Numbers.formatPoint(this.x1Value, this.y1Value)} -> ${Numbers.formatPoint(this.x2Value, this.y2Value)}`;
  }
}
