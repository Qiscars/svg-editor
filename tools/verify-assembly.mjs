#!/usr/bin/env node
/**
 * 双装配一致性验证（phase_cli_2.md §6「双装配一致性」）。
 *
 * 对同一份输入会话、同一个固定工作目录，分别用两种装配方式跑一遍：
 *
 *   方式 A：`node <entry> < transcript`                （代码装配）
 *   方式 B：`node <entry> --config plugins.config.json < transcript`（配置装配）
 *
 * 两次输出必须**逐字节相同**。另外做一次「禁用全部可选插件」的基线回归，
 * 与本仓库 Phase 1 的 golden 输出比对，证明内核行为没有被插件化改坏。
 *
 * 用法：node tools/verify-assembly.mjs
 * 退出码 0 = 全部通过。
 */
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = join(ROOT, 'packages', 'host', 'dist', 'main.js');
const CONFIG = join(ROOT, 'plugins.config.json');
const BASELINE_CONFIG = join(ROOT, 'plugins.baseline.json');
const WORK = join(ROOT, 'out', 'assembly-work');
const LOGS = join(ROOT, 'out', 'assembly-logs');

/**
 * 固定的工作目录内容：目录与文件各若干，含隐藏项。
 * `dir` 的输出完全由这里决定，因此对拍结果稳定。
 */
const FIXTURE = {
  dirs: ['docs', 'plugins'],
  files: ['demo.svg', 'package.json', '.hidden'],
};

function buildFixture() {
  rmSync(WORK, { recursive: true, force: true });
  mkdirSync(WORK, { recursive: true });
  for (const name of FIXTURE.dirs) {
    mkdirSync(join(WORK, name), { recursive: true });
  }
  for (const name of FIXTURE.files) {
    writeFileSync(join(WORK, name), '', 'utf8');
  }
  cpSync(join(ROOT, 'doc', 'scenarios', 'other.svg'), join(WORK, 'other.svg'));
}

function run(entryArgs, transcriptPath, cwd) {
  const input = readFileSync(transcriptPath, 'utf8');
  return execFileSync(process.execPath, [ENTRY, ...entryArgs], {
    cwd,
    input,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  }).replace(/\r\n/g, '\n');
}

function comparePair(name, transcript) {
  buildFixture();
  mkdirSync(LOGS, { recursive: true });

  const fromCode = run([], transcript, WORK);
  const fromConfig = run(['--config', CONFIG], transcript, WORK);

  writeFileSync(join(LOGS, `${name}.code.txt`), fromCode, 'utf8');
  writeFileSync(join(LOGS, `${name}.config.txt`), fromConfig, 'utf8');

  if (fromCode === fromConfig) {
    console.log(`  ✓ ${name}: 代码装配与配置装配输出逐字节一致（${fromCode.split('\n').length - 1} 行）`);
    return true;
  }
  console.log(`  ✗ ${name}: 两种装配输出不同`);
  const left = fromCode.split('\n');
  const right = fromConfig.split('\n');
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    if (left[i] !== right[i]) {
      console.log(`      首个差异在第 ${i + 1} 行`);
      console.log(`      代码装配: ${JSON.stringify(left[i])}`);
      console.log(`      配置装配: ${JSON.stringify(right[i])}`);
      break;
    }
  }
  return false;
}

function compareBaseline(transcript, goldenPath) {
  buildFixture();
  const baseline = run(['--config', BASELINE_CONFIG], transcript, WORK);
  const golden = readFileSync(goldenPath, 'utf8').replace(/\r\n/g, '\n');
  if (baseline.trimEnd() === golden.trimEnd()) {
    console.log(`  ✓ 基线回归: 禁用全部可选插件后与 Phase 1 golden 逐字节一致`);
    return true;
  }
  console.log(`  ✗ 基线回归: 与 Phase 1 golden 不一致`);
  return false;
}

console.log('双装配一致性验证');
let ok = true;
for (const [name, file] of [
  ['cli-1', join(ROOT, 'doc', 'transcript', 'cli-1.txt')],
  ['cli-2-box', join(ROOT, 'doc', 'transcript', 'cli-2-box.txt')],
  ['cli-3-plugins', join(ROOT, 'doc', 'transcript', 'cli-3-plugins.txt')],
]) {
  ok = comparePair(name, file) && ok;
}

console.log('基线回归');
// 基线与 golden 必须用同一份输入（golden 里含脚本注释的回显）
ok = compareBaseline(join(ROOT, 'doc', 'scenarios', 'basic-session.txt'), join(ROOT, 'doc', 'scenarios', 'basic-session.golden.txt')) && ok;

rmSync(WORK, { recursive: true, force: true });
console.log(ok ? '\n全部通过' : '\n存在失败项');
process.exit(ok ? 0 : 1);
