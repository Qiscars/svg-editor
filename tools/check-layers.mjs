#!/usr/bin/env node
/**
 * 依赖方向检查（doc/README.md §1.3 的可执行版本）。
 *
 * 为什么需要这个脚本：架构规则写在文档里只能靠自觉遵守，写着写着就会破。
 * 把规则变成一条命令之后，"某个模块偷偷依赖了不该依赖的东西"这件事会在
 * 门禁里当场失败，而不是等到写一致性自查时才发现。
 *
 * 规则矩阵（与 §1.3 的表格逐条对应）：
 *   domain   → domain
 *   commands → domain, commands
 *   io       → domain, registry, io
 *   registry → domain, commands, registry
 *   app      → domain, commands, io, registry, app
 *   cli      → app, domain, registry, cli
 *   entry    → 任意
 *
 * 额外约束：domain 不得 import 任何 `node:*` 内置模块（领域层零 I/O）。
 *
 * 用法：node tools/check-layers.mjs
 * 退出码：0 全部合规；1 存在违规。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

const ALLOWED = {
  domain: ['domain'],
  commands: ['domain', 'commands'],
  io: ['domain', 'registry', 'io'],
  registry: ['domain', 'commands', 'registry'],
  app: ['domain', 'commands', 'io', 'registry', 'app'],
  cli: ['app', 'domain', 'registry', 'cli'],
  entry: ['domain', 'commands', 'io', 'registry', 'app', 'cli', 'entry'],
};

/** `src/commands/impl/X.ts` → `commands`；`src/main.ts` → `entry`。 */
function layerOf(absolutePath) {
  const rel = relative(SRC, absolutePath).split(sep).join('/');
  if (rel === 'main.ts') {
    return 'entry';
  }
  const [first] = rel.split('/');
  return Object.hasOwn(ALLOWED, first) ? first : 'unknown';
}

function listTypeScriptFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      files.push(...listTypeScriptFiles(full));
    } else if (entry.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

/** 提取所有静态 import / export … from 的目标。 */
function importSpecifiers(source) {
  const specifiers = [];
  const pattern = /^\s*(?:import|export)\b[\s\S]*?from\s+['"]([^'"]+)['"]/gm;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    specifiers.push(match[1]);
  }
  const bare = /^\s*import\s+['"]([^'"]+)['"]/gm;
  while ((match = bare.exec(source)) !== null) {
    specifiers.push(match[1]);
  }
  return specifiers;
}

function lineOf(source, specifier) {
  const index = source.indexOf(specifier);
  return index === -1 ? 0 : source.slice(0, index).split('\n').length;
}

const violations = [];
const layerCounts = new Map();

for (const file of listTypeScriptFiles(SRC)) {
  const sourceLayer = layerOf(file);
  layerCounts.set(sourceLayer, (layerCounts.get(sourceLayer) ?? 0) + 1);
  const source = readFileSync(file, 'utf8');

  for (const specifier of importSpecifiers(source)) {
    const line = lineOf(source, specifier);

    if (specifier.startsWith('node:')) {
      if (sourceLayer === 'domain') {
        violations.push({
          file,
          line,
          rule: 'domain 不得依赖 Node 内置模块（领域层零 I/O）',
          detail: specifier,
        });
      }
      continue;
    }
    if (!specifier.startsWith('.')) {
      continue; // 第三方包不在本规则范围内
    }

    // './X.js' → './X' 再去掉扩展名，保留原始相对路径用于定位层
    const targetBase = resolve(dirname(file), specifier).replace(/\.js$/, '');
    const targetLayer = layerOf(`${targetBase}.ts`);

    if (targetLayer === 'unknown') {
      continue;
    }
    if (!ALLOWED[sourceLayer].includes(targetLayer)) {
      violations.push({
        file,
        line,
        rule: `${sourceLayer} 不允许依赖 ${targetLayer}`,
        detail: specifier,
      });
    }
  }
}

const summary = [...layerCounts.entries()]
  .map(([layer, count]) => `${layer}:${count}`)
  .join('  ');

if (violations.length === 0) {
  console.log(`依赖方向检查通过（${summary}）`);
  process.exit(0);
}

console.error(`依赖方向检查失败：${violations.length} 处违规（${summary}）`);
for (const violation of violations) {
  const where = `${relative(ROOT, violation.file).split(sep).join('/')}:${violation.line}`;
  console.error(`  ${where}  ${violation.rule}`);
  console.error(`      ${violation.detail}`);
}
console.error('');
console.error('规则见 doc/README.md §1.3。违反即为待处理项，要么改代码，要么改规则并留痕。');
process.exit(1);
