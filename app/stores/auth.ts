import { defineStore } from 'pinia'
import type { User, LoginData } from '~/types'
import { authCookieOptions, REFRESH_TOKEN_COOKIE, TOKEN_COOKIE } from '~/utils/authCookie'

// cookie 选项统一由 app/utils/authCookie.ts 提供:
// 原先此处与 composables/useApi.ts 各存一份**完全相同**的定义,一旦漂移就会出现
// 「store 写的 cookie 与 useApi 读的不是同一套选项」这类极难排查的问题。
export const useAuthStore = defineStore('auth', () => {
  const cookieOptions = authCookieOptions()
  const token = useCookie(TOKEN_COOKIE, cookieOptions)
  const refreshToken = useCookie(REFRESH_TOKEN_COOKIE, cookieOptions)
  const user = ref<User | null>(null)
  const isLoggedIn = computed(() => !!token.value)

  const setAuth = (data: LoginData) => {
    token.value = data.accessToken
    refreshToken.value = data.refreshToken
    user.value = data.userInfo
  }

  const logout = () => {
    token.value = null
    refreshToken.value = null
    user.value = null
    navigateTo('/login')
  }

  const fetchUser = async () => {
    if (!token.value) return
    try {
      const { get } = useApi()
      const res = await get<User>('/api/users/me')
      user.value = res.data
    } catch {
      logout()
    }
  }

  return { user, token, isLoggedIn, setAuth, logout, fetchUser }
})
