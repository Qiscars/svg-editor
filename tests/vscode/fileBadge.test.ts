import { describe, expect, it } from 'vitest';

import {
  SVG_FILE_BADGE,
  isSvgDocument,
  isSvgPath,
} from '../../packages/vscode-svg/src/fileBadge.js';

describe('isSvgPath', () => {
  it.each([
    'a.svg',
    'A.SVG',
    'dir/a.svg',
    'dir/sub/A.Svg',
    'dir\\a.svg',
    'C:\\Users\\me\\picture.SVG',
    '.hidden.svg',
  ])('识别 SVG 文件：%s', (path) => {
    expect(isSvgPath(path)).toBe(true);
  });

  it.each([
    'a.svg.png',
    'dir.svg/x',
    'a.png',
    'svg',
    '.svg',
    'a.svg ',
    'a.svg.txt',
    'dir/a.SVG/',
    '',
  ])('排除非 SVG 路径：%j', (path) => {
    expect(isSvgPath(path)).toBe(false);
  });
});

describe('SVG_FILE_BADGE', () => {
  it('是 1–2 个字符的徽标', () => {
    expect(SVG_FILE_BADGE).toBe('[]');
    expect(SVG_FILE_BADGE.length).toBeGreaterThanOrEqual(1);
    expect(SVG_FILE_BADGE.length).toBeLessThanOrEqual(2);
  });
});

describe('isSvgDocument：语言 id + 路径的双判据', () => {
  it('VSCode 默认把 .svg 关联成 xml 语言，这时也必须命中', () => {
    expect(isSvgDocument('xml', '/work/samples/example.svg')).toBe(true);
  });

  it('语言 id 是 svg 时命中（即使路径没有 .svg 后缀）', () => {
    expect(isSvgDocument('svg', 'untitled-1')).toBe(true);
  });

  it('两者都不满足时不命中', () => {
    expect(isSvgDocument('xml', '/work/notes.txt')).toBe(false);
    expect(isSvgDocument('typescript', '/work/src/index.ts')).toBe(false);
    expect(isSvgDocument('xml', '/work/dir.svg/readme.md')).toBe(false);
  });

  it('大小写不影响路径判据', () => {
    expect(isSvgDocument('xml', '/work/A.SVG')).toBe(true);
  });
});