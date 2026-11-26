import type { CommandSpec, Document, EditorApp } from '@svgframe/kernel';

/**
 * `stats`：按图形类型统计。
 *
 * 规则（phase_cli_2.md §2.1）：
 * - 从画布子节点按当前子节点顺序**深度优先**遍历；
 * - 叶子按类型计数，**类型顺序按首次出现顺序**；
 * - 容器（普通 `g` 与 `box`）只计入 `containers`，根 SVG 不计入；
 * - `box` 内部叶子照常计数，`total` 是所有叶子数；
 * - 空文档输出 `(total 0, containers 0)`。
 *
 * 判断"是不是容器"用的是内核的 `isContainer()`，因此**不需要知道 `box` 存在**。
 */
export function statsOf(document: Document): string {
  const counts = new Map<string, number>();
  let containers = 0;
  let total = 0;

  for (const shape of document.shapes()) {
    if (shape.isContainer()) {
      containers += 1;
      continue;
    }
    total += 1;
    counts.set(shape.kind, (counts.get(shape.kind) ?? 0) + 1);
  }

  const parts = [...counts.entries()].map(([kind, count]) => `${kind}: ${count}`);
  const tail = `(total ${total}, containers ${containers})`;
  return parts.length === 0 ? tail : `${parts.join('  ')}  ${tail}`;
}

/**
 * 命令插件：只依赖内核，不依赖宿主，也不依赖其他插件。
 *
 * 统计不改变文档状态，因此直接读 `app.document`，不经过 `app.run`，
 * 自然也不进入 undo 栈。
 */
export class StatsCommand implements CommandSpec<EditorApp> {
  readonly name = 'stats';
  readonly usage = 'stats';
  readonly summary = '按图形类型统计叶子数量（不改变文档，不进 undo 栈）';
  readonly minArgs = 0;
  readonly maxArgs = 0;

  run(app: EditorApp): readonly string[] {
    return [statsOf(app.document)];
  }
}
