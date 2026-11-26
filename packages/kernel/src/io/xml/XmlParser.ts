import { XmlElement } from './XmlElement.js';

/**
 * 够用的 XML 递归下降解析器。
 *
 * 覆盖我们实际需要的语法：声明 `<?xml …?>`、注释、元素嵌套、自闭合、
 * 属性（单/双引号）、文本与字符实体。遇到标签不匹配、元素未闭合等
 * 结构错误会直接抛异常，由 `SvgParser` 包装成 `invalid SVG` 领域错误。
 *
 * 之所以自己写而不引入第三方：需要支持的语法子集很小，而依赖会带来
 * 版本与解析行为的不确定性；这里的每一条分支都能被单测直接覆盖。
 */
export class XmlParser {
  private source = '';
  private pos = 0;

  parse(source: string): XmlElement {
    this.source = source;
    this.pos = 0;

    this.skipMisc();
    if (!this.at('<')) {
      throw new Error('expected a root element');
    }
    const root = this.readElement();
    this.skipMisc();
    if (this.pos < this.source.length) {
      throw new Error(`unexpected trailing content at offset ${this.pos}`);
    }
    return root;
  }

  // ── 元素 ────────────────────────────────────────────────────────────────

  private readElement(): XmlElement {
    this.expect('<');
    const tagName = this.readName();
    const attributes: [string, string][] = [];

    for (;;) {
      this.skipWhitespace();
      if (this.consume('/>')) {
        return new XmlElement(tagName, attributes);
      }
      if (this.consume('>')) {
        break;
      }
      const name = this.readName();
      if (name === '') {
        throw new Error(`expected an attribute name in <${tagName}>`);
      }
      this.skipWhitespace();
      this.expect('=');
      this.skipWhitespace();
      attributes.push([name, this.readQuoted()]);
    }

    const element = new XmlElement(tagName, attributes);
    this.readContent(element);
    return element;
  }

  private readContent(element: XmlElement): void {
    for (;;) {
      if (this.pos >= this.source.length) {
        throw new Error(`unclosed element <${element.tagName}>`);
      }
      if (this.at('</')) {
        this.pos += 2;
        const closing = this.readName();
        if (closing !== element.tagName) {
          throw new Error(`mismatched closing tag </${closing}> for <${element.tagName}>`);
        }
        this.skipWhitespace();
        this.expect('>');
        return;
      }
      if (this.at('<!--')) {
        this.skipComment();
        continue;
      }
      if (this.at('<')) {
        element.appendChild(this.readElement());
        continue;
      }
      element.appendText(decodeEntities(this.readText()));
    }
  }

  // ── 词法 ────────────────────────────────────────────────────────────────

  private skipMisc(): void {
    for (;;) {
      this.skipWhitespace();
      if (this.at('<?')) {
        this.skipUntil('?>');
        continue;
      }
      if (this.at('<!--')) {
        this.skipComment();
        continue;
      }
      if (this.at('<!')) {
        // DOCTYPE 等；不展开，直接跳到与之对应的 '>'
        this.skipUntil('>');
        continue;
      }
      return;
    }
  }

  private skipComment(): void {
    const end = this.source.indexOf('-->', this.pos + 4);
    if (end === -1) {
      throw new Error('unclosed comment');
    }
    this.pos = end + 3;
  }

  private skipUntil(token: string): void {
    const end = this.source.indexOf(token, this.pos);
    if (end === -1) {
      throw new Error(`unterminated construct, expected ${token}`);
    }
    this.pos = end + token.length;
  }

  private readName(): string {
    const start = this.pos;
    while (this.pos < this.source.length) {
      const char = this.source[this.pos] as string;
      if (char === ' ' || char === '\t' || char === '\n' || char === '\r' || char === '/' || char === '>' || char === '=') {
        break;
      }
      this.pos += 1;
    }
    return this.source.slice(start, this.pos);
  }

  private readQuoted(): string {
    const quote = this.source[this.pos];
    if (quote !== '"' && quote !== "'") {
      throw new Error(`expected a quoted attribute value at offset ${this.pos}`);
    }
    this.pos += 1;
    const end = this.source.indexOf(quote, this.pos);
    if (end === -1) {
      throw new Error('unterminated attribute value');
    }
    const raw = this.source.slice(this.pos, end);
    this.pos = end + 1;
    return decodeEntities(raw);
  }

  private readText(): string {
    const start = this.pos;
    const end = this.source.indexOf('<', this.pos);
    this.pos = end === -1 ? this.source.length : end;
    return this.source.slice(start, this.pos);
  }

  private skipWhitespace(): void {
    while (this.pos < this.source.length) {
      const char = this.source[this.pos] as string;
      if (char !== ' ' && char !== '\t' && char !== '\n' && char !== '\r') {
        return;
      }
      this.pos += 1;
    }
  }

  private at(token: string): boolean {
    return this.source.startsWith(token, this.pos);
  }

  private consume(token: string): boolean {
    if (!this.at(token)) {
      return false;
    }
    this.pos += token.length;
    return true;
  }

  private expect(token: string): void {
    if (!this.consume(token)) {
      throw new Error(`expected '${token}' at offset ${this.pos}`);
    }
  }
}

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  lt: '<',
  gt: '>',
  amp: '&',
  quot: '"',
  apos: "'",
};

export function decodeEntities(raw: string): string {
  return raw.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, body: string) => {
    if (body.startsWith('#x') || body.startsWith('#X')) {
      const code = Number.parseInt(body.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    if (body.startsWith('#')) {
      const code = Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[body] ?? match;
  });
}
