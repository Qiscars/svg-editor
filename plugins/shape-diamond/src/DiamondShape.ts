import { Container } from '@svgframe/kernel';

/** `diamond` 在 SVG 里的类型标记。 */
export const DIAMOND_DATA_KIND = 'diamond';

/**
 * 菱形：一个容器 + 一个多边形子部件。
 *
 * 与 `box` 同构（Composite 语义），但用的是另一种叶子类型，
 * 用来验证「复合图形的机制不只对某一种组合有效」。
 */
export class DiamondShape extends Container {
  static polygonIdOf(id: string): string {
    return `${id}-poly`;
  }

  constructor(id: string) {
    super(id);
    this.setDataKind(DIAMOND_DATA_KIND);
  }
}
