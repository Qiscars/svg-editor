# svgframe-vscode — SVG Outline

作业 Lab1 Phase 2 第一部分的 VSCode 扩展：

- **A.1 SVG 文件标记**：在 Explorer 中给 `.svg` 文件加 `[]` 徽标，不重命名、不修改内容。
- **A.2 SVG 大纲**：把 SVG 元素的嵌套层级展示在 VSCode **原生 Outline**（DocumentSymbol）里，点击可跳到源码行，编辑后自动刷新，XML 不完整时大纲暂时清空且扩展不崩溃。

## 目录结构

```
packages/vscode-svg/
├── package.json          # 扩展清单（main / activationEvents / commands）
├── tsconfig.json         # extends 仓库根 tsconfig.base.json
├── README.md
├── samples/
│   └── example.svg       # 含嵌套 g、带 id 与无 id 元素的示例
└── src/
    ├── package.json      # 只把源码标记为 ESM，供仓库根 typecheck 使用（见构建说明）
    ├── OutlineBuilder.ts # 纯逻辑：容错 XML 扫描器 + OutlineNode（不 import 'vscode'）
    ├── fileBadge.ts      # 纯逻辑：isSvgPath + 徽标常量（不 import 'vscode'）
    └── extension.ts      # 唯一的 VSCode 适配层（FileDecorationProvider / DocumentSymbolProvider）

tests/vscode/
├── outline.test.ts       # 层级、命名、范围、编辑更新、不完整 XML
└── fileBadge.test.ts     # isSvgPath 正反例 + 徽标常量
```

## 安装与构建

在仓库根目录：

```bash
pnpm install
pnpm --filter svgframe-vscode build
```

也可以进入 `packages/vscode-svg/` 执行 `pnpm build`。产物在 `packages/vscode-svg/dist/`。

## 启动扩展（Extension Development Host）

**方式一：F5（推荐）**

仓库根的 `.vscode/launch.json` 已经配置好名为「运行 SVG Outline 扩展」的调试项。先构建一次，然后在 VSCode 中按 F5。Extension Development Host 会自动打开 `packages/vscode-svg/samples` 作为工作目录，方便直接验证。

**方式二：命令行**

```bash
code --extensionDevelopmentPath="<仓库绝对路径>/packages/vscode-svg"
```

（Windows 下路径用双引号包住；`code` 需要已在 PATH 中。）

## 如何验证

### A.1 文件徽标

1. 在 Extension Development Host 的 Explorer 中打开 `samples/` 目录。
2. `example.svg` 文件名右侧出现 `[]` 徽标；把文件重命名为 `example.SVG` 徽标仍在（大小写不敏感）。
3. 同目录下的 `.txt`、`.png` 等非 SVG 文件以及普通文件夹没有徽标。
4. 徽标是 `FileDecoration`，文件名与文件内容都没有被修改。

### A.2 SVG 大纲

1. 用 Extension Development Host 打开 `samples/example.svg`（语言模式为 SVG）。
2. 打开 Explorer 的 **Outline** 视图；也可以 `Ctrl+Shift+P` 执行 `SVG: 聚焦 SVG 大纲`（内部调用 `outline.focus`）。
3. 应看到如下层级（有 id 的节点显示 `标签名#id`，没有 id 的只显示标签名）：

   ```text
   svg
   ├── rect#background
   ├── g#frame
   │   ├── rect#outer
   │   └── g#markers
   │       ├── circle#top-left
   │       ├── circle
   │       └── circle
   └── g#caption
       └── text
   ```

4. 点击任意节点，编辑器的光标/选区应跳到对应的源码行（选区落在标签名上）。
5. 编辑验证：删掉一个 `</g>`，大纲会暂时清空但扩展不崩溃；补回后再出现。编辑时每次文本变化都会重新解析并触发 `onDidChangeDocumentSymbols`。

## 设计说明

- **纯逻辑与适配层分离**
  - `OutlineBuilder.ts` 只认识字符串：输入 SVG 文本，输出 `OutlineNode[]`（`name`、`range`、`selectionRange`、`children`）。它不 import `vscode`，所以可以直接用 Node/vitest 测试。
  - `fileBadge.ts` 只有 `isSvgPath(path)` 和徽标常量，同样不 import `vscode`。
  - `extension.ts` 是唯一 import `vscode` 的文件：把 `isSvgPath` 接到 `FileDecorationProvider`，把 `OutlineNode` 翻译成 `vscode.DocumentSymbol` / `vscode.Range`，并注册 `onDidChangeTextDocument` 监听。
- **自己写的容错 XML 扫描器**（`XmlOutlineScanner`）
  - 记录每个元素开始标签的偏移，用预计算的行首偏移把 offset 换算成 0-based 行/列。
  - 跳过 `<?xml …?>`、注释、`<![CDATA[ … ]]>`、DOCTYPE；支持自闭合标签。
  - 扫描属性时按引号成对跳过，所以属性值里的 `>` 不会被误判成标签结束。
  - 未闭合、结束标签不匹配、属性值没有引号等结构错误一律抛 `XmlOutlineError`。
- **不完整 XML 的处理**：`OutlineBuilder.build` 捕获 `XmlOutlineError` 并返回 `[]`；适配层看到空数组就返回空大纲，因此编辑到一半的文档不会让扩展崩溃。`XmlOutlineScanner.parse()` 仍然保持“抛错”的严格契约，方便测试和别的调用方决定如何处理。
- **输出格式为 CommonJS，兼容 `engines.vscode >= 1.85` 的扩展宿主**
  - 扩展根的 `package.json` 不声明 `"type": "module"`，所以 `dist/*.js` 被 Node 当作 CJS，VSCode 1.85 的 `require()` 能直接加载。
  - `src/package.json` 只把源码标记为 ESM，使仓库根的 `tsconfig.test.json`（启用 `verbatimModuleSyntax`）在 typecheck `tests/vscode` 导入的源文件时不把 ESM 语法误判为 CJS。
  - 本包的 `tsconfig.json` 因此显式覆盖 `module: CommonJS`、`moduleResolution: Bundler` 与 `verbatimModuleSyntax: false`；`strict`、`noUncheckedIndexedAccess`、`noImplicitOverride` 等严格选项仍全部继承。

## 测试

在仓库根目录执行：

```bash
pnpm exec vitest run tests/vscode
```

测试覆盖：嵌套层级、无 id 命名、根元素 id、源码范围（第 3 行的元素起点行号为 2）、属性引号中的 `>`、注释 / CDATA、自闭合、编辑更新、无状态、不完整 XML 返回空数组、`isSvgPath` 正反例。

## 已知限制

- 不做完整 SVG 规范校验，不解析命名空间 / DTD；`id` 按源码原文展示。
- 大纲只展示元素，不展示文本节点和属性。
- 文件徽标只按路径扩展名判断，`FileDecorationProvider` 是同步 API、拿不到文件类型，因此一个名字以 `.svg` 结尾的**目录**也会得到徽标；普通目录不受影响。
