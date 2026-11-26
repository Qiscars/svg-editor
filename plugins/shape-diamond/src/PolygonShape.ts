import { Numbers, Shape } from '@svgframe/kernel';
import type { AttributeSpec, Point } from '@svgframe/kernel';

/**
 * `<polygon>`：本项目里由 `diamond` 插件引入的新图形类型。
 *
 * 它说明一件事：**内核不认识这类图形也能完整工作**——
 * 序列化的标签名、属性表、结构树里的行内摘要，全部由插件声明。
 */
export class PolygonShape extends Shape {
  private pointsValue: string;

  constructor(id: string, points: string) {
    super(id);
    this.pointsValue = points;
  }

  get kind(): string {
    return 'polygon';
  }

  get points(): string {
    return this.pointsValue;
  }

  /**
   * 多边形按 `points` 缩放：把每个顶点坐标乘上系数。
   * 点数不是偶数时保留原值（不猜结构）。
   */
  scale(factor: number): void {
    const numbers = this.pointsValue.split(/[\s,]+/).filter((part) => part !== '');
    if (numbers.length % 2 !== 0) {
      return;
    }
    const scaled = numbers.map((part, index) => {
      const value = Number(part);
      return Number.isFinite(value) ? Numbers.format(value * factor) : part;
    });
    this.pointsValue = scaled.join(',');
  }

  /** 顶点包围盒的中心不好算，这里用第一个顶点作为代表点。 */
  override anchorPoint(): Point {
    const [first, second] = this.pointsValue.split(/[\s,]+/);
    const x = Number(first);
    const y = Number(second);
    return {
      x: Number.isFinite(x) ? x : 0,
      y: Number.isFinite(y) ? y : 0,
    };
  }

  clone(): PolygonShape {
    const copy = new PolygonShape(this.id, this.pointsValue);
    this.copyStyleTo(copy);
    return copy;
  }

  override move(dx: number, dy: number): void {
    const numbers = this.pointsValue.split(/[\s,]+/).filter((part) => part !== '');
    if (numbers.length % 2 !== 0) {
      return;
    }
    const moved = numbers.map((part, index) => {
      const value = Number(part);
      if (!Number.isFinite(value)) {
        return part;
      }
      return Numbers.format(value + (index % 2 === 0 ? dx : dy));
    });
    this.pointsValue = moved.join(',');
  }

  protected geometryAttributes(): readonly AttributeSpec[] {
    return [
      {
        name: 'points',
        read: () => this.pointsValue,
        write: (raw) => {
          this.pointsValue = raw;
        },
        // 几何属性恒有值，清理是空操作（与内核内置类型的约定一致）
        clear: () => undefined,
      },
    ];
  }

  protected geometryInline(): string {
    return `points=${this.pointsValue}`;
  }
}
