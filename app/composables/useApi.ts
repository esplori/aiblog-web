import type { ApiResponse } from '~/types'

const cookieOptions = {
  maxAge: 60 * 60 * 24 * 7,
  secure: false,
  path: '/',
}

export const useApi = () => {
  const token = useCookie('token', cookieOptions)

  const request = async <T>(
    url: string,
    options: {
      method?: string
      body?: any
      params?: Record<string, any>
    } = {}
  ): Promise<ApiResponse<T>> => {
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
        params: options.params,
      })

      return response
    } catch (error: any) {
      if (error.statusCode === 401) {
        token.value = null
        navigateTo('/login')
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

  return { get, post, put, del }
}
