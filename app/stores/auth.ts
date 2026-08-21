import { defineStore } from 'pinia'
import type { User, LoginData } from '~/types'

export const useAuthStore = defineStore('auth', () => {
  const token = useCookie('token')
  const refreshToken = useCookie('refreshToken')
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
