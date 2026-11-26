import type { Document } from '@svgframe/kernel';
import type { Shape } from '@svgframe/kernel';
import type { TreeDecoratorRegistry } from '@svgframe/kernel';

interface Row {
  readonly lead: string;
  readonly connector: string;
  readonly ref: string;
  readonly inline: string;
  readonly shape: Shape;
  readonly depth: number;
}

/**
 * `tree` 的结构树渲染。
 *
 * Phase 2 的变化只有一处：每行末尾追加 `TreeDecoratorRegistry` 给出的标签。
 * 渲染器**不认识任何标签**，新增 `*` 或 `(box)` 都不需要改这里
 * （判据：新增标签时内核与渲染器的差异为 0）。
 *
 * 没有注册任何标签时，输出与 Phase 1 逐字节一致。
 *
 * 对齐算法：所有**带属性**的行统一对齐到同一列，列宽 = 最宽（前缀 + id） + 2，
 * 且至少留 1 个空格。作业 §5.1 的两个示例彼此矛盾，本实现与例 1 逐字一致。
 */
export class TreeRenderer {
  private readonly decorators: TreeDecoratorRegistry;

  constructor(decorators: TreeDecoratorRegistry) {
    this.decorators = decorators;
  }

  render(document: Document, rootId?: string): readonly string[] {
    const rows: Row[] = [];
    const lines: string[] = [];

    if (rootId === undefined) {
      const label = this.decorators.labelFor(document, document.canvas, 0, true);
      lines.push(label === '' ? document.canvas.describeHeader() : `${document.canvas.describeHeader()} ${label}`);
      const children = document.canvas.children;
      children.forEach((child, index) => {
        this.collect(child, '', index === children.length - 1 ? '└── ' : '├── ', 1, rows);
      });
    } else {
      const root = document.require(rootId);
      this.collect(root, '', '', 0, rows);
    }

    const column = rows.reduce(
      (widest, row) =>
        row.inline === '' ? widest : Math.max(widest, (row.lead + row.connector + row.ref).length),
      0,
    ) + 2;

    for (const row of rows) {
      const head = `${row.lead}${row.connector}${row.ref}`;
      let line: string;
      if (row.inline === '') {
        line = head;
      } else {
        // 至少一个空格：id 特别长时宁可让这一行溢出，也不要把属性挤到 id 上
        const padding = Math.max(column - head.length, 1);
        line = `${head}${' '.repeat(padding)}${row.inline}`;
      }
      const label = this.decorators.labelFor(document, row.shape, row.depth, false);
      lines.push(label === '' ? line : `${line} ${label}`);
    }
    return lines;
  }

  private collect(shape: Shape, lead: string, connector: string, depth: number, rows: Row[]): void {
    rows.push({
      lead,
      connector,
      ref: shape.describeTreeRef(),
      inline: shape.describeInline(),
      shape,
      depth,
    });

    const childLead = lead + (connector === '' ? '' : connector.startsWith('└') ? '    ' : '│   ');
    const children = shape.children;
    children.forEach((child, index) => {
      this.collect(child, childLead, index === children.length - 1 ? '└── ' : '├── ', depth + 1, rows);
    });
  }
}
