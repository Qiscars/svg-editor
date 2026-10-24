#!/usr/bin/env node
/**
 * 把 doc/README.md 转成自包含的 HTML（图片内联为 data URI），
 * 供无头 Edge 打印成 PDF：
 *
 *   node tools/md-to-html.mjs            # 生成 out/doc-build/README.html
 *   msedge --headless --print-to-pdf=doc/README.pdf out/doc-build/README.html
 *
 * 为什么自己写而不是引第三方：需要支持的 Markdown 子集很窄（标题 / 段落 /
 * 表格 / 代码块 / 引用 / 列表 / 行内格式 / 少量原样 HTML），
 * 而仓库里不引入只为文档服务的依赖。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'doc', 'README.md');
const OUTPUT_DIR = join(ROOT, 'out', 'doc-build');
const OUTPUT = join(OUTPUT_DIR, 'README.html');

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.gif': 'image/gif' };

function inlineImage(source) {
  const base = dirname(SOURCE);
  const absolute = resolve(base, source);
  const ext = extname(absolute).toLowerCase();
  if (!existsSync(absolute) || !MIME[ext]) {
    return source;
  }
  const data = readFileSync(absolute).toString('base64');
  return `data:${MIME[ext]};base64,${data}`;
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** 行内格式：先保护 `code`，再处理图片 / 链接 / 粗体。 */
function renderInline(text) {
  const codes = [];
  let working = text.replace(/`([^`]+)`/g, (_, code) => {
    codes.push(`<code>${escapeHtml(code)}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });

  working = escapeHtml(working);
  working = working.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) => {
    return `<img alt="${alt}" src="${inlineImage(src)}"/>`;
  });
  working = working.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    return `<a href="${href}">${label}</a>`;
  });
  working = working.replace(/&lt;(https?:\/\/[^&]+?)&gt;/g, (_, href) => `<a href="${href}">${href}</a>`);
  working = working.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  return working.replace(/\u0000(\d+)\u0000/g, (_, index) => codes[Number(index)]);
}

function isTableRow(line) {
  return /^\s*\|.*\|\s*$/.test(line);
}

function isTableSeparator(line) {
  return /^\s*\|[\s:|-]+\|\s*$/.test(line) && line.includes('-');
}

function renderTable(rows) {
  const cells = (row) =>
    row
      .trim()
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((cell) => cell.trim());

  const header = cells(rows[0]);
  const body = rows.slice(2).map(cells);
  const head = `<thead><tr>${header.map((cell) => `<th>${renderInline(cell)}</th>`).join('')}</tr></thead>`;
  const rest = body
    .map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join('')}</tr>`)
    .join('\n');
  return `<table>${head}<tbody>${rest}</tbody></table>`;
}

function convert(markdown) {
  const lines = markdown.split('\n');
  const out = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    // 围栏代码块
    const fence = /^```(\w*)\s*$/.exec(line);
    if (fence) {
      const lang = fence[1];
      const buffer = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index])) {
        buffer.push(lines[index]);
        index += 1;
      }
      index += 1;
      const cls = lang ? ` class="language-${lang}"` : '';
      out.push(`<pre><code${cls}>${escapeHtml(buffer.join('\n'))}</code></pre>`);
      continue;
    }

    // 表格
    if (isTableRow(line) && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
      const rows = [];
      while (index < lines.length && isTableRow(lines[index])) {
        rows.push(lines[index]);
        index += 1;
      }
      out.push(renderTable(rows));
      continue;
    }

    // 标题
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    // 分隔线
    if (/^---+\s*$/.test(line)) {
      out.push('<hr/>');
      index += 1;
      continue;
    }

    // 引用块
    if (/^>\s?/.test(line)) {
      const buffer = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        buffer.push(lines[index].replace(/^>\s?/, ''));
        index += 1;
      }
      out.push(`<blockquote>${renderInline(buffer.join(' '))}</blockquote>`);
      continue;
    }

    // 原样 HTML（本文件只用到 details / summary）
    if (/^<\/?(details|summary)[^>]*>/.test(line.trim())) {
      out.push(line.trim());
      index += 1;
      continue;
    }

    // 列表（支持一级缩进嵌套，够本文件用）
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const tag = ordered ? 'ol' : 'ul';
      const items = [];
      while (index < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[index])) {
        const content = lines[index].replace(/^\s*([-*]|\d+\.)\s+/, '');
        items.push(`<li>${renderInline(content)}</li>`);
        index += 1;
      }
      out.push(`<${tag}>${items.join('')}</${tag}>`);
      continue;
    }

    // 空行
    if (line.trim() === '') {
      index += 1;
      continue;
    }

    // 段落：合并到空行或下一个块级结构为止
    const paragraph = [];
    while (
      index < lines.length &&
      lines[index].trim() !== '' &&
      !/^```/.test(lines[index]) &&
      !/^(#{1,6})\s+/.test(lines[index]) &&
      !/^>\s?/.test(lines[index]) &&
      !/^---+\s*$/.test(lines[index]) &&
      !/^\s*([-*]|\d+\.)\s+/.test(lines[index]) &&
      !(isTableRow(lines[index]) && index + 1 < lines.length && isTableSeparator(lines[index + 1])) &&
      !/^<\/?(details|summary)[^>]*>/.test(lines[index].trim())
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    out.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
  }

  return out.join('\n');
}

const CSS = `
@page { size: A4; margin: 16mm 14mm; }
* { box-sizing: border-box; }
body {
  font-family: "Microsoft YaHei", "Segoe UI", "PingFang SC", sans-serif;
  font-size: 10pt; line-height: 1.65; color: #1f2328; margin: 0;
}
h1 { font-size: 19pt; border-bottom: 2px solid #1f2328; padding-bottom: 6px; margin: 0 0 12px; }
h2 { font-size: 14pt; border-bottom: 1px solid #d0d7de; padding-bottom: 4px; margin: 22px 0 10px; page-break-after: avoid; }
h3 { font-size: 12pt; margin: 16px 0 8px; page-break-after: avoid; }
h4 { font-size: 10.5pt; margin: 12px 0 6px; page-break-after: avoid; }
p { margin: 6px 0; }
ul, ol { margin: 6px 0; padding-left: 22px; }
li { margin: 2px 0; }
code {
  font-family: Consolas, "Courier New", monospace; font-size: 8.8pt;
  background: #f2f4f6; padding: 1px 4px; border-radius: 3px;
}
pre {
  background: #f6f8fa; border: 1px solid #d0d7de; border-radius: 4px;
  padding: 8px 10px; overflow-x: auto; page-break-inside: avoid; margin: 8px 0;
}
pre code { background: none; padding: 0; font-size: 8.4pt; line-height: 1.45; }
table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 8.8pt; page-break-inside: auto; }
th, td { border: 1px solid #c8ccd1; padding: 4px 6px; text-align: left; vertical-align: top; }
th { background: #eef1f4; font-weight: 600; }
tr { page-break-inside: avoid; }
blockquote {
  border-left: 3px solid #c8ccd1; margin: 8px 0; padding: 4px 12px;
  color: #4b5158; background: #fafbfc;
}
img { max-width: 100%; }
hr { border: none; border-top: 1px solid #d0d7de; margin: 16px 0; }
a { color: #0b5cad; text-decoration: none; }
details { border: 1px solid #d0d7de; border-radius: 4px; padding: 6px 10px; margin: 8px 0; page-break-inside: avoid; }
summary { cursor: pointer; color: #4b5158; }
`;

const markdown = readFileSync(SOURCE, 'utf8');
// 打印时展开折叠块，避免 PDF 里丢掉内容
const body = convert(markdown).replace(/<details>/g, '<details open>');

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<title>Lab1 Phase 1 — CLI SVG 编辑器 · 设计文档</title>
<style>${CSS}</style>
</head>
<body>
${body}
</body>
</html>
`;

mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(OUTPUT, html, 'utf8');
console.log(`已生成 ${OUTPUT}（${(html.length / 1024).toFixed(0)} KB）`);
