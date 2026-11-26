import { EditorError } from '../domain/EditorError.js';

/**
 * 扩展点注册表的错误。
 *
 * 单独一层是为了让 `extensions` 只依赖 `domain`：
 * 注册表既要报"命令名未知"，又要报"注册名冲突"，但这两件事都不属于
 * 命令层或图形层——它们属于**注册行为本身**。
 */
export class RegistryError extends EditorError {
  /** 注册名冲突（作业 §6 指定格式 `<category>/<name>`）。 */
  static duplicateRegistration(key: string): RegistryError {
    return new RegistryError(`duplicate registration: ${key}`);
  }

  /** 命令名未注册。 */
  static unknownCommand(name: string): RegistryError {
    return new RegistryError(`unknown command: ${name}`);
  }

  /** 参数个数与命令声明不符。 */
  static usage(usage: string): RegistryError {
    return new RegistryError(`usage: ${usage}`);
  }
}
