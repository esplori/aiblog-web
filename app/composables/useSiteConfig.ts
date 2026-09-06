/**
 * 站点品牌配置（可换肤换名）。
 * 读取 nuxt.config runtimeConfig.public.site，若配了 brandColor 则注入
 * --color-brand 等 CSS 变量，实现"一套代码、改 .env 即换主题"。
 */
export const useSiteConfig = () => {
  const config = useRuntimeConfig()
  const site = config.public.site || {
    name: 'Pylox',
    tagline: 'AI 驱动的现代化博客系统',
    description: 'Pylox — AI 驱动的现代化博客系统',
    brandColor: '#2563eb',
  }

  return {
    site,
    name: site.name,
    tagline: site.tagline,
    description: site.description,
    brandColor: site.brandColor,
  }
}

/**
 * 设置品牌 CSS 变量。调用方在 <script setup> 的 onMounted 或组件顶层执行，
 * 让 --color-brand 等颜色变量生效，配合 tailwind 的 brand-* 工具类实现主题化。
 */
export const applyBrandTheme = (brandColor?: string) => {
  if (import.meta.server) return
  const color = brandColor || useSiteConfig().brandColor
  if (!color) return
  const root = document.documentElement
  root.style.setProperty('--color-brand', color)
}
