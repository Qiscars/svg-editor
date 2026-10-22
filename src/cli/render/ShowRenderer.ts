import type { Shape } from '../../domain/Shape.js';

/**
 * `show` 的单个图形明细（作业 §5.2）：
 *
 * ```text
 * circle#c1  parent=g#markers
 *   cx=100 cy=100 r=20
 *   fill=red
 * ```
 *
 * 第一行标出**父节点**，因为 id 只有在层级里才有意义；
 * 之后的属性行由图形自己给出（`describeDetailLines`），
 * 不同类型显示不同几何属性，这里不做任何按类型的分支。
 */
export class ShowRenderer {
  render(shape: Shape): readonly string[] {
    const parent = shape.parent;
    const parentLabel = parent === null ? 'parent=none' : `parent=${parent.describeRef()}`;
    return [
      `${shape.describeRef()}  ${parentLabel}`,
      ...shape.describeDetailLines().map((line) => `  ${line}`),
    ];
  }
}
