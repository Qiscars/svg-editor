import { EditorError } from './EditorError.js';

/**
 * 领域错误：图形树本身不成立（id 冲突、形状不存在、属性非法……）。
 *
 * 约定：`message` 是**不带 `error: ` 前缀**的正文，前缀由表现层统一添加，
 * 这样领域层不关心"怎么显示错误"。消息文本与作业 §4.2 的错误信息表一一对应。
 */
export class ShapeError extends EditorError {
  constructor(message: string) {
    super(message);
  }

  static idAlreadyExists(id: string): ShapeError {
    return new ShapeError(`id already exists: ${id}`);
  }

  static noSuchShape(id: string): ShapeError {
    return new ShapeError(`no such shape: ${id}`);
  }

  static noSuchContainer(id: string): ShapeError {
    return new ShapeError(`no such container: ${id}`);
  }

  static notAContainer(id: string): ShapeError {
    return new ShapeError(`not a container: ${id}`);
  }

  static unknownShapeType(type: string): ShapeError {
    return new ShapeError(`unknown shape type: ${type} (is the plugin loaded?)`);
  }

  static missingParameter(name: string): ShapeError {
    return new ShapeError(`missing parameter: ${name}`);
  }

  static unknownAttribute(attribute: string): ShapeError {
    return new ShapeError(`unknown attribute: ${attribute}`);
  }

  static invalidValue(attribute: string, raw: string): ShapeError {
    return new ShapeError(`invalid value for ${attribute}: ${raw}`);
  }

  static invalidId(id: string): ShapeError {
    return new ShapeError(`invalid id: ${id}`);
  }

  static cannotInsertIntoSelf(id: string): ShapeError {
    return new ShapeError(`cannot insert a container into itself: ${id}`);
  }

  static scaleFactorNotPositive(): ShapeError {
    return new ShapeError('scale factor must be positive');
  }

  static cannotUngroupComposite(id: string): ShapeError {
    return new ShapeError(`cannot ungroup composite shape: ${id}`);
  }

  static cannotGroupIntoDescendant(id: string): ShapeError {
    return new ShapeError(`cannot group a container into its own descendant: ${id}`);
  }

  static cannotUngroupTopLevel(id: string): ShapeError {
    return new ShapeError(`cannot ungroup top-level container: ${id}`);
  }

  static noDocument(): ShapeError {
    return new ShapeError("no document. use 'init' or 'read' first");
  }

  static cannotReadFile(path: string): ShapeError {
    return new ShapeError(`cannot read file: ${path}`);
  }

  static cannotWriteFile(path: string): ShapeError {
    return new ShapeError(`cannot write file: ${path}`);
  }

  static invalidSvg(detail: string): ShapeError {
    return new ShapeError(`invalid SVG: ${detail}`);
  }

  static noSavePath(): ShapeError {
    return new ShapeError('no file to save to; give a path');
  }
}
