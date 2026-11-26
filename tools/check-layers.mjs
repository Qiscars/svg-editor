#!/usr/bin/env node
/**
 * 架构约束检查（doc/README.md §1.3 的可执行版本）。
 *
 * Phase 2 把项目拆成了「内核 / 宿主 / 插件」三类包，规则也从层矩阵收敛成三条结构性约束：
 *
 * 1. **内核不依赖任何具体实现**：`packages/kernel` 不得 import 宿主或任何插件。
 * 2. **插件不依赖宿主装配**：`plugins/*` 只能 import `@svgframe/kernel` 的公开 API
 *    与自己包内的文件；不得 import `@svgframe/host`，也不得走内核内部路径。
 * 3. **内核不认识任何具体插件**：除组合根 ssembly/PluginComposition.ts 外，@svgframe/plugin-* 不得出现；
 * 4. **内核内部保持 Phase 1 的分层**：domain → commands/io → extensions/app
 *    的依赖方向不能倒过来（`domain` 不认识 XML、不认识命令行）。
 *
 * 违规即退出码 1。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** 内核内部的分层：key 可以依赖 value 里列出的层。 */
const KERNEL_LAYERS = {
  domain: ['domain'],
  // extensions 是**纯契约层**：只依赖 domain，谁都依赖它，它不依赖任何人
  extensions: ['domain', 'extensions'],
  commands: ['domain', 'extensions', 'commands'],
  io: ['domain', 'extensions', 'io'],
  builtin: ['domain', 'extensions', 'builtin'],
  app: ['domain', 'extensions', 'commands', 'io', 'app'],
  '<root>': ['domain', 'extensions', 'commands', 'io', 'app', 'builtin'],
};

const violations = [];
const counts = new Map();

function listTypeScript(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') {
        continue;
      }
      files.push(...listTypeScript(full));
    } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
      files.push(full);
    }
  }
  return files;
}

function packageOf(absolutePath) {
  const rel = relative(ROOT, absolutePath).split(sep).join('/');
  if (rel.startsWith('packages/kernel/')) {
    return 'kernel';
  }
  if (rel.startsWith('packages/host/')) {
    return 'host';
  }
  const plugin = /^plugins\/([^/]+)\//.exec(rel);
  if (plugin !== null) {
    return `plugin:${plugin[1]}`;
  }
  return null;
}

function kernelLayerOf(absolutePath) {
  const rel = relative(join(ROOT, 'packages', 'kernel', 'src'), absolutePath).split(sep).join('/');
  const [first] = rel.split('/');
  if (rel === 'index.ts') {
    return '<root>';
  }
  return Object.hasOwn(KERNEL_LAYERS, first) ? first : '<root>';
}

function importSpecifiers(source) {
  const specifiers = [];
  const withFrom = /^\s*(?:import|export)\b[\s\S]*?from\s+['"]([^'"]+)['"]/gm;
  let match;
  while ((match = withFrom.exec(source)) !== null) {
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

function report(file, line, rule, detail) {
  violations.push({
    where: `${relative(ROOT, file).split(sep).join('/')}:${line}`,
    rule,
    detail,
  });
}

const kernelSrc = join(ROOT, 'packages', 'kernel', 'src');
const hostSrc = join(ROOT, 'packages', 'host', 'src');
const pluginRoot = join(ROOT, 'plugins');

const sources = [...listTypeScript(kernelSrc), ...listTypeScript(hostSrc)];
if (statSync(pluginRoot, { throwIfNoEntry: false }) !== undefined) {
  sources.push(...listTypeScript(pluginRoot));
}

for (const file of sources) {
  const owner = packageOf(file);
  const source = readFileSync(file, 'utf8');
  counts.set(owner, (counts.get(owner) ?? 0) + 1);

  for (const specifier of importSpecifiers(source)) {
    const line = lineOf(source, specifier);

    if (specifier.startsWith('node:')) {
      if (owner === 'kernel') {
        const layer = kernelLayerOf(file);
        if (layer !== 'io' && layer !== '<root>') {
          report(file, line, `内核 ${layer} 层不得依赖 Node 内置模块`, specifier);
        }
      }
      continue;
    }

    if (specifier === '@svgframe/kernel') {
      if (owner === 'kernel') {
        report(file, line, '内核包内应使用相对路径，不要自引用包名', specifier);
      }
      continue;
    }

    if (specifier === '@svgframe/host') {
      if (owner !== 'host') {
        report(file, line, `${owner} 不允许依赖宿主装配模块 @svgframe/host`, specifier);
      }
      continue;
    }

    if (specifier.startsWith('@svgframe/plugin-')) {
      // 只有"代码装配的组合根"允许认识具体插件；内核与宿主其他地方一律不许
      const isCompositionRoot = relative(ROOT, file).split(sep).join('/') === 'packages/host/src/assembly/PluginComposition.ts';
      if (!isCompositionRoot) {
        report(file, line, '只有组合根可以 import 具体插件包', specifier);
      }
      continue;
    }

    if (!specifier.startsWith('.')) {
      continue; // 第三方依赖不在本规则范围内
    }

    const targetBase = resolve(dirname(file), specifier).replace(/\.js$/, '');
    const targetFile = `${targetBase}.ts`;
    const targetOwner = packageOf(targetFile);

    if (targetOwner === null) {
      continue;
    }
    if (targetOwner !== owner) {
      report(file, line, `${owner} 不允许跨包相对引用 ${targetOwner}`, specifier);
      continue;
    }

    if (owner === 'kernel') {
      const from = kernelLayerOf(file);
      const to = kernelLayerOf(targetFile);
      const allowed = KERNEL_LAYERS[from] ?? [];
      if (from !== to && !allowed.includes(to)) {
        report(file, line, `内核 ${from} 层不允许依赖 ${to} 层`, specifier);
      }
    }
  }
}

const summary = [...counts.entries()]
  .map(([owner, count]) => `${owner}:${count}`)
  .join('  ');

if (violations.length === 0) {
  console.log(`架构约束检查通过（${summary}）`);
  process.exit(0);
}

console.error(`架构约束检查失败：${violations.length} 处违规（${summary}）`);
for (const violation of violations) {
  console.error(`  ${violation.where}  ${violation.rule}`);
  console.error(`      ${violation.detail}`);
}
process.exit(1);
