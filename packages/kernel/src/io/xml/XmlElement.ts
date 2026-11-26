/**
 * 一个 XML 元素的最小模型：标签名 + 属性 + 子元素 + 文本。
 *
 * 只做到 SVG 解析需要的程度（属性、嵌套、文本、注释），
 * 不做命名空间解析、不做 DTD 展开——`xmlns` 只是一个普通属性。
 */
export class XmlElement {
  readonly tagName: string;
  private readonly attributeMap: Map<string, string>;
  private readonly childList: XmlElement[] = [];
  private readonly textParts: string[] = [];

  constructor(tagName: string, attributes: readonly (readonly [string, string])[] = []) {
    this.tagName = tagName;
    this.attributeMap = new Map(attributes);
  }

  get attributes(): ReadonlyMap<string, string> {
    return this.attributeMap;
  }

  get children(): readonly XmlElement[] {
    return this.childList;
  }

  /** 直接子文本（已做实体解码）。 */
  get text(): string {
    return this.textParts.join('');
  }

  attribute(name: string): string | undefined {
    return this.attributeMap.get(name);
  }

  appendChild(child: XmlElement): void {
    this.childList.push(child);
  }

  appendText(text: string): void {
    this.textParts.push(text);
  }
}
