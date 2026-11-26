import type { TreeDecorator, TreeRowContext } from '@svgframe/kernel';
import { BOX_DATA_KIND } from './BoxShape.js';

/**
 * 结构树上的 `(box)` 类型标注。
 *
 * 它只读 `shape.dataKind`——一个内核早就有的通用标记，因此
 * **不依赖 shape-box 的任何类型**，也不需要渲染器为它改动。
 */
export class BoxTypeLabel implements TreeDecorator {
  readonly name = 'box-type-label';

  decorate(row: TreeRowContext): string | undefined {
    return row.shape.dataKind === BOX_DATA_KIND ? '(box)' : undefined;
  }
}
