import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // 提交门禁在每个提交前都会跑 `vitest run`；还没有测试的阶段不应因此判定失败
    passWithNoTests: true,
  },
});
