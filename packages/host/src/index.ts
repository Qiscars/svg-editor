export { Repl, PROMPT, BANNER } from './cli/Repl.js';
export { Tokenizer } from './cli/Tokenizer.js';
export type { CommandInvocation } from './cli/CommandParser.js';
export { CommandParser } from './cli/CommandParser.js';
export { ConsoleOutput } from './cli/ConsoleOutput.js';
export { CliError } from './cli/CliError.js';
export { TreeRenderer } from './cli/render/TreeRenderer.js';
export { ShowRenderer } from './cli/render/ShowRenderer.js';
export { Arguments } from './cli/handlers/Arguments.js';
export { registerBuiltinCommands } from './cli/handlers/BuiltinCommands.js';
export { documentCommandHandlers } from './cli/handlers/DocumentCommandHandlers.js';
export { editCommandHandlers } from './cli/handlers/EditCommandHandlers.js';
export { displayCommandHandlers } from './cli/handlers/DisplayCommandHandlers.js';
export { historyCommandHandlers } from './cli/handlers/HistoryCommandHandlers.js';

export { createDefaultComposition, createEmptyServices } from './assembly/Composition.js';
export type { Composition } from './assembly/Composition.js';

export { activatePlugin } from './loader/activatePlugin.js';
export type { ActivationOutcome } from './loader/activatePlugin.js';
export { PluginLoader } from './loader/PluginLoader.js';
export type { LoadReport, PluginConfig, PluginConfigEntry } from './loader/PluginLoader.js';
export { createConfiguredComposition } from './assembly/ConfiguredComposition.js';
export { createCodeAssembledComposition } from './assembly/PluginComposition.js';
export { createServicesWithBuiltins } from './assembly/Composition.js';
