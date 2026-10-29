/**
 * 股票模块开关守卫：后台「站点设置」关掉股票模块时，/finance 一律回首页。
 *
 * 菜单里已经收起入口，这里兜的是「直接输 URL / 旧书签 / 搜索引擎缓存」，
 * 否则关掉开关后仍能摸进一个只剩骨架的页面。
 *
 * ⚠ 路由中间件比 app.vue 的 `await useSiteSettings()` 先跑，不能假设配置层已就绪，
 *    必须自己 await 一次（同 key 复用，不会重复请求）。
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path !== '/finance' && !to.path.startsWith('/finance/')) return

  const { data } = await useSiteSettings()
  const fromDb = (data.value as { stockEnabled?: boolean | string | null } | null)?.stockEnabled
  // DB 没配过（老数据 / 后端不可达）时才回退 .env 的 NUXT_PUBLIC_STOCK_ENABLED
  const enabled = fromDb === undefined || fromDb === null
    ? resolveStockEnabled(useRuntimeConfig().public.features?.stockEnabled as boolean | string | undefined)
    : resolveStockEnabled(fromDb)

  if (!enabled) {
    return navigateTo('/', { redirectCode: 302 })
  }
})
