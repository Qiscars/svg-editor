import { Repl } from './cli/Repl.js';
import { createConfiguredComposition } from './assembly/ConfiguredComposition.js';
import { createCodeAssembledComposition } from './assembly/PluginComposition.js';
import type { Composition } from './assembly/Composition.js';

/**
 * CLI 入口。
 *
 * 两种装配方式的**唯一区别在启动参数**：
 *
 * ```bash
 * node dist/main.js                                  # 方式 A：代码装配（组合根显式列出插件）
 * node dist/main.js --config plugins.config.json     # 方式 B：配置装配（加载器按字符串 import）
 * ```
 *
 * 方式 A 的插件清单写在 `assembly/PluginComposition.ts`；方式 B 的写在 JSON 里。
 * 两条路径都经过 `activatePlugin`，因此校验、回滚与最终行为完全一致。
 */
async function main(): Promise<void> {
  const configPath = readConfigArgument(process.argv.slice(2));

  let composition: Composition;
  let errors: readonly string[];

  if (configPath === undefined) {
    const codeAssembled = createCodeAssembledComposition();
    composition = codeAssembled;
    errors = codeAssembled.errors;
  } else {
    const configured = await createConfiguredComposition(configPath);
    composition = configured;
    errors = configured.report.errors;
  }

  // 插件加载失败只影响该插件：打印后继续启动
  for (const line of errors) {
    process.stdout.write(`${line}\n`);
  }

  const repl = new Repl(process.stdin, process.stdout, composition.app, composition.commands);
  await repl.run();
}

function readConfigArgument(argv: readonly string[]): string | undefined {
  const index = argv.indexOf('--config');
  if (index === -1) {
    return undefined;
  }
  return argv[index + 1];
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`fatal: ${message}\n`);
  process.exitCode = 1;
});
