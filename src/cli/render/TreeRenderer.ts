import type { Document } from '../../domain/Document.js';
import type { Shape } from '../../domain/Shape.js';

interface Row {
  readonly lead: string;
  readonly connector: string;
  readonly ref: string;
  readonly inline: string;
}

/**
 * `tree` 的结构树渲染。
 *
 * **属性必须内联**（作业 §5.1）：只显示 id 的树无法脱离画布工作，
 * 因为看不出图形在哪儿、多大。
 *
 * 对齐算法：所有**带属性**的行统一对齐到同一列，列宽 = 最宽（前缀 + id） + 2，
 * 且至少留 1 个空格。作业 §5.1 的两个示例彼此矛盾（例 1 的属性列在第 19 列、
 * 例 6.1 在第 29 列，用同一套算法推不出来），本实现与例 1 逐字一致，
 * 例 6.1 会宽 3 列——两例无法同时复现，取舍已记入 doc/README.md §2。
 */
export class TreeRenderer {
  render(document: Document, rootId?: string): readonly string[] {
    const rows: Row[] = [];
    const lines: string[] = [];

    if (rootId === undefined) {
      lines.push(document.canvas.describeHeader());
      const children = document.canvas.children;
      children.forEach((child, index) => {
        this.collect(child, '', index === children.length - 1 ? '└── ' : '├── ', rows);
      });
    } else {
      const root = document.require(rootId);
      this.collect(root, '', '', rows);
    }

    const column = rows.reduce(
      (widest, row) =>
        row.inline === '' ? widest : Math.max(widest, (row.lead + row.connector + row.ref).length),
      0,
    ) + 2;

    for (const row of rows) {
      const head = `${row.lead}${row.connector}${row.ref}`;
      if (row.inline === '') {
        lines.push(head);
        continue;
      }
      // 至少一个空格：id 特别长时宁可让这一行溢出，也不要把属性挤到 id 上
      const padding = Math.max(column - head.length, 1);
      lines.push(`${head}${' '.repeat(padding)}${row.inline}`);
    }
    return lines;
  }

  private collect(shape: Shape, lead: string, connector: string, rows: Row[]): void {
    rows.push({ lead, connector, ref: shape.describeRef(), inline: shape.describeInline() });

    const childLead =
      lead + (connector === '' ? '' : connector.startsWith('└') ? '    ' : '│   ');
    const children = shape.children;
    children.forEach((child, index) => {
      this.collect(child, childLead, index === children.length - 1 ? '└── ' : '├── ', rows);
    });
  }
}
