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
| 今天 | 2026-10-21 |
| 当前阶段 | **Day 2 · 已完成（CLI 可用，四条验收全过）** |
| 已完成提交 | 25 / 32 |
| 最近一次提交 | `53d7b25 docs(process): 追加 Day 1–2 过程记录` |
| 下一个提交 | #26 `tools: 依赖方向检查脚本`（Day 3 第 1 段，10/23 14:52） |
| 本次前置检查 | `N = 25`，本段区间 `[25, 25]`，`N = 25` → 无欠账，正常推进 |
| 阻塞项 | 无 |
| 距离截止 | 4 天（含 2 天缓冲） |

---

## 1. 三天总览

| 天 | 日期 | 主题 | 提交区间 | 结束时的可验证成果 |
|---|---|---|---|---|
| Day 0 | 10/20 | 仓库与骨架 | #1–#5 ✅ | 远程仓库可用，`npm run cli` 能进 REPL 并输出 help，计划与看板就位 |
| **Day 1** | **10/21** | **领域模型 + 命令层**（纯内存、零 I/O） | #6–#17 ✅ | `vitest run` 全绿（91 个用例）；Composite 语义与 undo/redo 均在单测中被验证 |
| **Day 2** | **10/22** | **持久化 + CLI 接入** | #18–#25 ✅ | `npm run cli` 回放作业 §6 transcript 输出一致；`save` 出的 SVG 浏览器可打开 |
| **Day 3** | **10/23** | **质量保证 + 文档收口 + tag** | #26–#32 + tag | 命令覆盖 19/19、错误信息 11/11、依赖检查脚本 exit 0、文档四节写完、`final` 已推送 |
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

| # | 提交 | 产出 | 状态 | sha |
|---|---|---|---|---|
| 6 | `feat(domain): Shape 抽象基类、领域错误与 id 索引` | `Shape.ts` / `ShapeError.ts` / `IdIndex.ts` | ✅ | `ea54ccd` |
| 7 | `feat(domain): 叶子图形 rect/circle/ellipse/line/text` | `domain/leaf/*` | ✅ | `d3e28f0` |
| 8 | `feat(domain): Container 与 Canvas，落地 Composite 递归语义` | `Container.ts` / `Canvas.ts` | ✅ | `aeae360` |
| 9 | `feat(domain): Document 与结构不变量` | `Document.ts` | ✅ | `5399bff` |
| 10 | `test(domain): 递归变换、属性白名单与 id 唯一性` | `tests/domain/*` | ✅ | `72ec73a` |
| 11 | `feat(commands): Command 接口、CommandContext 与 CommandHistory` | `commands/*.ts` | ✅ | `a2ed4cf` |
| 12 | `feat(commands): create / delete` | `commands/impl/*` | ✅ | `9a41990` |
| 13 | `feat(commands): move / scale 与子树属性快照` | `commands/impl/*` | ✅ | `5ab2744` |
| 14 | `feat(commands): set 属性修改与撤销` | `commands/impl/*` | ✅ | `5cfcdf9` |
| 15 | `feat(commands): group / ungroup / addto` | `commands/impl/*` | ✅ | `28aaa5e` |
| 16 | `feat(commands): front / back 层级调整` | `commands/impl/*` | ✅ | `2ac5cc5` |
| 17 | `test(commands): execute→undo 结构深比较` | `tests/commands/*` | ✅ | `5ba2bc1` |

**Day 1 验收标准（三条全过才算完成）**

1. `tsc -p tsconfig.json` 与 `tsc -p tsconfig.test.json` 均零错误；
2. `vitest run` 全绿；
3. 每个编辑命令都有"`execute → undo` 后整棵树与执行前深比较相等"的用例。

### Day 2 · 10/22 · 持久化 + CLI 接入

**目标**：从"能跑的库"变成"能用的 CLI"，用作业 §6 的 transcript 做第一次端到端验收。

| # | 提交 | 产出 | 状态 | sha |
|---|---|---|---|---|
| 18 | `feat(io): ShapeFactory 与 SVG 序列化` | `registry/ShapeFactory.ts` / `io/SvgSerializer.ts` | ✅ | `52344e2` |
| 19 | `feat(io): SVG 解析、缺 id 自动补名与警告` | `io/SvgParser.ts` / `io/FileGateway.ts` | ✅ | `b643a44` |
| 20 | `feat(app): EditorApp 编排 init/read/save/canvas 与 IO 闸门` | `app/EditorApp.ts` | ✅ | `e00c810` |
| 21 | `feat(cli): Tokenizer 与 CommandParser（双引号、in 子句）` | `cli/Tokenizer.ts` / `cli/CommandParser.ts` | ✅ | `63acdf5` |
| 22 | `feat(cli): CommandRegistry 与 help 生成（消除待重构项 R3）` | `registry/CommandRegistry.ts` | ✅ | `230c7be` |
| 23 | `feat(cli): tree / show 渲染器` | `cli/render/*` | ✅ | `116db9f` |
| 24 | `feat(cli): 统一 error: 前缀与成功摘要` | `cli/Repl.ts` 收口 | ✅ | `02eeef9` |
| 25 | `docs(process): 追加 Day 1–2 过程记录` | `doc/README.md §2` | ✅ | `53d7b25` |

**Day 2 验收标准**

1. 把作业 §6 的命令序列存成 `doc/scenarios/basic-session.txt`，回放后与文档 transcript 逐行一致；
2. §6.1 两节点流程图能完整构建，`tree` 输出结构与作业一致；
3. `save demo.svg` 的产物在浏览器中渲染正确（截图存 `doc/images/`）；
4. 文档类命令后 `undo` 报 `error: undo not allowed after io command`。

### Day 3 · 10/23 · 质量保证 + 文档收口 + tag

**目标**：不再加功能，只做"证明它对"和"把证据写进文档"。

| # | 提交 | 产出 | 状态 | sha |
|---|---|---|---|---|
| 26 | `tools: 依赖方向检查脚本` | `tools/check-layers.mjs` | ⬜ | — |
| 27 | `test(scenarios): 回放 §6 与 §6.1 transcript` | `tests/scenarios/*` | ⬜ | — |
| 28 | `test(io): save→read round-trip 与缺 id 补名` | `tests/io/*` | ⬜ | — |
| 29 | `test(commands): 错误路径 §4.2 全覆盖` | `tests/commands/errors.test.ts` | ⬜ | — |
| 30 | `docs: 补齐一致性自查与质量保证实测结果` | `doc/README.md §3 §4` | ⬜ | — |
| 31 | `docs: 过程记录定稿与修订记录` | `doc/README.md §2 §5` | ⬜ | — |
| 32 | `chore(release): 0.1.0` | `package.json` | ⬜ | — |
| — | `git tag -a final` + `git push origin final` | 远程 tag | ⬜ | — |

**Day 3 验收标准（= 交付检查清单）**

1. 命令覆盖矩阵 **19/19**（作业 §3 命令总表共 19 条命令，逐条有对应用例）；
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
| 3 | 2026-10-21 | **前置检查：`N = 6`，本段 `[6, 9]`，无欠账**。推进 `domain` 底座：抽象基类、叶子图形、Composite 容器与画布、Document 与 id 索引 | #6–#9 | 三条门禁全绿；冒烟脚本验证 move/scale 递归、id 唯一性、7 条错误文案、clone 深拷贝隔离、`show` 输出与作业 §5.2 一致 | 无欠账。留给 Day 1 第 2 段处理的发现见下 |
| 4 | 2026-10-21 | **前置检查：`N = 10`，本段 `[10, 11]`，无欠账**。补 49 个领域用例；搭命令层基础设施（Command / CommandContext / CommandHistory / CommandError） | #10–#11 | 门禁全绿，累计 60 个用例通过；undo/redo 双栈与 IO 闸门四种场景均有覆盖 | 无欠账。具体命令待第 3 段 |
| 5 | 2026-10-21 | **前置检查：`N = 12`，本段 `[12, 17]`，无欠账**。落地十条编辑命令与 undo 深比较测试 | #12–#17 | 累计 91 个用例全绿；**Day 1 三条验收全过**（tsc × 2 零错误、vitest 全绿、每条命令都有 execute→undo 深比较） | Day 1 收工，等 Day 2 |
| 6 | 2026-10-22 | **前置检查：`N = 18`，本段 `[18, 20]`，无欠账**（定时提醒因会话离线晚到约 2 小时）。落地 ShapeFactory + SVG 序列化、XML/SVG 解析与文件网关、EditorApp 编排 | #18–#20 | 序列化输出与作业 §0.1 样例逐字一致；用作业 §6 的 other.svg 实测 7 元素 + 1 条补名 warning；save→read 序列化稳定 | 代理掉线导致推送延后，见 §5.2 |
| 7 | 2026-10-22 | **前置检查：`N = 21`，本段 `[21, 24]`，无欠账**（代理恢复后先补推上段 5 个提交）。接入 CLI：分词与解析、命令注册表与 help 生成、tree/show 渲染、统一错误前缀 | #21–#24 | 作业 §6 会话序列与 §5.1 / §5.2 的 tree、show 输出逐行复现；累计 127 个用例全绿；待重构项 R3（静态 help 常量）已消除 | 无欠账。Day 2 只剩过程记录与验收 |
| 8 | 2026-10-22 | **前置检查：`N = 25`，本段 `[25, 25]`，无欠账**。补写 Day 1–2 过程记录；做 Day 2 四条端到端验收 | #25 | **Day 2 四条验收全过**：§6 回放 69 行逐字对上（仅原文 `y=2` 笔误按 SVG 规范输出 `cy=2`）；§6.1 流程图 8 元素正确（树宽差 3 列，格式差异）；save 的 SVG 用无头 Edge 渲染并截图（`doc/images/`）；`save` 后 undo 被拒 | Day 2 收工，等 Day 3 |

### 5.1 本段发现与待办

| # | 发现 | 处理 |
|---|---|---|
| 1 | `Document.attach` 在"移动归属"路径（图形已登记、换父容器）上会误报 `id already exists` | **本段内已修**：区分"首次挂载"与"移动归属"，后者只改父指针、不重复登记（`5399bff`） |
| 2 | `doc/README.md §1.2 ④` 写的是 `Shape.toSvgElement()` 由子类实现，但那会让 `domain` 依赖 XML 概念，与 §1.3「domain 不认识 XML」直接冲突 | **已在 #18 修复**：改为"各类型声明属性表 + `io/SvgSerializer` 数据驱动遍历"；§1.2 已改写，§5 修订记录登记为 v1.2（`52344e2`） |
| 3 | 作业 §5.1 的 `tree` 示例自相矛盾：同一深度的属性列，例 1 对齐到第 19 列、例 6.1 对齐到第 29 列，按同一算法推不出来 | **已在 #23 落地**：算法为"全局统一列 = 最宽（前缀 + id）+ 2，至少 1 空格"。与例 1 逐字一致；例 6.1 会宽 3 列。两例无法同时复现，取舍记入 `doc/README.md §2` 过程记录（`116db9f`） |
| 4 | 写领域测试时发现 `Container.insertChild` 自环抛的是 `invalid id`，语义不对 | **本段内已修**：新增 `ShapeError.cannotInsertIntoSelf`（`72ec73a`） |
| 5 | `CommandError` 与 `ShapeError` 目前是两条并列的 `Error` 子类，表现层要分别 `catch` | **已在 #24 收口**：新增 `domain/EditorError` 作为共同基类，两者改为继承它；Repl 只需判断一次 `instanceof EditorError`，非预期异常额外标 `internal:`（`02eeef9`） |
| 6 | `set` 的非法数值是在 `execute()` 期才被拒绝，构造期只查白名单 | **刻意保留**：属性值的合法性由 `AttributeSpec.write` 唯一判断，命令层不重复实现解析。安全性由 `CommandHistory.run` 保证——execute 抛错就不入栈、不改状态（`5ba2bc1` 有用例覆盖） |
| 7 | **计划里的命令条数算错了**：原写"23 条命令"，实际作业 §3 共 17 行、合计 **19 条命令**（front/back、undo/redo 各占一行但含两条） | **已在本段修正**：§1 总览与 Day 3 验收标准的"23/23"改为"19/19"，Day 3 的覆盖矩阵按 19 条对账。这也说明验收标准要拿命令总表逐行数，而不是凭印象 |

### 5.2 待推送（网络阻塞，非代码问题）

| 发现时间 | 现象 | 影响 | 恢复条件 |
|---|---|---|---|
| 2026-10-22 17:00 左右 | 本机代理 `127.0.0.1:12000` 未运行，系统代理也已关闭；直连 `github.com:443` 能建立 TCP 但 TLS 被重置（`Recv failure: Connection was reset`），`http.sslBackend=schannel` 也无效 | 当时 5 个提交未能推送 | — |
| 2026-10-22 18:31 | 代理恢复，`git push` 一次成功：`7c6a53c..6ffb9fc` | **已解除**，远程与本地一致 | 无需操作 |
| 2026-10-22 21:55 | Day 2 收工时代理**再次**掉线（端口 12000 不在监听），`git push` 失败；本地 ahead 2 | #25 与 Day 2 验收记录共 2 个提交暂未同步；`origin/main` 停在 `1023475` | Day 3 开工时先执行 `git push`，一条命令即可 |

**结论**：代码与文档从未受影响，只是远程同步滞后。**每次开工的第一动作都是先补推**，
所以这个阻塞不会把风险传导到后续会话。核对方式：`git status -sb` 看 ahead 数，
`git log --oneline origin/main -1` 看远程实际位置。

---

## 6. 维护约定

每次开发**开始**与**结束**各做一次：

1. **开始**：先执行 [§7.2](#72-检查算法机械可执行) 的前置检查（找编号最小的未完成提交 `N`，与本节计划区间 `[A, B]` 比较），确认本段要不要先追赶；再读 [§0 当前状态](#0-当前状态每次开发后更新) 确认验收标准；
2. **过程**：每完成一个提交，把 [§2](#2-进度看板) 对应行的 ⬜ 改成 ✅ 并填上 sha；
3. **结束**：更新 §0 的「当前阶段 / 已完成提交数 / 下一个提交 / 阻塞项」，在 [§5](#5-会话日志每次开发追加) 追加一行，然后单独提交：

```powershell
git add doc/PLAN.md
git commit -m "docs(plan): Day N 进度更新"
git push
```

**判断标准**：任何时刻打开这份文档，都应能在 10 秒内回答"做到哪了、下一步是什么、还剩多少时间"。

---

## 7. 前置依赖与追赶规则

32 个提交构成**一条线性依赖链**：任何一段都依赖它之前的全部提交。所以每个定时会话到点时，**先检查、再干活**——前置没做完就当场补齐，不允许跳步。

### 7.1 依赖链

| 段 | 计划区间 | 硬前置 | 前置缺失时的后果 |
|---|---|---|---|
| Day 1 第 1 段 | #6–#9 | #1–#5 | 没有 domain，后面全部无从下手 |
| Day 1 第 2 段 | #10–#11 | #6–#9 | 没有 Shape/Container，命令层写不出来 |
| Day 1 第 3 段 | #12–#17 | #10–#11 | 没有 CommandHistory，命令无法验证 undo |
| Day 2 第 1 段 | #18–#20 | #12–#17 | 序列化要遍历完整的图形树 |
| Day 2 第 2 段 | #21–#24 | #18–#20 | parser 要调用 app 与 io |
| Day 2 第 3 段 | #25 + 验收 | #21–#24 | 没有 CLI 就无法回放 transcript |
| Day 3 第 1 段 | #26–#27 | Day 2 验收通过 | 依赖方向检查需要完整分层 |
| Day 3 第 2 段 | #28–#29 | #26–#27 | 错误路径用例要先有 CLI 入口 |
| Day 3 第 3 段 | #30–#32 + tag | #28–#29 | 文档要引用测试的实测结果 |
| 缓冲日 | — | 全部 | 只补遗留，不加新功能 |
| 截止日检查 | — | `final` tag 存在 | 硬性交付物 |

### 7.2 检查算法（机械可执行）

每次会话开工前执行以下三步，**结果决定本次会话的实际范围**：

1. 打开 [§2 进度看板](#2-进度看板) 逐行扫描，找**编号最小的状态非 ✅ 的提交**，记为 `N`；
2. 记本段的计划区间为 `[A, B]`；
3. 按 `N` 的位置决定动作：

| 条件 | 含义 | 动作 |
|---|---|---|
| `N < A` | **前置欠账** | 先按编号顺序把 `N … A-1` 全部做完（每个仍单独提交、单独过门禁），再从 `A` 做到 `B`。本段工作量翻倍也要接受，**不许跳过、不许合并提交** |
| `N ≥ A` 且 `N ≤ B` | 正常 | 从 `N` 做到 `B` |
| `N > B` | 本段已提前完成 | 视为本段完成，直接对下一段重跑本检查（可提前推进），或做收尾核验 |

4. **无条件约束**：会话结束时，`§2` 中编号 `≤ B` 的所有行都必须是 ✅。若确实做不到，必须在 [§5](#5-会话日志每次开发追加) 写明原因与剩余量，并把该行保持 ⬜——**不得把未完成伪装成 ✅**。

### 7.3 为什么用"编号最小未完成"而不是逐条声明依赖

链是线性的，所以"编号最小的未完成"恰好等于"所有未完成前置的起点"。这样检查只需**一次扫描**，不依赖执行者记住复杂依赖图，也不会因为漏看某一条而跳步。**看板本身就是唯一真相源**：某步是否真的完成，以 §2 的 ✅ 和对应 sha 为准，而不是以"我觉得写完了"为准。

### 7.4 追赶时的额外约束

一次会话跨多段追赶时最容易图快降标准，因此追加三条：

- **仍要逐提交提交**：欠的 4 个提交不能压成 1 个大提交，否则破坏"提交历史体现开发过程"这条作业要求；
- **仍要逐提交过门禁**：`tsc -p tsconfig.json`、`tsc -p tsconfig.test.json`、`vitest run` 三条全绿；
- **要在日志里明说**：§5 会话日志写明"本次追赶了 #x–#y"，让看板能自证。

### 7.5 依赖检查的自身演示

这条规则第一次真正起作用是在 Day 1 第 1 段：开工时若 `#1–#5` 中任何一行是 ⬜，则先补齐再开始 #6。规则写在纸面上不算数，**要能在会话日志里看到它被执行过**。

