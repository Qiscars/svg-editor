import { Container } from './Container.js';
import { Numbers } from './Numbers.js';

/**
 * 画布根容器（对应 `<svg width height viewBox>`）。
 *
 * 两个约定：
 * - id 固定为 `svg`，但**不进入 id 索引**——命令不能 `delete svg` / `move svg`，
 *   否则文档会失去根节点。`tree` 不带参数即显示整份文档，不需要通过 id 找到它。
 * - 尺寸是画布属性，不参与 `move` / `scale`：容器变换的是"里面的图形"。
 */
export class Canvas extends Container {
  static readonly ROOT_ID = 'svg';

  private widthValue: number;
  private heightValue: number;

  constructor(width: number, height: number) {
    super(Canvas.ROOT_ID);
    this.widthValue = width;
    this.heightValue = height;
  }

  override get kind(): string {
    return 'svg';
  }

  get width(): number {
    return this.widthValue;
  }

  get height(): number {
    return this.heightValue;
  }

  /** `canvas <w> <h>` 命令的落点。 */
  resize(width: number, height: number): void {
    this.widthValue = width;
    this.heightValue = height;
  }

  /** `tree` / `show` 里画布根显示为 `svg`，其余图形显示为 `rect#r1`。 */
  override describeRef(): string {
    return Canvas.ROOT_ID;
  }

  /** 画布尺寸不随图形变换改变。 */
  override move(_dx: number, _dy: number): void {
    return;
  }

  override scale(_factor: number): void {
    return;
  }

  /** 画布根的单行摘要，`tree` 的第一行。 */
  describeHeader(): string {
    return `${Canvas.ROOT_ID} (${Numbers.format(this.widthValue)}x${Numbers.format(this.heightValue)})`;
  }

  protected override createClone(): Container {
    const copy = new Canvas(this.widthValue, this.heightValue);
    this.copyStyleTo(copy);
    return copy;
  }
}
