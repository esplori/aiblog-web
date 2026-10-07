/**
 * 登录/注册错误的分类。
 *
 * ## 为什么需要(改造前的缺陷)
 * 改造前 `login.vue` 把所有异常压成一句 `e?.data?.message || '登录失败'`。
 * 后果是**网络断了也显示「登录失败」**,用户会以为密码错了,反复重试、甚至去改密码。
 * 这里把错误分成五类,给出**不同文案 + 不同后续动作**。
 *
 * ⚠ 本文件不含任何 Nuxt 依赖(纯函数 + 一个薄包装),可在普通 vitest 里直接单测。
 */

export type AuthErrorKind =
  | 'credential' // 凭据错误(用户名或密码不对)
  | 'rate-limit' // 触发频次限制
  | 'bad-request' // 参数/业务校验被后端拒绝
  | 'server' // 后端故障
  | 'network' // 请求根本没到达服务端
  | 'unknown'

export type AuthErrorAction =
  | 'focus-password' // 把焦点移到密码框
  | 'retry' // 给出「重试」按钮
  | 'backoff' // 按钮进入倒计时
  | 'none'

export interface AuthErrorInfo {
  kind: AuthErrorKind
  message: string
  action: AuthErrorAction
  statusCode?: number
}

/** 从 ofetch 的 FetchError 里取 HTTP 状态码(容忍几种常见形状) */
const statusOf = (err: unknown): number | undefined => {
  const e = err as Record<string, any> | null | undefined
  if (!e || typeof e !== 'object') return undefined
  const candidates = [e.statusCode, e.status, e.response?.status]
  for (const c of candidates) {
    const n = typeof c === 'string' ? Number(c) : c
    if (typeof n === 'number' && Number.isFinite(n) && n > 0) return n
  }
  return undefined
}

/** 取后端返回的 message(统一响应体是 { code, message, data, timestamp }) */
const serverMessageOf = (err: unknown): string => {
  const e = err as Record<string, any> | null | undefined
  const m = e?.data?.message ?? e?.response?._data?.message
  return typeof m === 'string' ? m.trim() : ''
}

/**
 * 分类一个登录/注册异常。
 *
 * @param err    捕获到的异常(ofetch FetchError 最常见)
 * @param opts.online 浏览器是否在线(`navigator.onLine`);仅用于让「网络不通」的文案更准确。
 *                    服务端渲染或不确定时可传 `undefined`(视为在线,文案不带「离线」字样)。
 *
 * ⚠ **判定顺序很重要**:`401` 必须先于「无状态码」判,否则凭据错误会被当成网络错误。
 */
export const classifyAuthError = (
  err: unknown,
  opts: { online?: boolean } = {},
): AuthErrorInfo => {
  const status = statusOf(err)
  const serverMessage = serverMessageOf(err)

  if (status === 401) {
    return {
      kind: 'credential',
      // 不直接用后端文案:后端可能回英文或过于笼统。凭据错误是**高频且需要明确引导**的一类。
      message: serverMessage || '用户名或密码错误',
      action: 'focus-password',
      statusCode: status,
    }
  }

  if (status === 429) {
    return {
      kind: 'rate-limit',
      message: serverMessage || '尝试过于频繁,请稍后再试',
      action: 'backoff',
      statusCode: status,
    }
  }

  if (status === 400 || status === 422 || status === 409) {
    return {
      kind: 'bad-request',
      // 这一类后端文案最有用(如「邮箱已被注册」「用户名已存在」)→ 优先透传
      message: serverMessage || '输入内容不合法,请检查后重试',
      action: 'none',
      statusCode: status,
    }
  }

  if (status !== undefined && status >= 500) {
    return {
      kind: 'server',
      message: serverMessage || '服务暂时不可用,请稍后重试',
      action: 'retry',
      statusCode: status,
    }
  }

  // 到这里要么没有状态码(请求没到达服务端),要么是别的 4xx
  if (status === undefined) {
    return {
      kind: 'network',
      message:
        opts.online === false
          ? '当前处于离线状态,请检查网络后重试'
          : '网络连接失败,请检查网络后重试',
      action: 'retry',
    }
  }

  return {
    kind: 'unknown',
    message: serverMessage || '登录失败,请稍后重试',
    action: 'none',
    statusCode: status,
  }
}

/**
 * 薄包装:给组件用的组合式函数。
 * 之所以保留这个包装,是为了让组件侧统一从这里取分类能力,而不是各自 import 纯函数。
 */
export const useAuthError = () => {
  const online = (): boolean | undefined =>
    import.meta.client && typeof navigator !== 'undefined' ? navigator.onLine : undefined

  return {
    classify: (err: unknown): AuthErrorInfo => classifyAuthError(err, { online: online() }),
  }
}
