import type { ApiResponse } from '~/types'
import { authCookieOptions, TOKEN_COOKIE } from '~/utils/authCookie'

export const useApi = () => {
  const token = useCookie(TOKEN_COOKIE, authCookieOptions())
  // 401 回跳用:在 setup 语境里先捕获当前路径。
  // 不能在异步回调里再取 useRoute() —— 那时 Nuxt 上下文可能已丢失(如 onMounted 里发起的请求)。
  let currentPath: string | null = null
  try {
    currentPath = useRoute().fullPath
  } catch {
    currentPath = null
  }

  const request = async <T>(
    url: string,
    options: {
      method?: string
      body?: any
      params?: Record<string, any>
    } = {}
  ): Promise<ApiResponse<T>> => {
    // 兼容调用方误传 { params: {...} } 的写法（如后台分页参数），
    // useApi.get(url, params) 的第二个参数本就是 params 对象，若再包一层 { params } 会导致
    // ofetch 把整个对象序列化成单个名为 params 的查询参数，后端无法解析分页字段。
    let { params } = options
    if (
      params &&
      typeof params === 'object' &&
      !Array.isArray(params) &&
      (params as any).params &&
      typeof (params as any).params === 'object' &&
      !Array.isArray((params as any).params)
    ) {
      params = (params as any).params
    }

    const headers: Record<string, string> = {}
    // FormData 让浏览器自动设置 Content-Type（含 boundary）
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }

    // SSR 时从请求头获取 cookie，客户端时使用 useCookie
    let authToken = token.value
    if (import.meta.server) {
      const reqHeaders = useRequestHeaders(['cookie'])
      const cookieHeader = reqHeaders.cookie
      if (cookieHeader) {
        const match = cookieHeader.match(/token=([^;]+)/)
        if (match) {
          authToken = match[1]
        }
      }
    }

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    try {
      // SSR 时直接请求容器内后端地址，避免 Nitro 自身无 /api 代理导致 404；
      // 浏览器端使用相对路径，由 nginx 将 /api 代理到后端
      const config = useRuntimeConfig()
      const fullUrl = import.meta.server ? `${config.apiBaseInternal}${url}` : url
      const response = await $fetch<ApiResponse<T>>(fullUrl, {
        method: (options.method || 'GET') as any,
        headers,
        body: options.body,
        params,
      })

      return response
    } catch (error: any) {
      if (error.statusCode === 401) {
        token.value = null
        // 带上来路,登录后可回到原页面;合法性由登录页的 useAuthRedirect 再校验一次。
        // ⚠ 不回跳登录页自身,避免自跳环。
        const target =
          currentPath && currentPath !== '/login' && !currentPath.startsWith('/login?')
            ? `/login?redirect=${encodeURIComponent(currentPath)}`
            : '/login'
        navigateTo(target)
      }
      throw error
    }
  }

  const get = <T>(url: string, params?: Record<string, any>) =>
    request<T>(url, { params })

  const post = <T>(url: string, body?: any) =>
    request<T>(url, { method: 'POST', body })

  const put = <T>(url: string, body?: any) =>
    request<T>(url, { method: 'PUT', body })

  const del = <T>(url: string) =>
    request<T>(url, { method: 'DELETE' })

  return { get, post, put, del, request }
}
