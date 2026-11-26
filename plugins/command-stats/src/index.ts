import type { PluginContext, PluginManifest, SvgFramePlugin } from '@svgframe/kernel';
import { StatsCommand } from './StatsCommand.js';

export { StatsCommand, statsOf } from './StatsCommand.js';

/**
 * `stats` 命令插件。
 *
 * 它独立成包，就是为了证明「命令可以被插件追加」：
 * 卸载之后 `stats` 在 `help` 里消失、执行它报 `unknown command: stats`，
 * 而内核与其他插件一行都不用改。
 */
export class CommandStatsPlugin implements SvgFramePlugin {
  readonly name = 'command-stats';
  readonly contributes: PluginManifest = { commands: ['stats'] };

  activate(context: PluginContext): void {
    context.commands.register(new StatsCommand());
  }
}

export default new CommandStatsPlugin();
