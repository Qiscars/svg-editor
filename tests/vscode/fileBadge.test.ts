import { describe, expect, it } from 'vitest';

import {
  SVG_FILE_BADGE,
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
