import type { AttributeHandler, Shape } from '@svgframe/kernel';
import { BoxShape } from './BoxShape.js';

/**
 * `box` 的属性领域语义。
 *
 * 内核的 `set` 只知道"有个处理器认领了这个属性"，它不需要知道 `box`，
 * `label` 也不必进入内核白名单：
 *
 * | 命令 | 实际修改 |
 * |---|---|
 * | `set n1 fill red` | 内部矩形 `n1-rect` 的 `fill` |
 * | `set n1 label "开始"` | 内部文字 `n1-label` 的内容 |
 *
 * 事务性由内核负责：`SetAttributeCommand` 在执行前对整个子树拍快照，
 * 因此即便这里连改多个子部件，一次 `undo` 也整体还原。
 */
export class BoxAttributeHandler implements AttributeHandler {
  readonly name = 'box-attributes';

  handles(shape: Shape, attr: string): boolean {
    return shape instanceof BoxShape && (attr === 'fill' || attr === 'label');
  }

  apply(shape: Shape, attr: string, value: string): string {
    const box = shape as BoxShape;
    if (attr === 'fill') {
      box.rectPart().setAttribute('fill', value);
      return `${box.describeRef()} fill propagated to ${box.rectPart().id}`;
    }
    box.labelPart().setAttribute('text', value);
    return `${box.describeRef()} label updated: "${value}"`;
  }

  undoMessage(shape: Shape, attr: string): string {
    const box = shape as BoxShape;
    if (attr === 'fill') {
      const fill = box.rectPart().getAttribute('fill');
      return fill === undefined
        ? `${box.describeRef()} fill removed from ${box.rectPart().id}`
        : `${box.describeRef()} fill restored to ${box.rectPart().id} (${fill})`;
    }
    return `${box.describeRef()} label restored: "${box.labelPart().content}"`;
  }
}
