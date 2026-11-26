# svg-editor

复旦大学《软件设计》Lab1 作业：一个通过命令行交互的 **SVG 编辑器**。

程序以 `svg>` 提示符逐行读入命令，完成 SVG 文档的**创建 / 读取 / 保存**，以及图形对象的
**创建、移动、缩放、分组、删除、属性修改、结构查看、撤销重做**。

Phase 2 在 Phase 1 的基础上做了两件事：

1. **VSCode 插件实践**：`packages/vscode-svg` 提供 SVG 文件的 `[]` 徽标与原生大纲；
2. **CLI 插件式重构**：内核只保留接口与注册表，具体能力（含内置的六种图形与 17 条命令）
   全部从外面注册进来；四个扩展点 + 一个不硬编码任何插件的加载器 + 两种装配方式。

> 设计文档（架构方案、过程记录、一致性自查、质量保证手段、Phase 2 的扩展点与 ADR）
> 见 **[doc/README.md](doc/README.md)**。
> 三天开发计划与逐提交进度看板见 **[doc/PLAN.md](doc/PLAN.md)**。

## 快速开始

```bash
pnpm install            # 安装 workspace 依赖
pnpm run build          # 构建全部包
pnpm run cli            # 构建并进入 REPL（代码装配，含全部插件）
```

进入 REPL 后：

```text
svg-editor 0.1 — type 'help' for commands

svg> init 800 600
canvas 800x600 created
svg> create box n1 120 100 160 60 "开始"
box#n1 created (g#n1 + rect#n1-rect + text#n1-label)
svg> tree
svg (800x600)
└── g#n1 (box)
    ├── rect#n1-rect   x=120 y=100 w=160 h=60
    └── text#n1-label  (140,135) "开始"
```

也可以把命令序列存成脚本回放（`#` 开头是注释）：

```bash
node packages/host/dist/main.js < doc/transcript/cli-2-box.txt
```

两种装配方式（Phase 2）：

```bash
node packages/host/dist/main.js                                    # 方式 A：代码装配
node packages/host/dist/main.js --config plugins.config.json       # 方式 B：配置装配
node packages/host/dist/main.js --config plugins.baseline.json     # 禁用全部可选插件（Phase 1 基线）
```

## 命令

21 条命令：Phase 1 的 19 条 + 插件提供的 `stats`（按类型统计）与 `dir`（列目录），
`help` 会按注册顺序列出当前**实际可用**的全部命令。

| 类别 | 命令 |
|---|---|
| 文档类（不进 undo 栈） | `init [w] [h]`、`read <file.svg>`、`save [file.svg]`、`canvas [w] [h]` |
| 图形编辑类（可 undo/redo） | `create <type> <id> … [in <containerId>]`、`delete`、`move`、`scale`、`set`、`group`、`ungroup`、`addto`、`front`、`back` |
| 显示类（不进 undo 栈） | `tree [id]`、`show <id>`、`help` |
| 撤销重做 | `undo`、`redo` |
| 插件提供 | `stats`、`dir` |

`create` 的内置类型：`rect` / `circle` / `ellipse` / `line` / `text` / `g`；
插件 `shape-box` 追加 `box`（带标题的矩形框，复合图形）。

## 脚本

| 命令 | 作用 |
|---|---|
| `pnpm run build` | 构建全部 workspace 包 |
| `pnpm run cli` | 构建并启动 REPL |
| `pnpm run typecheck` | 类型检查（含 `tests/`） |
| `pnpm test` | 运行全部测试 |
| `pnpm run check:layers` | 检查依赖方向是否符合架构规则 |
| `pnpm run metrics` | 重新生成 `docs/metrics/metrics.md` |
| `node tools/verify-assembly.mjs` | 双装配逐字节对拍 + Phase 1 基线回归 |
| `pnpm run verify` | 上面几条一次跑完（提交前的门禁） |

## 环境

- Node.js >= 20.11（开发时使用 v24）
- pnpm（workspace 管理器）
- VSCode >= 1.85（仅运行扩展时需要）

## VSCode 扩展

```bash
pnpm --filter svgframe-vscode run build
```

用 VSCode 打开本仓库，按 **F5** 启动 Extension Development Host，然后：

1. 在 Explorer 里看到 `.svg` 文件右侧的 `[]` 徽标；
2. 打开 `packages/vscode-svg/samples/example.svg`，在 **Outline** 面板看到元素层级；
3. 点击任一节点跳到对应源码；修改文件后大纲自动更新。

细节见 [`packages/vscode-svg/README.md`](packages/vscode-svg/README.md)。

## 文档 PDF（提交用）

作业平台要求上传**一份文件**，所以文档除了 Markdown 原稿，还提供了一份自包含的
[`doc/README.pdf`](doc/README.pdf)（已随 Phase 2 重新生成，图片内联）。重新生成：

```bash
node tools/md-to-html.mjs                       # Markdown → 自包含 HTML
msedge --headless --no-pdf-header-footer \
  --print-to-pdf=doc/README.pdf out/doc-build/README.html
```

组件图也可以重渲染（需要 `plantuml.jar`）：

```bash
java -jar plantuml.jar -tpng -charset UTF-8 doc/diagrams/component.puml
java -jar plantuml.jar -tpng -charset UTF-8 doc/diagrams/phase2-components.puml
```

## 目录

```text
svg-editor/
├── doc/                    # 文档：README.md 为作业正文，PLAN.md 为进度看板
│   ├── diagrams/           #   组件图（PlantUML 源码 + 渲染产物）
│   ├── transcript/         #   Phase 2 的三份回放会话
│   ├── scenarios/          #   Phase 1 的可回放会话 + golden 输出
│   ├── images/             #   save 产物的真实渲染截图
│   └── quality/            #   架构检查的历史输出存档
├── docs/metrics/           # 由 tools/metrics.mjs 生成的指标（勿手改）
├── packages/
│   ├── kernel/             # 内核：domain / commands / io / app / extensions / builtin
│   ├── host/               # 宿主：cli（解析、渲染、命令表）+ loader + assembly（装配）
│   └── vscode-svg/         # VSCode 扩展：纯逻辑 + 薄适配层
├── plugins/                # 四个插件包：shape-box / command-stats / command-dir / tree-star
├── tests/                  # 单元测试 + 场景回放 + 插件测试 + 扩展的纯逻辑测试
├── tools/                  # 架构约束检查、指标、双装配对拍、文档构建
├── plugins.config.json     # 配置装配的插件清单
├── plugins.baseline.json   # 禁用全部可选插件（Phase 1 基线）
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

各包的职责与依赖规则见 [doc/README.md §1](doc/README.md) 与 §7。

## 质量现状

| 项 | 值 |
|---|---|
| 类型检查 | 0 错误（`strict` + `noUncheckedIndexedAccess` + `noImplicitOverride`） |
| 测试 | 259 个用例 / 19 个文件，全部通过 |
| 架构约束 | `check-layers` 违规 0 处（含"除组合根外不得 import 插件"） |
| 双装配一致性 | 三份会话在代码装配 / 配置装配下输出逐字节一致 |
| Phase 1 基线 | 禁用全部可选插件后与 tag `final` 的 golden 逐字节一致 |
