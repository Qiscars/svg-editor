# svg-editor

复旦大学《软件设计》Lab1 **Phase 1** 作业：一个通过命令行交互的 **SVG 编辑器**。

程序以 `svg>` 提示符逐行读入命令，完成 SVG 文档的**创建 / 读取 / 保存**，以及图形对象的
**创建、移动、缩放、分组、删除、属性修改、结构查看、撤销重做**。

> 设计文档（架构方案、过程记录、一致性自查、质量保证手段）见 **[doc/README.md](doc/README.md)**。

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
...
```

## 脚本

| 命令 | 作用 |
|---|---|
| `npm run cli` | 编译 `src/` 到 `dist/` 并启动 REPL |
| `npm run build` | 只编译 |
| `npm run typecheck` | 类型检查（含 `tests/`） |
| `npm test` | 运行单元测试 |

## 环境

- Node.js >= 20.11（开发时使用 v24）
- TypeScript（`devDependencies` 内，随 `npm install` 安装）

## 目录

```text
svg-editor/
├── doc/            # 设计文档（doc/README.md 为作业正文）
├── src/            # 源码，按架构分层组织
├── tests/          # 单元测试
├── package.json
├── tsconfig.json
└── tsconfig.test.json
```

各目录的职责与依赖规则见 [doc/README.md §1](doc/README.md)。
