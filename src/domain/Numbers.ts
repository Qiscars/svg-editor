import { ShapeError } from './ShapeError.js';

/**
 * 数值的解析与格式化。
 *
 * 统一在这里处理两件容易散落各处的事：
 * - **解析**：`set r abc` 这类非法输入要变成领域错误，而不是 `NaN` 悄悄流进几何运算；
 * - **格式化**：`tree` / `show` / SVG 序列化共用同一套数字写法——整数不带 `.0`，
 *   小数去掉浮点噪声（`0.1 + 0.2` 不该显示成 `0.30000000000000004`）。
 */
export class Numbers {
  private static readonly MAX_DECIMALS = 6;

  static parse(attribute: string, raw: string): number {
    const text = raw.trim();
    const value = Number(text);
    if (text === '' || !Number.isFinite(value)) {
      throw ShapeError.invalidValue(attribute, raw);
    }
    return value;
  }

  static format(value: number): string {
    if (Number.isInteger(value)) {
      return String(value);
    }
    const rounded = Number(value.toFixed(Numbers.MAX_DECIMALS));
    return String(rounded);
  }

  /** `(20,40)` 这种坐标对，`text` 与 `line` 共用。 */
  static formatPoint(x: number, y: number): string {
    return `(${Numbers.format(x)},${Numbers.format(y)})`;
  }
}
