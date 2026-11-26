import type { Document, Shape, TreeDecorator, TreeRowContext } from '@svgframe/kernel';

/**
 * 一个节点的"自身内容指纹"：类型 + 自身属性 + 文本内容。
 *
 * **不含子节点**——否则改一个叶子会把整条祖先链都标脏，
 * 与"只标真正变化的行 + 根节点汇总"的设计不符（见 ADR-3）。
 */
function fingerprint(shape: Shape): string {
  const attributes = shape
    .attributes()
    .map((spec) => `${spec.name}=${spec.read() ?? ''}`)
    .join(';');
  return `${shape.kind}|${shape.dataKind ?? ''}|${attributes}`;
}

/**
 * `modified-star`：为「自上次保存以来内容有变化」的行追加 `*`。
 *
 * 语义选择（其余两种见 ADR-3）：
 * - 判据是**内容是否与上次保存一致**，而不是"发生过编辑命令"。
 *   于是 `undo` 回到保存点时 `*` 会消失，`redo` 之后又出现；
 * - **祖先容器不标 `*`，只有根行汇总**：中间层容器如果也标，
 *   一次深层修改会让整条路径都是星号，反而看不出改了哪里；
 * - 新建节点在保存之前一律算脏。
 *
 * 状态（上次保存时的指纹表）封装在**实例字段**里，不用模块级变量，
 * 因此同一进程里多个编辑器实例互不影响。
 */
export class ModifiedStarDecorator implements TreeDecorator {
  readonly name = 'modified-star';

  /** 上次保存（或读入/新建）时，每个图形的自身指纹 */
  private saved = new Map<string, string>();

  decorate(row: TreeRowContext): string | undefined {
    if (row.isRoot) {
      return this.documentDirty(row.document) ? '*' : undefined;
    }
    return this.saved.get(row.shape.id) === fingerprint(row.shape) ? undefined : '*';
  }

  /** 保存成功后，把当前状态记为新的基线。 */
  onDocumentSaved(document: Document): void {
    this.markClean(document);
  }

  /** `init` / `read` 之后同样视为基线（读入的内容与磁盘一致）。 */
  onDocumentLoaded(document: Document): void {
    this.markClean(document);
  }

  private markClean(document: Document): void {
    const next = new Map<string, string>();
    for (const shape of document.shapes()) {
      next.set(shape.id, fingerprint(shape));
    }
    this.saved = next;
  }

  private documentDirty(document: Document): boolean {
    let seen = 0;
    for (const shape of document.shapes()) {
      if (this.saved.get(shape.id) !== fingerprint(shape)) {
        return true;
      }
      seen += 1;
    }
    // 有节点被删除：当前数量少于基线
    return seen !== this.saved.size;
  }
}
