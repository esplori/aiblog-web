/**
 * 功能开关（后台「站点设置」页可运行时切换，存后端 site_settings.stockEnabled）。
 *
 * 跟着 useSiteConfig 的全局配置层走：SSR 预取、客户端随 payload 共享，
 * 于是后台改完刷新生效，不需要重新构建镜像；.env 只作后端不可达时的兜底。
 */
export const useFeatureFlags = (): FeatureFlags => {
  const { stockEnabled } = useSiteConfig()
  return { stockEnabled: resolveStockEnabled(stockEnabled) }
}
