/**
 * 页面访问埋点（非文章页）。
 *
 * 分工：
 *  - 文章详情由后端在 getArticleByUuid 时记录（能拿到 article_id，还能顺带 view_count 自增）；
 *  - 其余页面没有实体可挂，只能前端在导航落地后上报。
 *
 * 三条约定：
 *  1. 只上报 path，不带查询串 —— 否则 ?page=2&keyword=xxx 会把维度撑爆；
 *  2. 后台、工作台、登录页一律不报（含用户态，统计里没有意义还浪费配额）；
 *  3. 同一次会话内同一 path 只发一次，后端还有 10 分钟窗口去重兜底。
 */
const SKIP = [/^\/admin/, /^\/workbench/, /^\/login/, /^\/post\//, /^\/403/]

const TYPE_RULES: Array<[RegExp, string]> = [
  [/^\/$/, 'home'],
  [/^\/articles/, 'list'],
  [/^\/interview/, 'interview'],
  [/^\/ai/, 'ai'],
]

function pageTypeOf(path: string): string | null {
  if (SKIP.some((re) => re.test(path))) return null
  for (const [re, type] of TYPE_RULES) {
    if (re.test(path)) return type
  }
  return 'other'
}

export default defineNuxtPlugin((nuxtApp) => {
  const sent = new Set<string>()

  const report = (path: string) => {
    const type = pageTypeOf(path)
    if (!type || sent.has(path)) return
    sent.add(path)
    // 失败静默：埋点不能影响浏览，也不该在前端控制台刷错误
    $fetch('/api/page-views', { method: 'POST', body: { type, path } }).catch(() => {})
  }

  // page:finish 覆盖首屏与后续所有导航（router.afterEach 拿不到首屏）
  nuxtApp.hook('page:finish', () => {
    try {
      report(useRoute().path)
    } catch {
      // 上下文缺失时忽略
    }
  })
})
