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
        // 品牌色：由 --color-brand CSS 变量驱动，运行时可通过 useSiteConfig 换肤
        brand: {
          DEFAULT: 'var(--color-brand)',
          50: 'color-mix(in srgb, var(--color-brand) 8%, white)',
          100: 'color-mix(in srgb, var(--color-brand) 14%, white)',
          600: 'var(--color-brand)',
          700: 'color-mix(in srgb, var(--color-brand) 82%, black)',
        },
      },
    },
  },
  plugins: [],
}
