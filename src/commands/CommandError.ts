import { EditorError } from '../domain/EditorError.js';

/**
 * 命令层的错误：这个操作现在不能做（闸门未解禁、栈空、未知命令、参数个数不对）。
 *
 * 与 `ShapeError` 是兄弟关系，二者共同继承 `EditorError`——
 * 表现层只需要判断一次 `instanceof EditorError` 就能决定"这是给用户看的错误"。
 */
export class CommandError extends EditorError {
  constructor(message: string) {
    super(message);
  }

  static undoNotAllowedAfterIo(): CommandError {
    return new CommandError('undo not allowed after io command');
  }

  static redoNotAllowedAfterIo(): CommandError {
    return new CommandError('redo not allowed after io command');
  }

  static nothingToUndo(): CommandError {
    return new CommandError('nothing to undo');
  }

  static nothingToRedo(): CommandError {
    return new CommandError('nothing to redo');
  }

  static emptyGroupList(): CommandError {
    return new CommandError('group needs at least one shape');
  }

  static duplicateGroupMember(id: string): CommandError {
    return new CommandError(`duplicate id in group: ${id}`);
  }

  static unknownCommand(name: string): CommandError {
    return new CommandError(`unknown command: ${name}`);
  }

  static unclosedQuote(): CommandError {
    return new CommandError('unclosed double quote');
  }

  static usage(usage: string): CommandError {
    return new CommandError(`usage: ${usage}`);
  }
}
