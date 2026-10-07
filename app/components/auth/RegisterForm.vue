<script setup lang="ts">
/**
 * 注册表单(自包含:校验 → 注册 → 自动登录)。
 *
 * 与改造前的差异:
 *   - placeholder 原先「承诺」的规则(用户名 3-50、密码 ≥6)现在**真的校验**(审计 F2);
 *   - 邮箱做格式校验(F3);字段级错误就地渲染(F4);
 *   - 自动登录失败**不再报「注册失败」**(那时注册已成功,误报会让用户重复注册)⇒
 *     提示「注册成功,请手动登录」并通知父组件切到登录面板、带回用户名(审计 I6)。
 *
 * ⚠ 密码下限保持 6 位:与后端、`admin/settings.vue:66` 的 `min: 6` 一致。
 *   收紧密码策略是产品决策,不在登录页改造范围内。
 */
import type { LoginData } from '~/types'
import { useAuthError, type AuthErrorInfo } from '~/composables/useAuthError'
import { useAuthRedirect } from '~/composables/useAuthRedirect'

const emit = defineEmits<{ 'switch-to-login': [username: string] }>()

const authStore = useAuthStore()
const { post } = useApi()
const { targetAfterLogin } = useAuthRedirect()
const { classify } = useAuthError()

const registerForm = reactive({
  username: '',
  email: '',
  displayName: '',
  password: '',
  confirmPassword: '',
})
const registerLoading = ref(false)
const formError = ref<AuthErrorInfo | null>(null)
const formRef = ref()

const fieldRefs: Record<string, any> = {}
const setFieldRef = (key: string) => (el: any) => {
  fieldRefs[key] = el
}

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 50, message: '用户名长度 3-50 个字符', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (_rule: any, value: string, callback: any) => {
        if (value !== registerForm.password) callback(new Error('两次输入的密码不一致'))
        else callback()
      },
      trigger: 'blur',
    },
  ],
}

const submit = async () => {
  formError.value = null
  const valid = await formRef.value?.validate().catch((invalid: any) => {
    const first = Object.keys(invalid ?? {})[0]
    nextTick(() => fieldRefs[first]?.focus?.())
    return false
  })
  if (!valid) return

  registerLoading.value = true

  try {
    const { confirmPassword, ...payload } = registerForm
    await post('/api/auth/register', payload)
  } catch (e) {
    const info = classify(e)
    formError.value = info
    ElMessage.error(info.message)
    registerLoading.value = false
    return
  }

  // 注册已成功。以下自动登录若失败,**不能**报「注册失败」(审计 I6)。
  ElMessage.success('注册成功,正在自动登录...')
  try {
    const res = await post<LoginData>('/api/auth/login', {
      username: registerForm.username,
      password: registerForm.password,
    })
    authStore.setAuth(res.data)
    navigateTo(targetAfterLogin(res.data.userInfo?.role === 'admin'))
  } catch {
    const message = '注册成功,请手动登录'
    formError.value = { kind: 'unknown', message, action: 'none' }
    ElMessage.warning(message)
    emit('switch-to-login', registerForm.username)
  } finally {
    registerLoading.value = false
  }
}
</script>

<template>
  <el-form
    ref="formRef"
    :model="registerForm"
    :rules="rules"
    label-position="top"
    :aria-busy="registerLoading"
    @submit.prevent="submit"
  >
    <div :class="formError ? 'mb-4' : ''" role="status" aria-live="polite">
      <template v-if="formError">
        <el-alert :title="formError.message" type="error" :closable="false" show-icon />
      </template>
    </div>

    <el-form-item label="用户名" prop="username">
      <el-input
        :ref="setFieldRef('username')"
        v-model="registerForm.username"
        placeholder="3-50 个字符"
        size="large"
        prefix-icon="ep:user"
        autocomplete="username"
        :disabled="registerLoading"
      />
    </el-form-item>

    <el-form-item label="邮箱" prop="email">
      <el-input
        :ref="setFieldRef('email')"
        v-model="registerForm.email"
        placeholder="用于找回账号"
        size="large"
        prefix-icon="ep:message"
        autocomplete="email"
        :disabled="registerLoading"
      />
    </el-form-item>

    <el-form-item label="显示名称(可选)">
      <el-input
        v-model="registerForm.displayName"
        placeholder="留空则使用用户名"
        size="large"
        prefix-icon="ep:avatar"
        autocomplete="nickname"
        :disabled="registerLoading"
      />
    </el-form-item>

    <el-form-item label="密码" prop="password">
      <el-input
        :ref="setFieldRef('password')"
        v-model="registerForm.password"
        type="password"
        placeholder="至少 6 位"
        size="large"
        prefix-icon="ep:lock"
        show-password
        autocomplete="new-password"
        :disabled="registerLoading"
      />
    </el-form-item>

    <el-form-item label="确认密码" prop="confirmPassword">
      <el-input
        :ref="setFieldRef('confirmPassword')"
        v-model="registerForm.confirmPassword"
        type="password"
        placeholder="再次输入密码"
        size="large"
        prefix-icon="ep:lock"
        show-password
        autocomplete="new-password"
        :disabled="registerLoading"
      />
    </el-form-item>

    <el-form-item>
      <el-button
        type="primary"
        size="large"
        native-type="submit"
        :loading="registerLoading"
        class="w-full"
      >
        注册
      </el-button>
    </el-form-item>
  </el-form>
</template>
