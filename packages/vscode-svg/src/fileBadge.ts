/**
 * 文件徽标的纯逻辑层。
 *
 * 这里刻意不 import 'vscode'：`isSvgPath` 只做路径字符串判断，
 * 因此可以在 Node / vitest 中直接测试，也可以被任何宿主复用。
 */

/**
 * Explorer 中显示的徽标文本。
 * VSCode 的 `FileDecoration.badge` 要求 1–2 个字符，`[]` 正好是两个。
 */
export const SVG_FILE_BADGE = '[]';

/** 若编辑器为 `.svg` 注册了独立语言，会用到这个 id。 */
export const SVG_LANGUAGE_ID = 'svg';

/**
 * 大小写不敏感地判断一个路径是否指向 `.svg` 文件。
 *
 * 只看最后一段路径（同时接受 `/` 与 `\` 分隔符），所以：
 * - `a.svg`、`A.SVG`、`dir/a.svg` → true
 * - `a.svg.png`、`dir.svg/x`、`a.png` → false
 *
 * 注意：仅凭路径无法区分「名字以 .svg 结尾的目录」，这个边界由调用方
 * （VSCode 的 Explorer）的上下文决定；普通目录不会以 .svg 结尾。
 */
export function isSvgPath(path: string): boolean {
  const lastSeparator = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  const baseName = path.slice(lastSeparator + 1);
  return baseName.length > 4 && baseName.toLowerCase().endsWith('.svg');
}

/**
 * 判断一个**已打开的文档**是否该由本扩展提供大纲。
 *
 * 为什么不能只看语言 id：VSCode 内置把 `.svg` 关联到 **`xml`** 语言
 * （没有内置的 `svg` 语言 id），所以只注册 `{ language: 'svg' }` 的
 * provider 永远不会被调用——Outline 会显示 "No symbols found in document"。
 *
 * 因此这里用「语言 id 是 svg **或** 路径以 .svg 结尾」的**双判据**：
 * - 覆盖默认的 `xml` 语言；
 * - 也覆盖用户手动把 .svg 切成别的语言（或某些扩展注册了 svg 语言）的情况。
 */
export function isSvgDocument(languageId: string, path: string): boolean {
  return languageId === SVG_LANGUAGE_ID || isSvgPath(path);
}
