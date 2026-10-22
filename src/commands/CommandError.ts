/**
 * 命令层的错误。
 *
 * 与 `ShapeError` 分开：`ShapeError` 描述"图形树不成立"，
 * `CommandError` 描述"这个操作现在不能做"（闸门、栈空）。
 * 两者都由表现层统一加 `error: ` 前缀输出。
 */
export class CommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommandError';
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
