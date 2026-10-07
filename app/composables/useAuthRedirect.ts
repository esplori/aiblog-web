/**
 * 登录后回跳目标的解析与校验。
 *
 * ## 为什么需要校验(安全)
 * `useApi` 在 401 时会把当前路径塞进 `/login?redirect=...`,登录成功后再跳回去。
 * 但 `redirect` 是**用户可控**的查询参数 —— 若直接 `navigateTo(redirect)`,
 * 攻击者就能构造看起来完全像站内链接的钓鱼地址:
 *
 * ```
 *   /login?redirect=//evil.com        → 浏览器按协议相对地址解析,跳到 evil.com
 *   /login?redirect=https://evil.com  → 直接跳外站
 *   /login?redirect=/\evil.com        → 部分浏览器把 \ 规范化成 /,同样跳外站
 *   /login?redirect=%2F%2E%2E%2Fetc   → 编码后的路径穿越
 * ```
 * 这就是**开放重定向(Open Redirect)**。因此这里只接受「站内绝对路径」,
 * 其余一律回落到默认页。
 *
 * ⚠ 本文件不含任何 Nuxt 依赖 —— 纯函数放在模块顶层,`useAuthRedirect()` 才碰 `useRoute()`,
 * 因此可以在普通 vitest(node 环境)里直接单测白名单逻辑。
 */

/** 控制字符(含换行):可用于响应头注入或解析歧义,一律拒绝 */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/

/**
 * 站内绝对路径判定。
 * 通过条件(全部满足):
 *   1. 是字符串且非空;
 *   2. 以单个 `/` 开头(站内绝对路径);
 *   3. 不是 `//` 或 `/\` 开头(这两种会被浏览器当作跨站地址);
 *   4. 不含反斜杠(部分浏览器会把 `\` 规范化成 `/`,用来绕过第 3 条);
 *   5. 不含控制字符;
 *   6. 去掉 URL 编码后不含 `..`(挡住 `%2e%2e%2f` 形式的穿越)。
 */
export const isSafeInternalPath = (value: unknown): boolean => {
  if (typeof value !== 'string') return false
  const path = value.trim()
  if (!path) return false
  if (!path.startsWith('/')) return false
  if (path.startsWith('//') || path.startsWith('/\\')) return false
  if (path.includes('\\')) return false
  if (CONTROL_CHARS.test(path)) return false

  let decoded = path
  try {
    decoded = decodeURIComponent(path)
  } catch {
    // 非法百分号编码 → 无法确认安全性 → 拒绝
    return false
  }
  if (decoded.includes('..')) return false
  // 解码后再查一次,防止 `%2F%2Fevil.com` 这类二次编码绕过
  if (decoded.startsWith('//') || decoded.includes('\\')) return false
  return true
}

/** 登录页自身:作为回跳目标会造成自跳环,必须排除 */
const isLoginPath = (path: string): boolean =>
  path === '/login' || path.startsWith('/login?') || path.startsWith('/login/') || path.startsWith('/login#')

/**
 * 解析 `redirect` 查询参数。
 *
 * @param raw      查询参数原值(可能是 string / string[] / undefined)
 * @param fallback 不合法或缺失时的落点(调用方按角色决定,如 admin → '/admin')
 * @returns 站内路径;不合法则返回 `fallback`
 */
export const resolveRedirect = (raw: unknown, fallback: string): string => {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!isSafeInternalPath(value)) return fallback
  const path = (value as string).trim()
  if (isLoginPath(path)) return fallback
  return path
}

/**
 * 读取当前路由的 `redirect` 参数并给出登录后的落点。
 * 需在 setup 语境中调用(`useRoute()` 依赖 Nuxt 上下文)。
 */
export const useAuthRedirect = () => {
  const route = useRoute()
  return {
    /** @param isAdmin 登录用户是否为管理员,决定默认落点 */
    targetAfterLogin: (isAdmin: boolean) =>
      resolveRedirect(route.query.redirect, isAdmin ? '/admin' : '/'),
  }
}
