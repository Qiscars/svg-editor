import { Repl } from './cli/Repl.js';
import { createDefaultComposition } from './assembly/Composition.js';

async function main(): Promise<void> {
  const composition = createDefaultComposition();
  const repl = new Repl(process.stdin, process.stdout, composition.app, composition.commands);
  await repl.run();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`fatal: ${message}\n`);
  process.exitCode = 1;
});
