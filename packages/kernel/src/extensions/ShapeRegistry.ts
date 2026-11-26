import type { Shape } from '../domain/Shape.js';
import { ShapeError } from '../domain/ShapeError.js';
import { RegistryError } from './RegistryError.js';
import type { ShapeProvider } from './ShapeProvider.js';

/**
 * 图形类型注册表。
 *
 * 三张索引分别服务三个不同的查找场景：
 * - `byKind`：`create <type>`、统计、`data-kind` 读回；
 * - `byTag`：SVG 解析时按标签名找；
 * - `byDataKind`：带 `data-kind` 的容器还原。
 *
 * `byTag` 里只放**不带 `dataKind`** 的提供者，否则 `g` 与 `box` 会抢同一个标签名。
 */
export class ShapeRegistry {
  private readonly byKind = new Map<string, ShapeProvider>();
  private readonly byTag = new Map<string, ShapeProvider>();
  private readonly byDataKind = new Map<string, ShapeProvider>();

  get size(): number {
    return this.byKind.size;
  }

  register(provider: ShapeProvider): void {
    if (this.byKind.has(provider.kind)) {
      throw RegistryError.duplicateRegistration(`shapes/${provider.kind}`);
    }
    this.byKind.set(provider.kind, provider);

    if (provider.dataKind === undefined) {
      const tag = provider.tagName ?? provider.kind;
      this.byTag.set(tag, provider);
    } else {
      this.byDataKind.set(provider.dataKind, provider);
    }
  }

  unregister(kind: string): void {
    const provider = this.byKind.get(kind);
    if (provider === undefined) {
      return;
    }
    this.byKind.delete(kind);
    if (provider.dataKind === undefined) {
      this.byTag.delete(provider.tagName ?? provider.kind);
    } else {
      this.byDataKind.delete(provider.dataKind);
    }
  }

  has(kind: string): boolean {
    return this.byKind.has(kind);
  }

  /** 取不到就报作业要求的 `unknown shape type`（带插件提示）。 */
  require(kind: string): ShapeProvider {
    const provider = this.byKind.get(kind);
    if (provider === undefined) {
      throw ShapeError.unknownShapeType(kind);
    }
    return provider;
  }

  find(kind: string): ShapeProvider | undefined {
    return this.byKind.get(kind);
  }

  /** 解析时按标签名找；带 `data-kind` 的类型不参与。 */
  forTag(tagName: string): ShapeProvider | undefined {
    return this.byTag.get(tagName);
  }

  forDataKind(dataKind: string): ShapeProvider | undefined {
    return this.byDataKind.get(dataKind);
  }

  list(): readonly ShapeProvider[] {
    return [...this.byKind.values()];
  }

  kinds(): readonly string[] {
    return [...this.byKind.keys()];
  }

  create(kind: string, id: string, values: readonly string[]): Shape {
    return this.require(kind).build(id, values);
  }

  /** 是否为不可拆开的复合图形。 */
  isComposite(kind: string): boolean {
    return this.byKind.get(kind)?.composite === true;
  }
}
