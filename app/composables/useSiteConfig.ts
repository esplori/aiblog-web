/**
 * 站点品牌配置（可换肤换名）。
 *
 * 数据来源优先级：后端 site_settings（后台可运行时切换，持久化到 DB） > .env(runtimeConfig) > 默认值。
 * 统一通过 useAsyncData 预取后端配置（SSR 阻塞渲染、随 payload 传递、客户端不重复请求），
 * 供 app.vue / 布局 / 页面同步读取生效值。后端不可达时回退 .env 兜底。
 */

export interface SiteConfig {
  name: string
  tagline: string
  description: string
  brandColor: string
  theme: string
  logoUrl: string
  faviconUrl: string
  footerText: string
  copyright: string
  icp: string
}

interface SiteResponse {
  code: number
  message: string
  data?: Partial<SiteConfig>
}

/** 读取 .env / 默认的站点配置（作为兜底） */
const envSite = (): SiteConfig => {
  const config = useRuntimeConfig()
  const site = config.public.site || {}
  return {
    name: site.name || 'Pylox',
    tagline: site.tagline || '',
    description: site.description || '',
    brandColor: site.brandColor || '#2563eb',
    theme: site.theme || 'blue',
    logoUrl: site.logoUrl || '',
    faviconUrl: site.faviconUrl || '',
    footerText: site.footerText || '',
    copyright: site.copyright || '',
    icp: site.icp || '',
  }
}

const fetchDb = async (): Promise<Partial<SiteConfig> | null> => {
  const runtime = useRuntimeConfig()
  const url = import.meta.server
    ? `${runtime.apiBaseInternal}/api/site-settings`
    : '/api/site-settings'
  try {
    const res = await $fetch<SiteResponse>(url)
    if (res?.code === 200 && res.data) {
      return res.data
    }
    return null
  } catch (e) {
    // 后端暂不可达时回退 .env 默认
    return null
  }
}

/** 合并 .env 与后端配置（后端字段为空时不覆盖默认值） */
const mergeSite = (env: SiteConfig, db: Partial<SiteConfig> | null): SiteConfig => {
  if (!db) return env
  const clean: Partial<SiteConfig> = {}
  for (const [k, v] of Object.entries(db)) {
    if (v != null && v !== '') (clean as any)[k] = v
  }
  return { ...env, ...clean }
}

/**
 * 预取后端站点设置（同 key，任意调用点共享一份，SSR 后随 payload 下发）。
 * app.vue 顶层 `await useSiteSettings()` 保证渲染前已就绪。
 */
export const useSiteSettings = () =>
  useAsyncData<Partial<SiteConfig> | null>('site-settings', () => fetchDb(), {
    default: () => null,
  })

/**
 * 同步读取当前生效的站点配置（后端优先，其次 .env）。
 * 需在 app.vue await useSiteSettings() 后调用，值已就绪可直接解构。
 */
export const useSiteConfig = (): SiteConfig => {
  const { data } = useSiteSettings()
  return mergeSite(envSite(), data.value)
}

/**
 * 强制刷新站点配置（后台保存后调用，让新配置即时生效）。
 */
export const refreshSiteSettings = async (): Promise<void> => {
  await useSiteSettings().refresh()
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
