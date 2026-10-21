/**
 * 一条编辑命令。
 *
 * 契约有三条（其它层依赖它们成立）：
 * 1. `execute()` 是**可重复调用**的——`redo` 就是再执行一次，命令不能依赖
 *    "只执行一次"的副作用；
 * 2. `undo()` 必须把状态精确恢复到 `execute()` 之前；
 * 3. 返回值是**已渲染好的反馈行**（不带 `error: ` 前缀），供 REPL 直接输出。
 *
 * 注意"一条命令 = 一个 undo 单元"：`group g1 r1 c1 t1` 只对应一个 Command 对象，
 * 因此 undo 一次就整体还原，不会被拆成多个栈元素。
 */
export interface Command {
  execute(): string;
  undo(): string;
}
