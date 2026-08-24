import { defineStore } from 'pinia'
import type { User, LoginData } from '~/types'

// Cookie 选项：HTTP 环境下 secure 必须为 false
// sameSite 使用浏览器默认值（lax），避免跨端口问题
const cookieOptions = {
  maxAge: 60 * 60 * 24 * 7, // 7天
  secure: false,
  path: '/',
}

export const useAuthStore = defineStore('auth', () => {
  const token = useCookie('token', cookieOptions)
  const refreshToken = useCookie('refreshToken', cookieOptions)
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
