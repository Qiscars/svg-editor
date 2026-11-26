/**
 * 内核的公开 API。
 *
 * 这个文件是「内核」与「宿主 / 插件」之间唯一的契约面：
 * - 宿主只从这里取东西来装配；
 * - 插件只从这里取领域抽象与扩展点接口。
 *
 * 因此**任何插件都不应绕过它去 import 内核内部路径**——那会形成对实现的依赖，
 * 与 phase_cli_2.md §1「内核只依赖接口，不依赖任何实现」的要求反向。
 */

// ── 领域模型 ──────────────────────────────────────────────────────────────
export { Shape } from './domain/Shape.js';
export type { AttributeSpec, Point } from './domain/Shape.js';
export { Container } from './domain/Container.js';
export { Canvas } from './domain/Canvas.js';
export { Document } from './domain/Document.js';
export { IdIndex } from './domain/IdIndex.js';
export { Numbers } from './domain/Numbers.js';
export { EditorError } from './domain/EditorError.js';
export { ShapeError } from './domain/ShapeError.js';

export { Rect } from './domain/leaf/Rect.js';
export { Circle } from './domain/leaf/Circle.js';
export { Ellipse } from './domain/leaf/Ellipse.js';
export { Line } from './domain/leaf/Line.js';
export { TextShape } from './domain/leaf/TextShape.js';

// ── 命令层 ────────────────────────────────────────────────────────────────
export type { Command } from './commands/Command.js';
export { CommandContext } from './commands/CommandContext.js';
export { CommandError } from './commands/CommandError.js';
export { CommandHistory } from './commands/CommandHistory.js';
export { DocumentCommand } from './commands/DocumentCommand.js';
export { ShapeSnapshot } from './commands/ShapeSnapshot.js';

export { CreateShapeCommand } from './commands/impl/CreateShapeCommand.js';
export { DeleteShapeCommand } from './commands/impl/DeleteShapeCommand.js';
export { MoveShapeCommand } from './commands/impl/MoveShapeCommand.js';
export { ScaleShapeCommand } from './commands/impl/ScaleShapeCommand.js';
export { SetAttributeCommand } from './commands/impl/SetAttributeCommand.js';
export { GroupCommand } from './commands/impl/GroupCommand.js';
export { UngroupCommand } from './commands/impl/UngroupCommand.js';
export { AddToCommand } from './commands/impl/AddToCommand.js';
export { ReorderCommand } from './commands/impl/ReorderCommand.js';
export type { ReorderTarget } from './commands/impl/ReorderCommand.js';

// ── 持久化 ────────────────────────────────────────────────────────────────
export { FileGateway } from './io/FileGateway.js';
export { SvgParser } from './io/SvgParser.js';
export type { ParseResult } from './io/SvgParser.js';
export { SvgSerializer } from './io/SvgSerializer.js';
export { XmlElement } from './io/xml/XmlElement.js';
export { XmlParser, decodeEntities } from './io/xml/XmlParser.js';

// ── 应用层 ────────────────────────────────────────────────────────────────
export { EditorApp } from './app/EditorApp.js';

// ── 扩展点：接口 ──────────────────────────────────────────────────────────
export type { ShapeProvider, ReadBackContext } from './extensions/ShapeProvider.js';
export type { AttributeHandler } from './extensions/AttributeHandler.js';
export type { TreeDecorator, TreeRowContext } from './extensions/TreeDecorator.js';
export type { CommandSpec } from './extensions/CommandRegistry.js';
export { CommandRegistry } from './extensions/CommandRegistry.js';
export type { EditorServices } from './extensions/EditorServices.js';
export type {
  PluginContext,
  PluginManifest,
  PluginCategory,
  SvgFramePlugin,
  ShapeRegistration,
  CommandRegistration,
  DecoratorRegistration,
  AttributeRegistration,
} from './extensions/PluginContext.js';

// ── 扩展点：内核侧实现（注册表与上下文）────────────────────────────────
export { ShapeRegistry } from './extensions/ShapeRegistry.js';
export { AttributeHandlerRegistry } from './extensions/AttributeHandlerRegistry.js';
export { TreeDecoratorRegistry } from './extensions/TreeDecoratorRegistry.js';
export { PluginContextImpl } from './extensions/PluginContext.js';
export type { PluginTargets } from './extensions/PluginContext.js';
export { RegistryError } from './extensions/RegistryError.js';

// ── 内置实现的注册入口（供宿主的默认装配使用）──────────────────────────
export { builtinShapeProviders } from './builtin/BuiltinShapes.js';
