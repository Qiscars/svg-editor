#!/usr/bin/env node
/**
 * 一键门禁：构建 → 类型检查 → 测试 → 架构约束 → 双装配对拍。
 *
 * 为什么不用 `pnpm run a && pnpm run b` 串联：那样依赖 `pnpm` 在 PATH 上，
 * 而本项目可以只用 `node <pnpm.mjs>` 的形态安装依赖（CI / 离线环境很常见），
 * 此时子进程解析不到 `pnpm`。这里改成**直接调用各包里已有的二进制**，
 * 只用 `process.execPath`（当前 Node），因此解压后即可自证。
 *
 * 用法：node tools/verify.mjs
 * 退出码 0 = 全部通过。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** 所有参与构建的 workspace 包（顺序由依赖关系算出来，不写死）。 */
const CANDIDATE_DIRS = [
  'packages/kernel',
  'packages/host',
  'packages/vscode-svg',
  'plugins/shape-box',
  'plugins/shape-diamond',
  'plugins/command-stats',
  'plugins/command-dir',
  'plugins/tree-star',
];

/**
 * 按 workspace 依赖关系做拓扑排序。
 *
 * **这一步不是可有可无的**：`packages/host` 的组合根要 `import` 五个插件包，
 * 而它们的 `types` 指向各自的 `dist/index.d.ts`。冷构建（`dist` 全空）时
 * 必须先建插件、再建宿主，否则 `tsc` 会报
 * `Cannot find module '@svgframe/plugin-…'`。
 *
 * `pnpm -r run build` 本身按依赖图排序，所以这个问题只在"用 Node 直接串行
 * 调 tsc"时才会暴露——`tools/verify.mjs` 最初就踩了这个坑。
 */
function buildOrder(dirs) {
  const nameOf = new Map();
  const depsOf = new Map();
  for (const dir of dirs) {
    const pkg = JSON.parse(readFileSync(join(ROOT, dir, 'package.json'), 'utf8'));
    nameOf.set(dir, pkg.name);
    const all = { ...pkg.peerDependencies, ...pkg.dependencies, ...pkg.devDependencies };
    depsOf.set(
      dir,
      Object.entries(all)
        .filter(([, version]) => String(version).startsWith('workspace:'))
        .map(([name]) => name),
    );
  }

  const byName = new Map();
  for (const dir of dirs) {
    byName.set(nameOf.get(dir), dir);
  }

  const sorted = [];
  const visiting = new Set();
  const done = new Set();
  const visit = (dir) => {
    if (done.has(dir) || visiting.has(dir)) {
      return; // visiting 命中即为环，直接跳过（本仓库不存在）
    }
    visiting.add(dir);
    for (const depName of depsOf.get(dir) ?? []) {
      const depDir = byName.get(depName);
      if (depDir !== undefined) {
        visit(depDir);
      }
    }
    visiting.delete(dir);
    done.add(dir);
    sorted.push(dir);
  };
  for (const dir of dirs) {
    visit(dir);
  }
  return sorted;
}

const PACKAGES = buildOrder(CANDIDATE_DIRS);

const results = [];

function run(label, args, options = {}) {
  process.stdout.write(`\n===== ${label} =====\n`);
  const started = Date.now();
  let ok = true;
  try {
    const output = execFileSync(process.execPath, args, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
      ...options,
    });
    if (output.trim() !== '') {
      process.stdout.write(`${output.trimEnd()}\n`);
    }
  } catch (error) {
    ok = false;
    const stdout = error.stdout?.toString() ?? '';
    const stderr = error.stderr?.toString() ?? '';
    if (stdout.trim() !== '') {
      process.stdout.write(`${stdout.trimEnd()}\n`);
    }
    if (stderr.trim() !== '') {
      process.stderr.write(`${stderr.trimEnd()}\n`);
    }
  }
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  results.push({ label, ok, seconds });
  return ok;
}

/** 包内 tsc：优先用该包自己的 typescript，找不到再回落到根目录。 */
function tscBin(pkg) {
  const local = join(ROOT, pkg, 'node_modules', 'typescript', 'bin', 'tsc');
  if (existsSync(`${local}.js`) || existsSync(local)) {
    return local;
  }
  return join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
}

let allOk = true;

// 1. 构建
process.stdout.write('\n########## 1/5 构建 ##########\n');
for (const pkg of PACKAGES) {
  allOk = run(`tsc -p ${pkg}/tsconfig.json`, [tscBin(pkg), '-p', join(ROOT, pkg, 'tsconfig.json')]) && allOk;
}

// 2. 类型检查（含 tests/ 与 tools/）
process.stdout.write('\n########## 2/5 类型检查 ##########\n');
allOk = run('tsc -p tsconfig.test.json', [tscBin('.'), '-p', join(ROOT, 'tsconfig.test.json')]) && allOk;

// 3. 测试
process.stdout.write('\n########## 3/5 测试 ##########\n');
allOk = run('vitest run', [join(ROOT, 'node_modules', 'vitest', 'vitest.mjs'), 'run']) && allOk;

// 4. 架构约束
process.stdout.write('\n########## 4/5 架构约束 ##########\n');
allOk = run('check-layers', [join(ROOT, 'tools', 'check-layers.mjs')]) && allOk;

// 5. 双装配对拍 + 基线回归 + §6.1 复现
process.stdout.write('\n########## 5/5 双装配对拍 ##########\n');
allOk = run('verify-assembly', [join(ROOT, 'tools', 'verify-assembly.mjs')]) && allOk;

process.stdout.write('\n########## 汇总 ##########\n');
for (const item of results) {
  process.stdout.write(`  ${item.ok ? '✓' : '✗'} ${item.label}  (${item.seconds}s)\n`);
}
const failed = results.filter((item) => !item.ok).length;
process.stdout.write(
  failed === 0
    ? `\n全部通过（${results.length} 个步骤）\n`
    : `\n有 ${failed} 个步骤失败\n`,
);
process.exit(failed === 0 ? 0 : 1);
