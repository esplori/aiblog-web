<script setup lang="ts">
import type { LoginData } from '~/types'

definePageMeta({
  layout: false,
})

const authStore = useAuthStore()
const { post } = useApi()

const activeTab = ref<'login' | 'register'>('login')

const form = reactive({
  username: '',
  password: '',
})
const loading = ref(false)

const registerForm = reactive({
  username: '',
  email: '',
  displayName: '',
  password: '',
  confirmPassword: '',
})
const registerLoading = ref(false)

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
    navigateTo(res.data.userInfo?.role === 'admin' ? '/admin' : '/')
  } catch (e: any) {
    ElMessage.error(e?.data?.message || '登录失败')
  } finally {
    loading.value = false
  }
}

const handleRegister = async () => {
  if (!registerForm.username || !registerForm.email || !registerForm.password) {
    ElMessage.warning('请填写用户名、邮箱和密码')
    return
  }
  if (registerForm.password !== registerForm.confirmPassword) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }

  registerLoading.value = true
  try {
    const { confirmPassword, ...payload } = registerForm
    await post('/api/auth/register', payload)
    ElMessage.success('注册成功，正在自动登录...')
    // 注册成功后自动登录
    const res = await post<LoginData>('/api/auth/login', {
      username: registerForm.username,
      password: registerForm.password,
    })
    authStore.setAuth(res.data)
    navigateTo(res.data.userInfo?.role === 'admin' ? '/admin' : '/')
  } catch (e: any) {
    ElMessage.error(e?.data?.message || '注册失败')
  } finally {
    registerLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600">
    <div class="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
      <div class="text-center mb-6">
        <h1 class="text-2xl font-bold text-gray-800">Pylox</h1>
        <p class="text-gray-500 mt-2">{{ activeTab === 'login' ? '登录到你的账户' : '创建你的账户' }}</p>
      </div>

      <el-tabs v-model="activeTab" class="mb-6">
        <el-tab-pane label="登录" name="login">
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
        </el-tab-pane>

        <el-tab-pane label="注册" name="register">
          <el-form :model="registerForm" @submit.prevent="handleRegister">
            <el-form-item>
              <el-input
                v-model="registerForm.username"
                placeholder="用户名（3-50个字符）"
                size="large"
                prefix-icon="ep:user"
              />
            </el-form-item>

            <el-form-item>
              <el-input
                v-model="registerForm.email"
                placeholder="邮箱"
                size="large"
                prefix-icon="ep:message"
              />
            </el-form-item>

            <el-form-item>
              <el-input
                v-model="registerForm.displayName"
                placeholder="显示名称（可选）"
                size="large"
                prefix-icon="ep:avatar"
              />
            </el-form-item>

            <el-form-item>
              <el-input
                v-model="registerForm.password"
                type="password"
                placeholder="密码（至少6位）"
                size="large"
                prefix-icon="ep:lock"
                show-password
              />
            </el-form-item>

            <el-form-item>
              <el-input
                v-model="registerForm.confirmPassword"
                type="password"
                placeholder="确认密码"
                size="large"
                prefix-icon="ep:lock"
                show-password
                @keyup.enter="handleRegister"
              />
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                size="large"
                :loading="registerLoading"
                class="w-full"
                @click="handleRegister"
              >
                注册
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>
