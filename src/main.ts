import { Repl } from './cli/Repl.js';

async function main(): Promise<void> {
  const repl = new Repl(process.stdin, process.stdout);
  await repl.run();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`fatal: ${message}\n`);
  process.exitCode = 1;
});
