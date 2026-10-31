/**
 * 站点品牌配置（可换肤换名）。
 *
 * 数据来源优先级：后端 site_settings（后台可运行时切换，持久化到 DB） > .env(runtimeConfig) > 默认值。
 * 统一通过 useAsyncData 预取后端配置（SSR 阻塞渲染、随 payload 传递、客户端不重复请求），
 * 供 app.vue / 布局 / 页面同步读取生效值。后端不可达时回退 .env 兜底。
 */

import { resolveOffByDefault, resolveStockEnabled } from '~/utils/featureFlags'

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
  /** 股票模块开关：后台设置页可切换，false 收起侧边栏入口并拦 /finance */
  stockEnabled: boolean
  /** 登录入口开关：默认关，关闭后前台不显示登录入口（/login 直连仍可用，避免把自己锁死） */
  loginEnabled: boolean
  /** 评论功能开关：默认关，关闭后文章页不显示评论区 */
  commentEnabled: boolean
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
    // 环境变量兜底：DB 里没配过时按 .env 的 NUXT_PUBLIC_STOCK_ENABLED 决定（默认开）
    stockEnabled: resolveStockEnabled(
      config.public.features?.stockEnabled as boolean | string | undefined,
    ),
    // 这两个默认关：.env 兜底同样只认明确的 true
    loginEnabled: resolveOffByDefault(
      config.public.features?.loginEnabled as boolean | string | undefined,
    ),
    commentEnabled: resolveOffByDefault(
      config.public.features?.commentEnabled as boolean | string | undefined,
    ),
  }
}

/**
 * 后端字段名和前端 SiteConfig 有三处不一致：siteName / siteTagline / siteDescription。
 * 早先这三项没做映射就合并，结果后台改了站名前台毫无反应（一直取 .env 的兜底名）——
 * 其它字段（brandColor / icp / footerText…）名字正好相同，把这个坑掩住了。
 */
export const normalizeDb = (raw: Partial<SiteConfig> & Record<string, any>): Partial<SiteConfig> => {
  const { siteName, siteTagline, siteDescription, ...rest } = raw
  return {
    ...rest,
    name: siteName ?? (raw as any).name,
    tagline: siteTagline ?? (raw as any).tagline,
    description: siteDescription ?? (raw as any).description,
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
      return normalizeDb(res.data as any)
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
