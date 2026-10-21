import type { Container } from './Container.js';
import { Numbers } from './Numbers.js';
import { ShapeError } from './ShapeError.js';

/**
 * 一个属性的读写描述。
 *
 * 之所以把属性做成"描述对象"而不是在 `setAttribute` 里写 `switch (attr)`：
 * - 属性白名单（作业 §4.1 的 `set` 白名单）由图形类型**自己声明**，
 *   校验逻辑在基类只有一份；
 * - `tree` / `show` / SVG 序列化都遍历同一份描述，不会出现"能 set 但显示不出来"的偏差。
 */
export interface AttributeSpec {
  readonly name: string;
  read(): string | undefined;
  write(raw: string): void;
}

/** 叶子的子节点列表：共享一个冻结的空数组，避免每次访问都新建对象。 */
const EMPTY_CHILDREN: readonly Shape[] = Object.freeze([]);

/**
 * 所有图形的抽象基类。
 *
 * 职责边界：只描述"一个图形是什么、能怎么变换、有哪些属性"，
 * **不认识 XML、不认识命令行、不认识 undo**（见 doc/README.md §1.3）。
 *
 * 父指针在基类，因为容器与叶子都需要它；子节点列表属于 `Container`。
 */
export abstract class Shape {
  readonly id: string;

  private parentValue: Container | null = null;
  private fillValue: string | undefined;
  private strokeValue: string | undefined;
  private strokeWidthValue: number | undefined;

  protected constructor(id: string) {
    // id 用于命令行定位，不能为空，也不能含空白（否则分词后无法还原）
    if (id.trim() === '' || /\s/.test(id)) {
      throw ShapeError.invalidId(id);
    }
    this.id = id;
  }

  /** 图形类型名，如 `rect` / `circle` / `g`。 */
  abstract get kind(): string;

  /** 父容器；画布根与游离图形为 `null`。 */
  get parent(): Container | null {
    return this.parentValue;
  }

  /**
   * 挂载/摘除时由容器维护父指针。
   * 命令层之外不应直接调用——结构变更一律走 `Document`。
   */
  attachTo(parent: Container | null): void {
    this.parentValue = parent;
  }

  /**
   * 子节点列表的**统一访问方式**：叶子恒为空，容器覆盖为真实列表。
   * 有了它，`Document` 遍历整棵树、判断"某 id 是否在某容器下"都不需要
   * `instanceof` 或 `switch (kind)`。
   */
  get children(): readonly Shape[] {
    return EMPTY_CHILDREN;
  }

  /**
   * 是否包含自身或子孙（Composite 语义）。
   * 叶子只能包含自己；容器覆盖为递归判断。
   */
  contains(shape: Shape): boolean {
    return shape === this;
  }

  /** 平移（增量）。容器会把位移递归到每个子孙。 */
  abstract move(dx: number, dy: number): void;

  /** 等比缩放：位置与尺寸同乘 `factor`。容器会递归到每个子孙。 */
  abstract scale(factor: number): void;

  /** 深拷贝，用于撤销快照与结构重组。 */
  abstract clone(): Shape;

  /** 本类型自己的几何属性；公共样式属性由基类提供。 */
  protected abstract geometryAttributes(): readonly AttributeSpec[];

  /** 单行几何描述（用于 `tree`）；没有几何信息的类型返回空串。 */
  protected abstract geometryInline(): string;

  // ── 属性 ────────────────────────────────────────────────────────────────

  attributes(): readonly AttributeSpec[] {
    return [...this.geometryAttributes(), ...this.styleAttributes()];
  }

  /** `set` 的白名单：属性名 → 是否可写，全部来自图形类型自己的声明。 */
  settableAttributes(): readonly string[] {
    return this.attributes().map((spec) => spec.name);
  }

  getAttribute(name: string): string | undefined {
    return this.attributes().find((spec) => spec.name === name)?.read();
  }

  /**
   * 模板方法：先查白名单，再交给对应的 `AttributeSpec` 做类型化赋值。
   * 校验与报错只有这一份实现，子类不需要重复写。
   */
  setAttribute(name: string, value: string): void {
    const spec = this.attributes().find((candidate) => candidate.name === name);
    if (spec === undefined) {
      throw ShapeError.unknownAttribute(name);
    }
    spec.write(value);
  }

  get fill(): string | undefined {
    return this.fillValue;
  }

  get stroke(): string | undefined {
    return this.strokeValue;
  }

  get strokeWidth(): number | undefined {
    return this.strokeWidthValue;
  }

  // ── 展示 ────────────────────────────────────────────────────────────────

  /** `rect#bg` 这种引用形式，`show` 里用于标出父节点。 */
  describeRef(): string {
    return `${this.kind}#${this.id}`;
  }

  /** `tree` 里 id 之后内联的属性串。 */
  describeInline(): string {
    return [this.geometryInline(), this.styleInline()].filter((part) => part !== '').join(' ');
  }

  /** `show` 里逐行的属性明细。 */
  describeDetailLines(): readonly string[] {
    const lines: string[] = [];
    const geometry = this.geometryInline();
    if (geometry !== '') {
      lines.push(geometry);
    }
    lines.push(...this.styleDetailLines());
    return lines;
  }

  // ── 供子类复用的工具 ────────────────────────────────────────────────────

  /**
   * 生成一个数值属性描述，解析失败会自动变成 `invalid value for <attr>`。
   * `read` 返回 `undefined` 表示该属性"未设置"——`stroke-width` 需要这种语义，
   * 否则未设置的属性会在序列化时凭空出现 `stroke-width="0"`。
   */
  protected numericSpec(
    name: string,
    read: () => number | undefined,
    write: (value: number) => void,
  ): AttributeSpec {
    return {
      name,
      read: () => {
        const value = read();
        return value === undefined ? undefined : Numbers.format(value);
      },
      write: (raw) => {
        write(Numbers.parse(name, raw));
      },
    };
  }

  /** 生成一个字符串属性描述。 */
  protected stringSpec(
    name: string,
    read: () => string | undefined,
    write: (value: string) => void,
  ): AttributeSpec {
    return {
      name,
      read,
      write: (raw) => {
        write(raw);
      },
    };
  }

  /** 把公共样式复制到克隆体上。 */
  protected copyStyleTo(target: Shape): void {
    target.fillValue = this.fillValue;
    target.strokeValue = this.strokeValue;
    target.strokeWidthValue = this.strokeWidthValue;
  }

  // ── 公共样式属性 ────────────────────────────────────────────────────────

  private styleAttributes(): AttributeSpec[] {
    return [
      this.stringSpec(
        'fill',
        () => this.fillValue,
        (value) => {
          this.fillValue = value;
        },
      ),
      this.stringSpec(
        'stroke',
        () => this.strokeValue,
        (value) => {
          this.strokeValue = value;
        },
      ),
      this.numericSpec(
        'stroke-width',
        () => this.strokeWidthValue,
        (value) => {
          this.strokeWidthValue = value;
        },
      ),
    ];
  }

  private styleInline(): string {
    return this.stylePairs()
      .map(([name, value]) => `${name}=${value}`)
      .join(' ');
  }

  private styleDetailLines(): string[] {
    return this.stylePairs().map(([name, value]) => `${name}=${value}`);
  }

  private stylePairs(): [string, string][] {
    const pairs: [string, string][] = [];
    if (this.fillValue !== undefined) {
      pairs.push(['fill', this.fillValue]);
    }
    if (this.strokeValue !== undefined) {
      pairs.push(['stroke', this.strokeValue]);
    }
    if (this.strokeWidthValue !== undefined) {
      pairs.push(['stroke-width', Numbers.format(this.strokeWidthValue)]);
    }
    return pairs;
  }
}
