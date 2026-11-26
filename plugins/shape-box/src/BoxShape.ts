import { Container, Rect, ShapeError, TextShape } from '@svgframe/kernel';

/** `box` 在 SVG 里的类型标记。 */
export const BOX_DATA_KIND = 'box';

/**
 * 带标题的矩形框：**一个容器**，内部固定含一个矩形与一个文本。
 *
 * 它继承内核的 `Container`——因此 `move` / `scale` / `delete` / `in` 子句 /
 * 再次嵌套全部免费获得（Composite 语义），插件只负责"内部结构怎么摆"
 * 与"属性怎么落到子部件上"。
 *
 * `kind` 保持 `g`（结构树里显示 `g#n1`），类型由 `data-kind="box"` 表达，
 * 由 `(box)` 标签插件负责在树上标注——这样结构树显示与序列化都符合规范。
 */
export class BoxShape extends Container {
  /** 子部件 id 的派生规则：`<id>-rect` / `<id>-label`。 */
  static rectIdOf(id: string): string {
    return `${id}-rect`;
  }

  static labelIdOf(id: string): string {
    return `${id}-label`;
  }

  constructor(id: string) {
    super(id);
    this.setDataKind(BOX_DATA_KIND);
  }

  /** 内部的矩形框体。 */
  rectPart(): Rect {
    const rect = this.children.find((child): child is Rect => child instanceof Rect);
    if (rect === undefined) {
      throw ShapeError.invalidSvg(`box ${this.id} has no rect child`);
    }
    return rect;
  }

  /** 内部的标题文字。 */
  labelPart(): TextShape {
    const label = this.children.find((child): child is TextShape => child instanceof TextShape);
    if (label === undefined) {
      throw ShapeError.invalidSvg(`box ${this.id} has no text child`);
    }
    return label;
  }
}
