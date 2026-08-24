import type { ApiResponse } from '~/types'

const cookieOptions = {
  maxAge: 60 * 60 * 24 * 7,
  secure: false,
  path: '/',
}

export const useApi = () => {
  const config = useRuntimeConfig()
  const token = useCookie('token', cookieOptions)

  const request = async <T>(
    url: string,
    options: {
      method?: string
      body?: any
      params?: Record<string, any>
    } = {}
  ): Promise<ApiResponse<T>> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (token.value) {
      headers['Authorization'] = `Bearer ${token.value}`
    }

    try {
      const response = await $fetch<ApiResponse<T>>(url, {
        baseURL: config.public.apiBase as string,
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
