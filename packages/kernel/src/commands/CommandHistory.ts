import type { Command } from './Command.js';
import { CommandError } from './CommandError.js';

/**
 * 撤销/重做历史——作业 §4.3 的落地。
 *
 * 三条规则：
 * 1. **一条编辑命令 = 一个 undo 单元**：`run` 一次只入栈一个 Command 对象；
 * 2. **undo 后若有新编辑，redo 栈清空**：在 `run` 里单点保证；
 * 3. **IO 闸门**：文档类命令（init / read / save / canvas 改尺寸）执行后
 *    undo/redo 一律拒绝，报 `undo not allowed after io command`，
 *    直到下一次编辑命令重新解禁。
 *
 * 为什么 IO 命令要分两种处理：
 * - `save` 只是写文件，文档没换，历史仍然有效 → `markIoBoundary` 只上闸门；
 * - `init` / `read` 换掉了整份文档，旧命令指向的是**已经不在编辑器里的图形**，
 *   再执行会污染新文档 → `reset` 必须把两个栈都作废。
 */
export class CommandHistory {
  private readonly undoStack: Command[] = [];
  private readonly redoStack: Command[] = [];
  private ioBarrier = false;

  get canUndo(): boolean {
    return !this.ioBarrier && this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return !this.ioBarrier && this.redoStack.length > 0;
  }

  get undoDepth(): number {
    return this.undoStack.length;
  }

  get redoDepth(): number {
    return this.redoStack.length;
  }

  /** 执行一条编辑命令并记为新的 undo 单元。失败时命令自己负责不改状态。 */
  run(command: Command): string {
    const message = command.execute();
    this.undoStack.push(command);
    this.redoStack.length = 0;
    this.ioBarrier = false;
    return message;
  }

  undo(): string {
    this.assertNotBlocked('undo');
    const command = this.undoStack.pop();
    if (command === undefined) {
      throw CommandError.nothingToUndo();
    }
    const message = command.undo();
    this.redoStack.push(command);
    return message;
  }

  redo(): string {
    this.assertNotBlocked('redo');
    const command = this.redoStack.pop();
    if (command === undefined) {
      throw CommandError.nothingToRedo();
    }
    const message = command.execute();
    this.undoStack.push(command);
    return message;
  }

  /** `save` 或 `canvas <w> <h>`：文档没换，历史保留，但先上闸门。 */
  markIoBoundary(): void {
    this.ioBarrier = true;
  }

  /** `init` / `read`：文档被替换，旧命令全部作废。 */
  reset(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.ioBarrier = true;
  }

  private assertNotBlocked(action: 'undo' | 'redo'): void {
    if (!this.ioBarrier) {
      return;
    }
    throw action === 'undo'
      ? CommandError.undoNotAllowedAfterIo()
      : CommandError.redoNotAllowedAfterIo();
  }
}
