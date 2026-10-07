import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    // 只收 .test.ts。
    // ⚠ 既有的 tests/article-cover.test.mjs 用的是 node:test(另一个 runner),
    // 由 `pnpm test:node` 单独跑 —— 不把它改写成 vitest 风格(验收 T0-2)。
    include: ['tests/**/*.test.ts'],
  },
})
