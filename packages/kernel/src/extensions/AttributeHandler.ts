import type { Shape } from '../domain/Shape.js';

/**
 * 属性扩展点：某个属性在某种图形上的**领域语义**。
 *
 * 内核在 `set` 里先问是否有处理器负责；没有才回落到 Phase 1 的白名单规则。
 * 这样 `label` 这类插件私有属性不需要进入内核白名单，内核也不必认识 `box`。
 */
export interface AttributeHandler {
  /** 稳定的注册名，用于 `contributes.attributes` 的清单校验 */
  readonly name: string;

  /**
   * 是否负责该图形上的该属性。
   * **不得修改文档状态**——内核可能在只读场景（如构造命令时校验）调用它。
   */
  handles(shape: Shape, attr: string): boolean;

  /**
   * 执行修改，可返回自定义的成功消息（`undefined` 表示用内核的默认文案）。
   *
   * 契约：
   * 1. 只修改 `shape` 自身或其子孙；
   * 2. 可以是多次子部件修改——内核已经把整个子树拍过快照，`undo` 会整体还原；
   * 3. 抛错表示这次 `set` 失败，内核会回滚到执行前状态且不进入 undo 栈；
   * 4. 抛出后**不会**再回落到默认白名单处理，避免掩盖错误或重复修改。
   */
  apply(shape: Shape, attr: string, value: string): string | undefined;

  /**
   * 撤销后自定义的恢复消息。
   *
   * 调用时机是**快照已经恢复之后**，因此这里读到的是恢复后的值，
   * 可以直接用它拼出 `box#n2 label restored: "处理数据"` 这类文案。
   */
  undoMessage?(shape: Shape, attr: string): string | undefined;
}
