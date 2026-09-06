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
 * 将品牌色写入 <html> 标签的内联 style。
 * 基于 useHead 的 htmlAttrs，在 SSR 阶段即输出，客户端 hydration 直接继承，
 * 避免 onMounted 注入造成的首屏颜色闪烁（FOUC）。
 * 需在 <script setup> 顶层调用（不能放 onMounted 内，否则丢失 SSR 时机）。
 */
export const useBrandTheme = (brandColor?: string) => {
  const { brandColor: fallback } = useSiteConfig()
  const color = brandColor || fallback
  if (!color) return
  useHead({
    htmlAttrs: {
      style: {
        '--color-brand': color,
      },
    },
  })
}
