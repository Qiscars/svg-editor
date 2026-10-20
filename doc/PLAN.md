# 开发计划与进度看板

> 本文档是**过程管控**文档，与 `doc/README.md`（作业交付文档）分工不同：
> 前者管"做到哪一步、下一步做什么"，后者是"方案与结论"。
>
> **每次开发都会更新本文档**：勾选进度 → 更新 [§0 当前状态](#0-当前状态每次开发后更新) → 在 [§5 会话日志](#5-会话日志每次开发追加) 追加一条。

| 项 | 值 |
|---|---|
| 作业截止 | **2026-10-25 23:59** |
| 实际开发窗口 | **3 天**：10/21 · 10/22 · 10/23 |
| 缓冲 | 10/24 – 10/25（2 天，用于返工与 tag 兜底） |
| 交付物 | ① 代码仓库（远程 + tag `final`）② `doc/README.md` |

---

## 0. 当前状态（每次开发后更新）

| 项 | 值 |
|---|---|
| 今天 | 2026-10-20 |
| 当前阶段 | **Day 0 · 仓库与骨架（已收尾）** |
| 已完成提交 | 5 / 32 |
| 最近一次提交 | `docs(plan): 三天开发计划与进度看板` |
| 下一个提交 | #6 `feat(domain): Shape 抽象基类、领域错误与 id 索引`（Day 1 开工） |
| 阻塞项 | 无 |
| 距离截止 | 5 天（含 2 天缓冲） |

---

## 1. 三天总览

| 天 | 日期 | 主题 | 提交区间 | 结束时的可验证成果 |
|---|---|---|---|---|
| Day 0 | 10/20 | 仓库与骨架 | #1–#5 ✅ | 远程仓库可用，`npm run cli` 能进 REPL 并输出 help，计划与看板就位 |
| **Day 1** | **10/21** | **领域模型 + 命令层**（纯内存、零 I/O） | #6–#17 | `vitest run` 全绿；Composite 语义与 undo/redo 均在单测中被验证 |
| **Day 2** | **10/22** | **持久化 + CLI 接入** | #18–#25 | `npm run cli` 回放作业 §6 transcript 输出一致；`save` 出的 SVG 浏览器可打开 |
| **Day 3** | **10/23** | **质量保证 + 文档收口 + tag** | #26–#32 + tag | 命令覆盖 23/23、错误信息 11/11、依赖检查脚本 exit 0、文档四节写完、`final` 已推送 |
| 缓冲 | 10/24–10/25 | 返工 / 补测试 / 打 tag 兜底 | — | — |

**为什么这样切**：Day 1 全是纯内存逻辑，不碰文件系统，可以高频跑单测；Day 2 才引入 I/O 与字符串解析，问题域一次性变大但结构已稳；Day 3 专门用来"证明它对"，而不是继续加功能。**三天之外留两天缓冲**，是因为 tag `final` 必须在 10/25 23:59 前完成，不能压到最后一小时。

---

## 2. 进度看板

图例：⬜ 未开始 ／ 🟡 进行中 ／ ✅ 已完成

### Day 0 · 10/20 · 仓库与骨架

| # | 提交 | 状态 | sha |
|---|---|---|---|
| 1 | `chore: 初始化仓库与基础工程配置` | ✅ | `3d9fe9d` |
| 2 | `chore(toolchain): 搭建 TypeScript 工程配置、依赖与最小入口` | ✅ | `aad0c56` |
| 3 | `docs(architecture): 架构方案第一版` | ✅ | `5507a7a` |
| 4 | `feat(cli): REPL 骨架与 help 输出` | ✅ | `0fc148d` |
| 5 | `docs(plan): 三天开发计划与进度看板` | ✅ | —（本文档） |

### Day 1 · 10/21 · 领域模型 + 命令层

**目标**：`domain` 与 `commands` 两层跑通，在没有 I/O 的情况下证明 Composite 语义与撤销正确性。

| # | 提交 | 产出 | 状态 |
|---|---|---|---|
| 6 | `feat(domain): Shape 抽象基类、领域错误与 id 索引` | `Shape.ts` / `ShapeError.ts` / `IdIndex.ts` | ⬜ |
| 7 | `feat(domain): 叶子图形 rect/circle/ellipse/line/text` | `domain/leaf/*` | ⬜ |
| 8 | `feat(domain): Container 与 Canvas，落地 Composite 递归语义` | `Container.ts` / `Canvas.ts` | ⬜ |
| 9 | `feat(domain): Document 与结构不变量` | `Document.ts` | ⬜ |
| 10 | `test(domain): 递归变换、属性白名单与 id 唯一性` | `tests/domain/*` | ⬜ |
| 11 | `feat(commands): Command 接口、CommandContext 与 CommandHistory` | `commands/*.ts` | ⬜ |
| 12 | `feat(commands): create / delete` | `commands/impl/*` | ⬜ |
| 13 | `feat(commands): move / scale` | `commands/impl/*` | ⬜ |
| 14 | `feat(commands): set（模板方法 + 白名单校验）` | `commands/impl/*` | ⬜ |
| 15 | `feat(commands): group / ungroup / addto` | `commands/impl/*` | ⬜ |
| 16 | `feat(commands): front / back 层级调整` | `commands/impl/*` | ⬜ |
| 17 | `test(commands): execute→undo 结构深比较` | `tests/commands/*` | ⬜ |

**Day 1 验收标准（三条全过才算完成）**

1. `tsc -p tsconfig.json` 与 `tsc -p tsconfig.test.json` 均零错误；
2. `vitest run` 全绿；
3. 每个编辑命令都有"`execute → undo` 后整棵树与执行前深比较相等"的用例。

### Day 2 · 10/22 · 持久化 + CLI 接入

**目标**：从"能跑的库"变成"能用的 CLI"，用作业 §6 的 transcript 做第一次端到端验收。

| # | 提交 | 产出 | 状态 |
|---|---|---|---|
| 18 | `feat(io): ShapeFactory 与 SVG 序列化` | `registry/ShapeFactory.ts` / `io/SvgSerializer.ts` | ⬜ |
| 19 | `feat(io): SVG 解析、缺 id 自动补名与警告` | `io/SvgParser.ts` / `io/FileGateway.ts` | ⬜ |
| 20 | `feat(app): EditorApp 编排 init/read/save/canvas 与 IO 闸门` | `app/EditorApp.ts` | ⬜ |
| 21 | `feat(cli): Tokenizer 与 CommandParser（双引号、in 子句）` | `cli/Tokenizer.ts` / `cli/CommandParser.ts` | ⬜ |
| 22 | `feat(cli): CommandRegistry 与 help 生成（消除待重构项 R3）` | `registry/CommandRegistry.ts` | ⬜ |
| 23 | `feat(cli): tree / show 渲染器` | `cli/render/*` | ⬜ |
| 24 | `feat(cli): 统一 error: 前缀与成功摘要` | `cli/Repl.ts` 收口 | ⬜ |
| 25 | `docs(process): 追加 Day 1–2 过程记录` | `doc/README.md §2` | ⬜ |

**Day 2 验收标准**

1. 把作业 §6 的命令序列存成 `doc/scenarios/basic-session.txt`，回放后与文档 transcript 逐行一致；
2. §6.1 两节点流程图能完整构建，`tree` 输出结构与作业一致；
3. `save demo.svg` 的产物在浏览器中渲染正确（截图存 `doc/images/`）；
4. 文档类命令后 `undo` 报 `error: undo not allowed after io command`。

### Day 3 · 10/23 · 质量保证 + 文档收口 + tag

**目标**：不再加功能，只做"证明它对"和"把证据写进文档"。

| # | 提交 | 产出 | 状态 |
|---|---|---|---|
| 26 | `tools: 依赖方向检查脚本` | `tools/check-layers.mjs` | ⬜ |
| 27 | `test(scenarios): 回放 §6 与 §6.1 transcript` | `tests/scenarios/*` | ⬜ |
| 28 | `test(io): save→read round-trip 与缺 id 补名` | `tests/io/*` | ⬜ |
| 29 | `test(commands): 错误路径 §4.2 全覆盖` | `tests/commands/errors.test.ts` | ⬜ |
| 30 | `docs: 补齐一致性自查与质量保证实测结果` | `doc/README.md §3 §4` | ⬜ |
| 31 | `docs: 过程记录定稿与修订记录` | `doc/README.md §2 §5` | ⬜ |
| 32 | `chore(release): 0.1.0` | `package.json` | ⬜ |
| — | `git tag -a final` + `git push origin final` | 远程 tag | ⬜ |

**Day 3 验收标准（= 交付检查清单）**

1. 命令覆盖矩阵 **23/23**（作业 §3 命令总表逐条有对应用例）；
2. 错误信息 **11/11**（作业 §4.2 逐条有对应用例，且断言"失败不改状态"）；
3. `node tools/check-layers.mjs` 退出码 0，输出真实贴进 `doc/README.md §3.2`；
4. `doc/README.md` 四节全部有实质内容，无 `待填写` 残留；
5. `git ls-remote --tags origin` 能看到 `final`；
6. `git status` 干净，本地与 `origin/main` 一致。

---

## 3. 提交规范

```
<type>(<scope>): <中文主题，一句话说清做了什么>

- 关键改动 1：为什么这么改
- 关键改动 2：为什么这么改
```

- `type`：`feat` / `fix` / `test` / `docs` / `refactor` / `chore` / `tools`
- `scope`：`domain` / `commands` / `io` / `app` / `cli` / `registry` / `plan`
- 一次提交只做一件事；实现与测试分开提交，让历史能看出"先实现、再补测"的真实顺序。

**每个提交前的门禁（三条全绿才提交）**

```powershell
node_modules/.bin/tsc -p tsconfig.json
node_modules/.bin/tsc -p tsconfig.test.json
node_modules/.bin/vitest run
```

---

## 4. 风险与应对

| 风险 | 触发信号 | 应对 |
|---|---|---|
| Day 1 领域模型返工 | 写完 Container 发现 `scale` 语义要改 | 领域层无 I/O，返工成本低；宁可 Day 1 多花时间，也不把问题带进 Day 2 |
| Day 2 transcript 对不上 | §6 输出与文档不一致 | 先判断是**渲染格式**差异还是**语义**差异；格式差异记入过程记录并说明取舍，语义差异必须修 |
| Day 3 时间不够 | 测试补不完 | 优先保"命令覆盖矩阵"和"错误路径"两项；transcript 对拍可降级为人工比对并注明 |
| 代理工具关闭导致 push 失败 | `Connection was reset` | 重新开代理工具；或 `git config --global --unset http.proxy` 改直连 |
| tag 打了又改 | 定稿后仍有提交 | `git tag -f final && git push -f origin final`，并在会话日志注明原因 |
| 提交时间戳过于集中 | 一天内推完所有提交 | 按本计划的 3 天节奏推进，不在一晚冲刺 |

---

## 5. 会话日志（每次开发追加）

| # | 日期 | 做了什么 | 提交区间 | 结果 | 遗留 |
|---|---|---|---|---|---|
| 1 | 2026-10-20 | 建立本地仓库与远程仓库、TypeScript 工具链、架构方案 v1、REPL 骨架 | #1–#4 | 远程 `Qiscars/svg-editor` 可用，4 个提交已推送 | 业务逻辑为 0，等 Day 1 开始 |
| 2 | 2026-10-20 | 制定 3 天开发计划，建立本进度看板 | #5 | 计划与看板落地 | 开始 Day 1 |

---

## 6. 维护约定

每次开发**开始**与**结束**各做一次：

1. **开始**：读 [§0 当前状态](#0-当前状态每次开发后更新)，确认今天做哪几个提交、验收标准是什么；
2. **过程**：每完成一个提交，把 [§2](#2-进度看板) 对应行的 ⬜ 改成 ✅ 并填上 sha；
3. **结束**：更新 §0 的「当前阶段 / 已完成提交数 / 下一个提交 / 阻塞项」，在 [§5](#5-会话日志每次开发追加) 追加一行，然后单独提交：

```powershell
git add doc/PLAN.md
git commit -m "docs(plan): Day N 进度更新"
git push
```

**判断标准**：任何时刻打开这份文档，都应能在 10 秒内回答"做到哪了、下一步是什么、还剩多少时间"。
