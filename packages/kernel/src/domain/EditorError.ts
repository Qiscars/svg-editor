/**
 * 所有**预期内的、给用户看的**错误的共同基类。
 *
 * 分出这一层的目的是让表现层能一眼区分两件事：
 * - `EditorError` 的子类 = 用户操作不当（id 不存在、参数不对、闸门未解禁……），
 *   输出 `error: <message>` 就够，程序继续运行；
 * - 其它异常 = 我们自己写错了（不变量被破坏、内部断言失败），
 *   输出时会额外带上 `internal:` 前缀，避免把 bug 伪装成用户错误。
 *
 * 消息文本一律**不带 `error: ` 前缀**——前缀是表现层的职责。
 */
export class EditorError extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
