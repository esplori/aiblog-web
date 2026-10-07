/**
 * 登录页改造 · 纯逻辑单测
 *
 * 覆盖 docs/login-redesign-acceptance.md 的:
 *   T-01 ~ T-06  错误分类(useAuthError)
 *   T-07 ~ T-12  回跳白名单(useAuthRedirect)← 安全权重最高的一组
 *   T-13         cookie 选项唯一来源(authCookie)
 *
 * ⚠ 这些模块都不依赖 Nuxt 运行时(useRoute 只在组合式函数体内调用),
 * 因此可以在普通 vitest 环境里直接测,不需要搭 Nuxt 测试宿主。
 */
import { describe, expect, it } from 'vitest'

import { classifyAuthError } from '../app/composables/useAuthError'
import { isSafeInternalPath, resolveRedirect } from '../app/composables/useAuthRedirect'
import {
  authCookieOptions,
  DEFAULT_COOKIE_MAX_AGE,
  REFRESH_TOKEN_COOKIE,
  REMEMBER_COOKIE_MAX_AGE,
  TOKEN_COOKIE,
} from '../app/utils/authCookie'

/** 构造一个形如 ofetch FetchError 的异常 */
const httpError = (statusCode: number, message?: string) =>
  Object.assign(new Error(message ?? 'request failed'), {
    statusCode,
    data: message ? { code: statusCode, message } : undefined,
  })

describe('T-01~T-06 错误分类', () => {
  it('T-01 401 → 凭据错误,聚焦密码框', () => {
    const info = classifyAuthError(httpError(401))
    expect(info.kind).toBe('credential')
    expect(info.action).toBe('focus-password')
    expect(info.message).toContain('用户名或密码错误')
    expect(info.statusCode).toBe(401)
  })

  it('T-02 500 → 服务端故障,给重试', () => {
    const info = classifyAuthError(httpError(500))
    expect(info.kind).toBe('server')
    expect(info.action).toBe('retry')
    expect(info.message).toContain('服务暂时不可用')
  })

  it('T-03 无状态码 → 网络不通(而不是「登录失败」)', () => {
    const info = classifyAuthError(new Error('fetch failed'))
    expect(info.kind).toBe('network')
    expect(info.action).toBe('retry')
    expect(info.message).toContain('网络连接失败')
    expect(info.message).not.toContain('登录失败')
  })

  it('T-04 离线时文案改为「离线」', () => {
    const info = classifyAuthError(new Error('fetch failed'), { online: false })
    expect(info.kind).toBe('network')
    expect(info.message).toContain('离线')
  })

  it('T-05 429 → 频次限制,按钮退避', () => {
    const info = classifyAuthError(httpError(429, '稍后再试'))
    expect(info.kind).toBe('rate-limit')
    expect(info.action).toBe('backoff')
    expect(info.message).toBe('稍后再试')
  })

  it('T-06 400 → 透传后端文案(如「邮箱已被注册」)', () => {
    const info = classifyAuthError(httpError(400, '邮箱已被注册'))
    expect(info.kind).toBe('bad-request')
    expect(info.message).toBe('邮箱已被注册')
  })

  it('T-06b 409(冲突)也归入参数/业务类', () => {
    expect(classifyAuthError(httpError(409, '用户名已存在')).kind).toBe('bad-request')
  })

  it('T-06c 响应形状兼容 err.response.status', () => {
    const err = { response: { status: 401 } }
    expect(classifyAuthError(err).kind).toBe('credential')
  })

  it('T-06d 401 优先于「无状态码」判定(顺序回归)', () => {
    // 若把 network 分支提到前面,凭据错误会被误判为网络错误
    expect(classifyAuthError({ statusCode: 401 }).kind).toBe('credential')
  })
})

describe('T-07~T-12 回跳白名单(防开放重定向)', () => {
  const FALLBACK = '/'

  it('T-07 外站绝对地址被拒', () => {
    expect(resolveRedirect('https://evil.com', FALLBACK)).toBe(FALLBACK)
    expect(resolveRedirect('http://evil.com/x', FALLBACK)).toBe(FALLBACK)
  })

  it('T-08 协议相对地址 // 被拒', () => {
    expect(resolveRedirect('//evil.com', FALLBACK)).toBe(FALLBACK)
    expect(isSafeInternalPath('//evil.com')).toBe(false)
  })

  it('T-09 反斜杠绕过被拒(部分浏览器把 \\ 规范化成 /)', () => {
    expect(resolveRedirect('/\\evil.com', FALLBACK)).toBe(FALLBACK)
    expect(resolveRedirect('/a\\b', FALLBACK)).toBe(FALLBACK)
  })

  it('T-10 路径穿越被拒(含 URL 编码形式)', () => {
    expect(resolveRedirect('/admin/../..%2Fetc', FALLBACK)).toBe(FALLBACK)
    expect(resolveRedirect('/%2e%2e/etc', FALLBACK)).toBe(FALLBACK)
    expect(resolveRedirect('/a/../../b', FALLBACK)).toBe(FALLBACK)
  })

  it('T-11 合法站内路径原样返回(含查询串)', () => {
    expect(resolveRedirect('/admin/articles?page=2', FALLBACK)).toBe('/admin/articles?page=2')
    expect(resolveRedirect('/post/hello-world', FALLBACK)).toBe('/post/hello-world')
  })

  it('T-12 缺失/非法类型 → 回落', () => {
    expect(resolveRedirect(undefined, '/admin')).toBe('/admin')
    expect(resolveRedirect(null, '/admin')).toBe('/admin')
    expect(resolveRedirect('', '/admin')).toBe('/admin')
    expect(resolveRedirect(123, '/admin')).toBe('/admin')
    expect(resolveRedirect({}, '/admin')).toBe('/admin')
  })

  it('T-12b 数组取首项;首项非法则回落', () => {
    expect(resolveRedirect(['/articles', '/other'], FALLBACK)).toBe('/articles')
    expect(resolveRedirect(['//evil.com', '/ok'], FALLBACK)).toBe(FALLBACK)
  })

  it('T-12c 不回跳登录页自身(防自跳环)', () => {
    expect(resolveRedirect('/login', FALLBACK)).toBe(FALLBACK)
    expect(resolveRedirect('/login?redirect=%2Fadmin', FALLBACK)).toBe(FALLBACK)
  })

  it('T-12d 控制字符被拒(响应头注入/解析歧义)', () => {
    expect(isSafeInternalPath('/a\nb')).toBe(false)
    expect(isSafeInternalPath('/a\r\nSet-Cookie: x=1')).toBe(false)
    expect(isSafeInternalPath('/a\u0000b')).toBe(false)
  })

  it('T-12e 非法百分号编码被拒(而不是抛异常)', () => {
    expect(isSafeInternalPath('/%')).toBe(false)
    expect(isSafeInternalPath('/%zz')).toBe(false)
  })

  it('T-12f 二次编码的 // 被拒', () => {
    expect(isSafeInternalPath('/%2F%2Fevil.com')).toBe(false)
  })

  it('T-12g 以单个 / 开头的普通路径被接受', () => {
    expect(isSafeInternalPath('/')).toBe(true)
    expect(isSafeInternalPath('/admin')).toBe(true)
    expect(isSafeInternalPath('  /admin  ')).toBe(true)
  })
})

describe('T-13 cookie 选项唯一来源', () => {
  it('默认有效期与改造前一致(7 天)', () => {
    expect(DEFAULT_COOKIE_MAX_AGE).toBe(60 * 60 * 24 * 7)
    expect(authCookieOptions().maxAge).toBe(DEFAULT_COOKIE_MAX_AGE)
  })

  it('secure/path 取值符合既有部署口径(HTTP 兼容)', () => {
    const o = authCookieOptions()
    expect(o.secure).toBe(false)
    expect(o.path).toBe('/')
  })

  it('记住我可传更长有效期(阶段三备用)', () => {
    expect(authCookieOptions(REMEMBER_COOKIE_MAX_AGE).maxAge).toBe(60 * 60 * 24 * 30)
  })

  it('每次返回新对象,调用点之间不会互相污染', () => {
    const a = authCookieOptions()
    const b = authCookieOptions()
    expect(a).not.toBe(b)
    a.maxAge = 1
    expect(b.maxAge).toBe(DEFAULT_COOKIE_MAX_AGE)
  })

  it('cookie 名为既有约定值(改名会让所有已登录用户掉线)', () => {
    expect(TOKEN_COOKIE).toBe('token')
    expect(REFRESH_TOKEN_COOKIE).toBe('refreshToken')
  })
})
