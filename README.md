# svg-editor

复旦大学《软件设计》Lab1 **Phase 1** 作业：一个通过命令行交互的 **SVG 编辑器**。

程序以 `svg>` 提示符逐行读入命令，完成 SVG 文档的**创建 / 读取 / 保存**，以及图形对象的
**创建、移动、缩放、分组、删除、属性修改、结构查看、撤销重做**。

> 设计文档（架构方案、过程记录、一致性自查、质量保证手段）见 **[doc/README.md](doc/README.md)**。
> 三天开发计划与逐提交进度看板见 **[doc/PLAN.md](doc/PLAN.md)**。

## 快速开始

```bash
npm install          # 或 pnpm install
npm run cli          # 编译并进入 REPL
```

进入 REPL 后：

```text
svg-editor 0.1 — type 'help' for commands

svg> init 800 600
canvas 800x600 created
svg> create rect bg 0 0 800 600 #ffffff
rect#bg created
svg> create text title 20 40 "My Diagram"
text#title created
svg> tree
svg (800x600)
├── rect#bg        x=0 y=0 w=800 h=600 fill=#ffffff
└── text#title     (20,40) "My Diagram"
```

也可以把命令序列存成脚本回放（`#` 开头是注释）：

```bash
node dist/main.js < doc/scenarios/basic-session.txt
```

## 命令

19 条命令，分四类。完整语法在 REPL 里输入 `help` 查看。

| 类别 | 命令 |
|---|---|
| 文档类（不进 undo 栈） | `init [w] [h]`、`read <file.svg>`、`save [file.svg]`、`canvas [w] [h]` |
| 图形编辑类（可 undo/redo） | `create <type> <id> … [in <containerId>]`、`delete`、`move`、`scale`、`set`、`group`、`ungroup`、`addto`、`front`、`back` |
| 显示类（不进 undo 栈） | `tree [id]`、`show <id>`、`help` |
| 撤销重做 | `undo`、`redo` |

`create` 的内置类型：`rect` / `circle` / `ellipse` / `line` / `text` / `g`。

## 脚本

| 命令 | 作用 |
|---|---|
| `npm run cli` | 编译 `src/` 到 `dist/` 并启动 REPL |
| `npm run build` | 只编译 |
| `npm run typecheck` | 类型检查（含 `tests/`） |
| `npm test` | 运行全部测试 |
| `npm run check:layers` | 检查依赖方向是否符合架构规则 |
| `npm run verify` | 上面四条一次跑完（提交前的门禁） |

## 环境

- Node.js >= 20.11（开发时使用 v24）
- TypeScript（`devDependencies` 内，随 `npm install` 安装）

## 目录

```text
svg-editor/
├── doc/            # 文档：README.md 为作业正文，PLAN.md 为进度看板
│   ├── scenarios/  #   可回放的会话脚本 + golden 输出
│   ├── images/     #   save 产物的真实渲染截图
│   └── quality/    #   架构检查的历史输出存档
├── src/            # 源码，按架构分层组织（domain / commands / io / registry / app / cli）
├── tests/          # 单元测试 + 场景回放
├── tools/          # 架构约束检查脚本
├── package.json
├── tsconfig.json
└── tsconfig.test.json
```

各目录的职责与依赖规则见 [doc/README.md §1](doc/README.md)。

## 质量现状

| 项 | 值 |
|---|---|
| 类型检查 | 0 错误（`strict` + `noUncheckedIndexedAccess` + `noImplicitOverride`） |
| 测试 | 175 个用例 / 13 个文件，全部通过 |
| 架构约束 | `check-layers` 违规 0 处 |
| 场景对拍 | 作业 §6 会话 69 行输出与 golden 文件逐字一致 |
