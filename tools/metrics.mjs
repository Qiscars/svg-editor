#!/usr/bin/env node
/**
 * 指标生成（phase_cli_2.md §7「指标」）。
 *
 * 按阶段一基线提交（tag `final`）与当前 HEAD 各算一遍，逐类对比：
 *
 * | 类别 | 判定方式 |
 * |---|---|
 * | 内核 | `packages/kernel/src/` 下全部文件（基线上对应 `src/domain`、`src/commands`、`src/io`、`src/app`、`src/registry`）|
 * | 装配/宿主 | `packages/host/src/` 下全部文件（基线上对应 `src/cli`、`src/main.ts`）|
 * | 插件 | `plugins/<pkg>/src/` 下全部文件（基线上为 0）|
 *
 * 三项指标：
 * 1. **有效代码行**：去掉空行与整行注释（行注释、块注释、块内以 `*` 开头的行）后的行数；
 * 2. **函数数**：以「行首出现的方法/函数声明」+ 其后的平衡花括号块为一个函数；
 * 3. **圈复杂度**：`1 +` 块内出现的决策点（`if`、`else if`、`for`、`while`、`case`、
 *    `catch`、`&&`、`||`、`?`），按函数求和后给出总/平均/最大。
 *
 * 这是静态近似（不做 AST 解析），够横向比较"插件化带来的增量"；
 * 生成结果写入 `docs/metrics/metrics.md`。
 *
 * 用法：node tools/metrics.mjs [基线 ref，默认 final]
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = process.argv[2] ?? 'final';

const DECISION = /\b(if|else\s+if|for|while|case|catch)\b|&&|\|\||\?(?![.?])/g;

/** 阶段一的路径 → 类别。 */
function categoryBase(relPath) {
  if (/^src\/(domain|commands|io|app|registry)\//.test(relPath)) {
    return 'kernel';
  }
  if (/^src\/(cli|main\.ts)/.test(relPath)) {
    return 'assembly';
  }
  return null;
}

/** 当前布局的路径 → 类别。 */
function categoryCurrent(relPath) {
  if (relPath.startsWith('packages/kernel/src/')) {
    return 'kernel';
  }
  if (relPath.startsWith('packages/host/src/')) {
    return 'assembly';
  }
  if (relPath.startsWith('plugins/')) {
    return 'plugin';
  }
  return null;
}

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function filesAt(ref) {
  return git(['ls-tree', '-r', '--name-only', ref])
    .split('\n')
    .filter((path) => path.endsWith('.ts') && !path.endsWith('.d.ts'));
}

function readAt(ref, path) {
  return git(['show', `${ref}:${path}`]);
}

/** 有效代码行：去空行与整行注释。 */
function effectiveLines(source) {
  let count = 0;
  let inBlock = false;
  for (const raw of source.split('\n')) {
    const line = raw.trim();
    if (inBlock) {
      if (line.includes('*/')) {
        inBlock = false;
      }
      continue;
    }
    if (line === '') {
      continue;
    }
    if (line.startsWith('//')) {
      continue;
    }
    if (line.startsWith('/*')) {
      if (!line.includes('*/')) {
        inBlock = true;
      }
      continue;
    }
    count += 1;
  }
  return count;
}

const FUNCTION_HEAD = /^\s*(?:(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+\w+|(?:public|private|protected|static|readonly|async|\s)*(?:get\s+|set\s+)?\w+\s*\([^;]*\)\s*(?::\s*[^{]+)?\s*\{)\s*$/;

/**
 * 找出函数块：从函数头那一行开始，用花括号配平找到结束行。
 * `const f = (…) => {` 这类也认。
 */
function functionBlocks(source) {
  const lines = source.split('\n');
  const blocks = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const isHead =
      FUNCTION_HEAD.test(line) ||
      /^\s*(?:export\s+)?(?:const|let)\s+\w+\s*(?::[^=]+)?=\s*(?:async\s*)?\([^)]*\)\s*(?::[^{]+)?=>\s*\{/.test(line) ||
      /^\s*(?:export\s+)?(?:const|let)\s+\w+\s*(?::[^=]+)?=\s*(?:async\s*)?\w+\s*=>\s*\{/.test(line);
    if (!isHead) {
      continue;
    }
    let depth = 0;
    let started = false;
    const body = [];
    for (let cursor = index; cursor < lines.length; cursor += 1) {
      const current = lines[cursor];
      for (const char of current) {
        if (char === '{') {
          depth += 1;
          started = true;
        } else if (char === '}') {
          depth -= 1;
        }
      }
      body.push(current);
      if (started && depth === 0) {
        index = cursor;
        break;
      }
    }
    const text = body.join('\n');
    const decisions = (text.match(DECISION) ?? []).length;
    blocks.push({ complexity: 1 + decisions, body });
  }
  return blocks;
}

function classify(ref, classifier) {
  const stats = {
    kernel: { files: 0, lines: 0, functions: 0, complexity: 0, maxComplexity: 0 },
    assembly: { files: 0, lines: 0, functions: 0, complexity: 0, maxComplexity: 0 },
    plugin: { files: 0, lines: 0, functions: 0, complexity: 0, maxComplexity: 0 },
  };

  for (const path of filesAt(ref)) {
    const category = classifier(path.split(sep).join('/'));
    if (category === null) {
      continue;
    }
    const bucket = stats[category];
    const source = readAt(ref, path);
    bucket.files += 1;
    bucket.lines += effectiveLines(source);
    const blocks = functionBlocks(source);
    bucket.functions += blocks.length;
    for (const block of blocks) {
      bucket.complexity += block.complexity;
      bucket.maxComplexity = Math.max(bucket.maxComplexity, block.complexity);
    }
  }
  return stats;
}

function row(label, before, after) {
  const delta = after - before;
  const sign = delta > 0 ? `+${delta}` : delta < 0 ? String(delta) : '0';
  const ratio = before === 0 ? (after === 0 ? '—' : '新增') : `${((delta / before) * 100).toFixed(0)}%`;
  return `| ${label} | ${before} | ${after} | ${sign} | ${ratio} |`;
}

function average(bucket) {
  return bucket.functions === 0 ? '0.0' : (bucket.complexity / bucket.functions).toFixed(1);
}

const before = classify(BASELINE, categoryBase);
const after = classify('HEAD', categoryCurrent);
const baseSha = git(['rev-parse', '--short', BASELINE]).trim();
const headSha = git(['rev-parse', '--short', 'HEAD']).trim();

const totalLinesBefore = Object.values(before).reduce((sum, bucket) => sum + bucket.lines, 0);
const totalLinesAfter = Object.values(after).reduce((sum, bucket) => sum + bucket.lines, 0);

const markdown = `# 指标（由 \`node tools/metrics.mjs\` 生成，请勿手改）

基线 \`${BASELINE}\` = \`${baseSha}\`（阶段一），对照 \`HEAD\` = \`${headSha}\`。

统计口径见 \`tools/metrics.mjs\` 文件头：有效代码行去掉空行与整行注释；
函数以「行首声明 + 平衡花括号块」识别；圈复杂度 = 1 + 决策点数量
（\`if\` / \`else if\` / \`for\` / \`while\` / \`case\` / \`catch\` / \`&&\` / \`||\` / \`?\`）。
这是静态近似，用于横向比较增量的**量级与分布**，不是精确的 AST 度量。

## 有效代码行

| 类别 | 阶段一 | 阶段二 | 增量 | 比例 |
|---|---:|---:|---:|---:|
${row('内核（kernel）', before.kernel.lines, after.kernel.lines)}
${row('装配/宿主（assembly）', before.assembly.lines, after.assembly.lines)}
${row('插件（plugin）', before.plugin.lines, after.plugin.lines)}
${row('**合计**', totalLinesBefore, totalLinesAfter)}

## 文件数与函数数

| 类别 | 文件数（前 → 后） | 函数数（前 → 后） |
|---|---|---|
| 内核 | ${before.kernel.files} → ${after.kernel.files} | ${before.kernel.functions} → ${after.kernel.functions} |
| 装配/宿主 | ${before.assembly.files} → ${after.assembly.files} | ${before.assembly.functions} → ${after.assembly.functions} |
| 插件 | ${before.plugin.files} → ${after.plugin.files} | ${before.plugin.functions} → ${after.plugin.functions} |

## 圈复杂度

| 类别 | 平均（前 → 后） | 最大（前 → 后） | 总量（前 → 后） |
|---|---|---|---|
| 内核 | ${average(before.kernel)} → ${average(after.kernel)} | ${before.kernel.maxComplexity} → ${after.kernel.maxComplexity} | ${before.kernel.complexity} → ${after.kernel.complexity} |
| 装配/宿主 | ${average(before.assembly)} → ${average(after.assembly)} | ${before.assembly.maxComplexity} → ${after.assembly.maxComplexity} | ${before.assembly.complexity} → ${after.assembly.complexity} |
| 插件 | ${average(before.plugin)} → ${average(after.plugin)} | ${before.plugin.maxComplexity} → ${after.plugin.maxComplexity} | ${before.plugin.complexity} → ${after.plugin.complexity} |

## 怎么读这张表

- **插件类别在阶段一为 0**：阶段二新增的能力全部落在独立包里；
- **装配/宿主的增量主要来自加载器与组合根**：那是新能力的"接线处"，属于装配成本，
  不是内核复杂度；
- **内核的增量集中在扩展点契约与通用钩子**（\`extensions/\`、\`isContainer\`、
  \`guardChildRemoval\`），这部分只在框架阶段增加一次——后续接入新插件时内核不再变化
  （见 \`doc/README.md\` 的 ADR-2 与"接入 box 的内核差异为 0"验证）。
`;

const outDir = join(ROOT, 'docs', 'metrics');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'metrics.md'), markdown, 'utf8');
console.log(`已生成 ${relative(ROOT, join(outDir, 'metrics.md'))}`);
console.log(`基线 ${BASELINE}(${baseSha}) vs HEAD(${headSha})`);
console.log(`有效行：${totalLinesBefore} → ${totalLinesAfter}`);
