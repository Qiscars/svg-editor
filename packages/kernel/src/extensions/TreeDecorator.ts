import type { Document } from '../domain/Document.js';
import type { Shape } from '../domain/Shape.js';

/** 渲染一行结构树时交给标签插件的上下文。 */
export interface TreeRowContext {
  readonly document: Document;
  readonly shape: Shape;
  /** 缩进层级，画布根为 0 */
  readonly depth: number;
  /** 是否为画布根那一行 */
  readonly isRoot: boolean;
}

/**
 * 树标签扩展点：结构树**每行行尾**的标签。
 *
 * 渲染器只做两件事：把 `decorate` 的返回值按注册顺序用空格拼起来、追加在行尾。
 * 新增标签不需要改渲染器、也不需要改内核。
 *
 * 约束：标签自己维护的状态（例如"自上次保存以来被修改过的 id"）必须放在
 * **实例字段**里，不得使用模块级变量——否则同一进程内多个编辑器实例会串味。
 */
export interface TreeDecorator {
  /** 稳定的注册名，用于 `contributes.decorators` 的清单校验 */
  readonly name: string;

  /** 返回该行的标签文本；返回 `undefined` 表示这一行不加标签。 */
  decorate(row: TreeRowContext): string | undefined;

  /** 文档内容发生变化（编辑命令执行、undo、redo）时通知。 */
  onDocumentChanged?(document: Document): void;

  /** 文档保存成功时通知。 */
  onDocumentSaved?(document: Document): void;

  /** 换上新文档（`init` / `read`）时通知；此时内容与磁盘一致，可作为干净基线。 */
  onDocumentLoaded?(document: Document): void;
}
