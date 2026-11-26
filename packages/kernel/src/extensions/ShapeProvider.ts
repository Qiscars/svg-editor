import type { Shape } from '../domain/Shape.js';

/**
 * 读回一个复合图形时交给插件的上下文。
 *
 * 解析器已经把所有子元素建好并放进 `children`，但**尚未挂回文档**——
 * 插件可以在这里校验子部件、构造自己的图形类，抛错表示拒绝整份读入。
 */
export interface ReadBackContext {
  readonly id: string;
  readonly attributes: ReadonlyMap<string, string>;
  readonly children: readonly Shape[];
}

/**
 * 图形类型扩展点：一种图形类型。
 *
 * 内核只通过这个接口认识"图形类型"，不认识任何具体的类型名。
 * 内置的六种类型与插件提供的 `box` 走完全同一条注册与查找路径。
 */
export interface ShapeProvider {
  /** 类型名，也就是 `create <type>` 的名字与统计用的键 */
  readonly kind: string;

  /** `create` 的位置参数名（与 SVG 属性同名） */
  readonly parameters: readonly string[];

  /** 几何参数之后可选跟一个样式值，例如 rect 的 `fill`、line 的 `stroke` */
  readonly optionalStyle?: string;

  /** 序列化时使用的标签名；缺省与 `kind` 相同 */
  readonly tagName?: string;

  /**
   * 序列化时写入的 `data-kind` 标记；缺省不写。
   * 用于读回时把普通 `<g>` 还原成复合图形。
   */
  readonly dataKind?: string;

  /** 是否为不可拆开的复合图形（`ungroup` 会拒绝它） */
  readonly composite?: boolean;

  /** `create` 时构造图形 */
  build(id: string, values: readonly string[]): Shape;

  /**
   * 读回复合图形：解析器建好子节点后调用。
   * 返回的图形会替换掉临时的容器。只有 `composite` 类型需要实现。
   */
  restore?(context: ReadBackContext): Shape;

  /**
   * 子部件守卫：普通命令（delete / addto / group）想把子节点从该图形上摘走时调用。
   *
   * 抛错即拒绝该命令。复合图形的内部结构归插件所有，插件可以借此保证不变量；
   * 不实现表示"可以随意摘走"。
   */
  guardChildRemoval?(parent: Shape, child: Shape): void;
}
