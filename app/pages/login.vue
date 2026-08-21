<script setup lang="ts">
import type { LoginData } from '~/types'

definePageMeta({
  layout: false,
})

const authStore = useAuthStore()
const { post } = useApi()

const form = reactive({
  username: '',
  password: '',
})
const loading = ref(false)

const handleLogin = async () => {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }

  loading.value = true
  try {
    const res = await post<LoginData>('/api/auth/login', form)
    authStore.setAuth(res.data)
    ElMessage.success('登录成功')
    navigateTo('/')
  } catch (e: any) {
    ElMessage.error(e?.data?.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600">
    <div class="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-800">AI Blog</h1>
        <p class="text-gray-500 mt-2">登录到你的账户</p>
      </div>

      <el-form :model="form" @submit.prevent="handleLogin">
        <el-form-item>
          <el-input
            v-model="form.username"
            placeholder="用户名"
            size="large"
            prefix-icon="ep:user"
          />
        </el-form-item>

        <el-form-item>
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            size="large"
            prefix-icon="ep:lock"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            class="w-full"
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>
