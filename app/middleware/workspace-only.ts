/**
 * 工作台仅登录可见：未登录访客直接落到公开内容页（/articles）。
 * 这样工作台式首页不会成为陌生访客与爬虫的第一落点（见 docs/ai-plaza-design/v2/MVP.md 决策一）。
 */
export default defineNuxtRouteMiddleware(() => {
  const authStore = useAuthStore()
  if (!authStore.isLoggedIn) {
    return navigateTo('/articles', { redirectCode: 302 })
  }
})

