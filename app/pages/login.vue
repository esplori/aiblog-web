<script setup lang="ts">
/**
 * 登录页容器(阶段二后已瘦身:表单逻辑下沉到 app/components/auth/* )。
 *
 * 本文件只负责三件事:
 *   1. 注入品牌变量 —— 登录页是 `layout: false`,没有布局代劳,且**必须在 <script setup> 顶层**
 *      (放 onMounted 会丢 SSR 时机、造成首屏闪烁);
 *   2. 模式状态(登录 / 注册)与组件装配;
 *   3. 按 runtimeConfig 决定是否展示品牌侧(方案 §7.6 的回滚开关)。
 *
 * 审计编号对照:V1/V2/V4(品牌侧)、V3(信息量)、V5(圆角对齐 .card)、R1/R2(100dvh + 溢出滚动)
 */
definePageMeta({
  layout: false,
})

const { brandColor } = useSiteConfig()
const config = useRuntimeConfig()

// SSR 阶段将品牌色写入 html style(避免客户端注入导致首屏闪烁)
useBrandTheme(brandColor)

// 登录页无收录价值(审计 A6)
useHead({ meta: [{ name: 'robots', content: 'noindex' }] })

const activeTab = ref<'login' | 'register'>('login')
/** 注册后自动登录失败时,把用户名带回登录表单,省一次输入 */
const loginPrefill = ref('')

/** 品牌侧开关:false ⇒ 退化为单卡片居中(部署级回滚手段) */
const showBrandPanel = computed(() => (config.public.auth as any)?.brandPanel !== false)

const onSwitchToLogin = (username: string) => {
  loginPrefill.value = username
  activeTab.value = 'login'
}
</script>

<template>
  <AuthShell :show-brand-panel="showBrandPanel">
    <template #brand>
      <AuthBrandPanel />
    </template>

    <AuthFormCard
      :title="activeTab === 'login' ? '登录' : '注册'"
      :subtitle="activeTab === 'login' ? '登录到你的账户' : '创建你的账户'"
    >
      <AuthModeSwitch v-model="activeTab" />

      <!-- 未激活的面板不挂载:首屏只渲染登录表单的 2 个输入框(注册表单 5 个字段惰性渲染) -->
      <AuthLoginForm v-if="activeTab === 'login'" :initial-username="loginPrefill" />
      <AuthRegisterForm v-else @switch-to-login="onSwitchToLogin" />
    </AuthFormCard>

    <template #footer>
      <AuthFooter />
    </template>
  </AuthShell>
</template>
