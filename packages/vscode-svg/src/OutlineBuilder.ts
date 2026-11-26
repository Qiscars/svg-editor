/**
 * SVG 大纲的纯逻辑层。
 *
 * 本文件刻意不 import 'vscode'：输入是 SVG 文本，输出是与编辑器无关的
 * `OutlineNode[]`。因此它既能在 Node / vitest 里直接测试，也能被别的宿主复用；
 * VSCode 的类型（DocumentSymbol / Range）只在 `extension.ts` 里出现。
 *
 * 错误策略：结构错误（未闭合、结束标签不匹配、属性值没有引号……）由内部的
 * `XmlOutlineScanner` 抛 `XmlOutlineError`；`OutlineBuilder.build` 捕获后返回
 * 空数组——这就是「编辑到一半的 SVG 只会暂时清空大纲，扩展不会崩溃」的实现。
 */

export interface OutlinePosition {
  /** 0-based 行号，与 VSCode 的约定一致。 */
  readonly line: number;
  /** 0-based 列号（UTF-16 code unit），与 VSCode 的约定一致。 */
  readonly character: number;
}

/** 范围采用半开区间：`start` 包含、`end` 不包含。 */
export interface OutlineRange {
  readonly start: OutlinePosition;
  readonly end: OutlinePosition;
}

export interface OutlineNode {
  /** 展示名：有 id 时是 `标签名#id`，否则只有标签名。 */
  readonly name: string;
  readonly tagName: string;
  readonly id: string | undefined;
  /** 整个元素：开始标签的 `<` 到结束标签的 `>` 之后。 */
  readonly range: OutlineRange;
  /** 标签名本身的范围，供 VSCode 的 selectionRange 使用。 */
  readonly selectionRange: OutlineRange;
  readonly children: readonly OutlineNode[];
}

/** 结构不完整时抛出；调用方据此判定「暂时无法解析」。 */
export class XmlOutlineError extends Error {
  readonly offset: number | undefined;

  constructor(message: string, offset?: number) {
    super(offset === undefined ? message : `${message}（偏移 ${offset}）`);
    this.name = 'XmlOutlineError';
    this.offset = offset;
  }
}

/**
 * 自己写的容错 XML 扫描器：只关心「元素从哪开始、到哪结束、谁是谁的孩子」。
 *
 * 支持：XML 声明 / 注释 / DOCTYPE / CDATA / 自闭合标签 / 单双引号属性。
 * 属性值里的 `>` 不会被误判为标签结束，因为扫描属性时按引号成对跳过。
 * 不做命名空间解析、不展开 DTD、不校验 SVG 语义。
 */
export class XmlOutlineScanner {
  private readonly text: string;
  private readonly lineStarts: readonly number[];
  private pos = 0;

  constructor(text: string) {
    this.text = text;
    this.lineStarts = computeLineStarts(text);
  }

  /**
   * 返回顶层元素。正常 SVG 只有一个 `<svg>`；允许返回多个是为了对
   * XML fragment 宽容（大纲只是展示，不承担校验职责）。
   */
  parse(): OutlineNode[] {
    const roots: OutlineNode[] = [];
    this.skipMisc();

    while (this.pos < this.text.length) {
      if (!this.startsWith('<')) {
        throw new XmlOutlineError('根元素之外出现了文本', this.pos);
      }
      if (this.startsWith('</')) {
        throw new XmlOutlineError('多余的结束标签', this.pos);
      }
      roots.push(this.readElement());
      this.skipMisc();
    }

    if (roots.length === 0) {
      throw new XmlOutlineError('没有找到根元素');
    }
    return roots;
  }

  // ── 元素 ────────────────────────────────────────────────────────────────

  private readElement(): OutlineNode {
    const startOffset = this.pos;
    this.expect('<');

    const nameStart = this.pos;
    const tagName = this.readName();
    if (tagName === '') {
      throw new XmlOutlineError('开始标签缺少标签名', this.pos);
    }
    const nameEnd = this.pos;

    let id: string | undefined;
    let selfClosing = false;

    for (;;) {
      this.skipWhitespace();
      if (this.consume('/>')) {
        selfClosing = true;
        break;
      }
      if (this.consume('>')) {
        break;
      }

      const attributeStart = this.pos;
      const attributeName = this.readName();
      if (attributeName === '') {
        throw new XmlOutlineError(`<${tagName}> 的属性名缺失`, attributeStart);
      }
      this.skipWhitespace();
      this.expect('=');
      this.skipWhitespace();
      const value = this.readQuoted();
      if (attributeName === 'id' && value.trim() !== '') {
        id = value;
      }
    }

    const selectionRange = this.rangeOf(nameStart, nameEnd);

    if (selfClosing) {
      return {
        name: displayName(tagName, id),
        tagName,
        id,
        range: this.rangeOf(startOffset, this.pos),
        selectionRange,
        children: [],
      };
    }

    const children = this.readContent(tagName);
    return {
      name: displayName(tagName, id),
      tagName,
      id,
      range: this.rangeOf(startOffset, this.pos),
      selectionRange,
      children,
    };
  }

  private readContent(tagName: string): OutlineNode[] {
    const children: OutlineNode[] = [];

    for (;;) {
      if (this.pos >= this.text.length) {
        throw new XmlOutlineError(`元素 <${tagName}> 没有闭合`, this.pos);
      }
      if (this.startsWith('</')) {
        this.pos += 2;
        const closingName = this.readName();
        if (closingName !== tagName) {
          throw new XmlOutlineError(
            `结束标签 </${closingName}> 与开始标签 <${tagName}> 不匹配`,
            this.pos,
          );
        }
        this.skipWhitespace();
        this.expect('>');
        return children;
      }
      if (this.startsWith('<!--')) {
        this.skipComment();
        continue;
      }
      if (this.startsWith('<![CDATA[')) {
        this.skipUntil(']]>');
        continue;
      }
      if (this.startsWith('<?')) {
        this.skipUntil('?>');
        continue;
      }
      if (this.startsWith('<!')) {
        this.skipDeclaration();
        continue;
      }
      if (this.startsWith('<')) {
        children.push(this.readElement());
        continue;
      }

      // 文本节点：大纲里不展示，直接跳到下一个 '<'。
      const nextTag = this.text.indexOf('<', this.pos);
      this.pos = nextTag === -1 ? this.text.length : nextTag;
    }
  }

  // ── 词法 ────────────────────────────────────────────────────────────────

  /** 跳过根元素前后的空白、XML 声明、注释、CDATA 与 DOCTYPE。 */
  private skipMisc(): void {
    for (;;) {
      this.skipWhitespace();
      if (this.startsWith('<?')) {
        this.skipUntil('?>');
        continue;
      }
      if (this.startsWith('<!--')) {
        this.skipComment();
        continue;
      }
      if (this.startsWith('<![CDATA[')) {
        this.skipUntil(']]>');
        continue;
      }
      if (this.startsWith('<!')) {
        this.skipDeclaration();
        continue;
      }
      return;
    }
  }

  private skipComment(): void {
    const end = this.text.indexOf('-->', this.pos + 4);
    if (end === -1) {
      throw new XmlOutlineError('注释没有闭合', this.pos);
    }
    this.pos = end + 3;
  }

  private skipUntil(token: string): void {
    const end = this.text.indexOf(token, this.pos);
    if (end === -1) {
      throw new XmlOutlineError(`期望 ${token} 结束当前结构`, this.pos);
    }
    this.pos = end + token.length;
  }

  /** DOCTYPE 可能带内部子集（`[...]`）和引号，逐字符扫描直到配对的 `>`。 */
  private skipDeclaration(): void {
    let depth = 0;
    let quote: string | undefined;
    this.pos += 2;

    while (this.pos < this.text.length) {
      const char = this.text[this.pos] ?? '';
      if (quote !== undefined) {
        if (char === quote) {
          quote = undefined;
        }
      } else if (char === '"' || char === "'") {
        quote = char;
      } else if (char === '[') {
        depth += 1;
      } else if (char === ']') {
        depth = Math.max(0, depth - 1);
      } else if (char === '>' && depth === 0) {
        this.pos += 1;
        return;
      }
      this.pos += 1;
    }

    throw new XmlOutlineError('声明没有闭合', this.pos);
  }

  private readName(): string {
    const start = this.pos;
    while (this.pos < this.text.length) {
      const char = this.text[this.pos] ?? '';
      if (
        char === ' ' ||
        char === '\t' ||
        char === '\n' ||
        char === '\r' ||
        char === '/' ||
        char === '>' ||
        char === '=' ||
        char === '<' ||
        char === '?'
      ) {
        break;
      }
      this.pos += 1;
    }
    return this.text.slice(start, this.pos);
  }

  private readQuoted(): string {
    const quote = this.text[this.pos];
    if (quote !== '"' && quote !== "'") {
      throw new XmlOutlineError('属性值必须用引号包裹', this.pos);
    }
    const end = this.text.indexOf(quote, this.pos + 1);
    if (end === -1) {
      throw new XmlOutlineError('属性值没有闭合', this.pos);
    }
    const value = this.text.slice(this.pos + 1, end);
    this.pos = end + 1;
    return value;
  }

  private skipWhitespace(): void {
    while (this.pos < this.text.length) {
      const char = this.text[this.pos] ?? '';
      if (char !== ' ' && char !== '\t' && char !== '\n' && char !== '\r' && char !== '\uFEFF') {
        return;
      }
      this.pos += 1;
    }
  }

  // ── 位置换算 ────────────────────────────────────────────────────────────

  private rangeOf(startOffset: number, endOffset: number): OutlineRange {
    return { start: this.positionAt(startOffset), end: this.positionAt(endOffset) };
  }

  private positionAt(offset: number): OutlinePosition {
    const clamped = Math.max(0, Math.min(offset, this.text.length));
    let low = 0;
    let high = this.lineStarts.length - 1;
    let line = 0;

    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      const lineStart = this.lineStarts[middle] ?? 0;
      if (lineStart <= clamped) {
        line = middle;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }

    return { line, character: clamped - (this.lineStarts[line] ?? 0) };
  }

  // ── 小工具 ──────────────────────────────────────────────────────────────

  private startsWith(token: string): boolean {
    return this.text.startsWith(token, this.pos);
  }

  private consume(token: string): boolean {
    if (!this.startsWith(token)) {
      return false;
    }
    this.pos += token.length;
    return true;
  }

  private expect(token: string): void {
    if (!this.consume(token)) {
      throw new XmlOutlineError(`期望 '${token}'`, this.pos);
    }
  }
}

/**
 * 无状态的大纲构建器：`build` 只依赖入参，不缓存、不残留上一次解析的状态。
 * 结构不完整时返回空数组；调用方（VSCode 适配层）据此清空大纲即可。
 */
export class OutlineBuilder {
  build(text: string): OutlineNode[] {
    try {
      return new XmlOutlineScanner(text).parse();
    } catch {
      return [];
    }
  }
}

/** 便捷函数形式，适合在测试或别的宿主里一次性调用。 */
export function buildOutline(text: string): OutlineNode[] {
  return new OutlineBuilder().build(text);
}

function displayName(tagName: string, id: string | undefined): string {
  return id === undefined ? tagName : `${tagName}#${id}`;
}

/**
 * 预先算好每一行的起始偏移。`\r\n` 按一个换行处理，单独的 `\r`
 * 也算换行（与 VSCode 的 TextDocument 行为一致）。
 */
function computeLineStarts(text: string): number[] {
  const starts: number[] = [0];

  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code === 0x0d) {
      if (text.charCodeAt(index + 1) === 0x0a) {
        index += 1;
      }
      starts.push(index + 1);
    } else if (code === 0x0a) {
      starts.push(index + 1);
    }
  }

  return starts;
}
