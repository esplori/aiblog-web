/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/components/**/*.{js,vue,ts}',
    './app/layouts/**/*.vue',
    './app/pages/**/*.vue',
    './app/composables/**/*.{js,ts}',
    './app/plugins/**/*.{js,ts}',
    './app/app.vue',
  ],
  theme: {
    extend: {
      colors: {
        // 品牌色:由 --color-brand CSS 变量驱动,运行时可通过 useSiteConfig 换肤。
        //
        // ⚠ 原先只有 DEFAULT/50/100/600/700 五档 —— 写 `bg-brand-400` 这类**不会报错,
        // 只是静默不生成规则**。2026-10-07 按 docs/login-redesign-plan.md §5.3 补齐为 11 档。
        // 这是**纯增量**改动:既有 5 档的取值一字未动 ⇒ 现有页面渲染不变。
        brand: {
          DEFAULT: 'var(--color-brand)',
          50: 'color-mix(in srgb, var(--color-brand) 8%, white)',
          100: 'color-mix(in srgb, var(--color-brand) 14%, white)',
          200: 'color-mix(in srgb, var(--color-brand) 24%, white)',
          300: 'color-mix(in srgb, var(--color-brand) 38%, white)',
          400: 'color-mix(in srgb, var(--color-brand) 58%, white)',
          500: 'var(--color-brand)',
          600: 'var(--color-brand)',
          700: 'color-mix(in srgb, var(--color-brand) 82%, black)',
          800: 'color-mix(in srgb, var(--color-brand) 60%, black)',
          900: 'color-mix(in srgb, var(--color-brand) 42%, black)',
        },
      },
    },
  },
  plugins: [],
}
