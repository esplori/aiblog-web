<script setup lang="ts">
/**
 * 登录表单(自包含:校验 → 提交 → 错误分类 → 跳转)。
 *
 * 改造要点(对应 notes/login-page-audit.md 的编号):
 *   F1/F4  校验走 `rules` 对象(与 admin/settings.vue 同写法),字段级错误就地渲染
 *   A1     autocomplete="username" / "current-password" ⇒ 密码管理器可识别
 *   A3     可见 label(不再只靠 placeholder)
 *   A2     表单级错误落在**常驻**的 aria-live 容器里
 *   I1     提交期间输入框一并 disabled(原先只禁用按钮)
 *   I2     Enter 由原生 submit 承担(原先只绑在密码框)
 *   S2     错误四分类:网络不通不再显示「登录失败」
 *   I5     登录后回跳到 ?redirect(?白名单校验)
 */
import type { LoginData } from '~/types'
import { useAuthError, type AuthErrorInfo } from '~/composables/useAuthError'
import { useAuthRedirect } from '~/composables/useAuthRedirect'

const props = withDefaults(defineProps<{ initialUsername?: string }>(), { initialUsername: '' })

const authStore = useAuthStore()
const { post } = useApi()
const { targetAfterLogin } = useAuthRedirect()
const { classify } = useAuthError()

const config = useRuntimeConfig()
/** 后端无「忘记密码」端点 ⇒ 默认空、不渲染入口(方案 §10:不发死链接) */
const forgotPasswordUrl = computed(
  () => ((config.public.auth as any)?.forgotPasswordUrl ?? '') as string,
)

const form = reactive({ username: props.initialUsername, password: '' })
const loading = ref(false)
const formError = ref<AuthErrorInfo | null>(null)
const formRef = ref()
const usernameRef = ref()
const passwordRef = ref()

// ⚠ 登录**只校验必填**:旧账号未必满足新规则,加长度/格式校验会把合法用户挡在门外。
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

const submit = async () => {
  formError.value = null
  const valid = await formRef.value?.validate().catch((invalid: any) => {
    const first = Object.keys(invalid ?? {})[0]
    nextTick(() => {
      if (first === 'username') usernameRef.value?.focus?.()
      else passwordRef.value?.focus?.()
    })
    return false
  })
  if (!valid) return

  loading.value = true
  try {
    const res = await post<LoginData>('/api/auth/login', form)
    authStore.setAuth(res.data)
    ElMessage.success('登录成功')
    navigateTo(targetAfterLogin(res.data.userInfo?.role === 'admin'))
  } catch (e) {
    const info = classify(e)
    formError.value = info
    ElMessage.error(info.message)
    // 凭据错误 ⇒ 焦点回密码框(高频场景,减少一次鼠标移动)
    if (info.action === 'focus-password') nextTick(() => passwordRef.value?.focus?.())
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <el-form
    ref="formRef"
    :model="form"
    :rules="rules"
    label-position="top"
    :aria-busy="loading"
    @submit.prevent="submit"
  >
    <!-- 表单级错误。⚠ 容器**常驻 DOM**:aria-live 区若与内容同时插入,部分读屏(尤其 NVDA)不播报 -->
    <div :class="formError ? 'mb-4' : ''" role="status" aria-live="polite">
      <template v-if="formError">
        <el-alert :title="formError.message" type="error" :closable="false" show-icon />
        <div v-if="formError.action === 'retry'" class="mt-2 text-right">
          <el-button link type="primary" @click="submit()">重试</el-button>
        </div>
      </template>
    </div>

    <el-form-item label="用户名" prop="username">
      <el-input
        ref="usernameRef"
        v-model="form.username"
        placeholder="请输入用户名"
        size="large"
        prefix-icon="ep:user"
        autocomplete="username"
        :disabled="loading"
      />
    </el-form-item>

    <el-form-item label="密码" prop="password">
      <el-input
        ref="passwordRef"
        v-model="form.password"
        type="password"
        placeholder="请输入密码"
        size="large"
        prefix-icon="ep:lock"
        show-password
        autocomplete="current-password"
        :disabled="loading"
      />
    </el-form-item>

    <el-form-item>
      <el-button
        type="primary"
        size="large"
        native-type="submit"
        :loading="loading"
        class="w-full"
      >
        登录
      </el-button>
    </el-form-item>

    <!-- 后端无「忘记密码」端点 ⇒ 未配置 URL 时**不渲染**(方案 §10:不发死链接) -->
    <p v-if="forgotPasswordUrl" class="text-center text-sm">
      <a :href="forgotPasswordUrl">忘记密码?</a>
    </p>
  </el-form>
</template>

<script lang="ts">
// 忘记密码入口:URL 由 runtimeConfig 注入,默认空 ⇒ 不渲染
export default {
  computed: {
    forgotPasswordUrl(): string {
      const config = useRuntimeConfig()
      return ((config.public.auth as any)?.forgotPasswordUrl ?? '') as string
    },
  },
}
</script>
