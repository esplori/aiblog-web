/**
 * 认证 Cookie 的共享选项(唯一来源)。
 *
 * 为什么抽出来:`stores/auth.ts` 与 `composables/useApi.ts` 原先各定义了一份**完全相同**的
 * cookieOptions。两份定义一旦漂移,就会出现「store 写的是这套选项、useApi 读的是另一套」
 * 这类极难排查的登录态问题。
 *
 * ⚠ 本文件位于 `app/utils/`,**不在** `tailwind.config.js` 的 content globs 内 ——
 * 这里只放常量与纯逻辑,不要写 Tailwind 类名(那些类不会被生成)。
 */

/** access token 的 cookie 名 */
export const TOKEN_COOKIE = 'token'

/** refresh token 的 cookie 名 */
export const REFRESH_TOKEN_COOKIE = 'refreshToken'

/** 默认有效期:7 天(秒)—— 与改造前保持一致 */
export const DEFAULT_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

/** 记住我:30 天(秒) —— 阶段三启用,此处先备好常量 */
export const REMEMBER_COOKIE_MAX_AGE = 60 * 60 * 24 * 30

/**
 * 生成 cookie 选项。
 *
 * ⚠ `secure: false` 是**刻意保留**的:本项目部署口径包含纯 HTTP(`auth.ts` 原注释已说明),
 * 改成 `true` 会让 HTTP 环境下的 cookie 完全写不进去。若要按部署环境区分,应改由
 * 环境变量注入 —— 那涉及两处调用点与部署文档,属独立改动,不在登录页改造范围内。
 */
export const authCookieOptions = (maxAge: number = DEFAULT_COOKIE_MAX_AGE) => ({
  maxAge,
  secure: false,
  path: '/',
})
