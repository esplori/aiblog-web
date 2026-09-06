<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

const authStore = useAuthStore()
const { get, put } = useApi()
const { brandColor: envBrandColor } = useSiteConfig()

interface ThemePreset {
  key: string
  name: string
  brandColor: string
}
interface SiteData {
  siteName: string
  siteTagline: string
  siteDescription: string
  theme: string
  brandColor: string
}

// 仅管理员可管理站点外观
if (authStore.user?.role !== 'admin') {
  navigateTo('/403')
}

const loading = ref(true)
const saving = ref(false)
const themes = ref<ThemePreset[]>([])
const form = reactive<SiteData>({
  siteName: '',
  siteTagline: '',
  siteDescription: '',
  theme: 'blue',
  brandColor: envBrandColor,
})

const formRef = ref()
const rules = {
  siteName: [{ required: true, message: '请输入站点名称', trigger: 'blur' }],
}

const themeOf = (key: string) => themes.value.find((t) => t.key === key)

// 选择主题时联动主色为该主题预设默认色（仍可手动改）
const onThemeChange = (key: string) => {
  const t = themeOf(key)
  if (t) form.brandColor = t.brandColor
}

const load = async () => {
  loading.value = true
  try {
    const [settingsRes, themesRes] = await Promise.all([
      get<any>('/api/site-settings'),
      get<any>('/api/site-settings/themes'),
    ])
    const data = settingsRes.data
    form.siteName = data.siteName || ''
    form.siteTagline = data.siteTagline || ''
    form.siteDescription = data.siteDescription || ''
    form.theme = data.theme || 'blue'
    form.brandColor = data.brandColor || envBrandColor
    themes.value = (themesRes.data || []).filter(
      (t: ThemePreset) => t && t.key,
    )
  } catch (e: any) {
    ElMessage.error(e?.data?.message || '加载站点设置失败')
  } finally {
    loading.value = false
  }
}

const save = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    await put('/api/admin/site-settings', {
      siteName: form.siteName,
      siteTagline: form.siteTagline,
      siteDescription: form.siteDescription,
      theme: form.theme,
      brandColor: form.brandColor,
    })
    // 刷新全局配置覆盖层，让前台/后台即时生效
    await refreshSiteSettings()
    ElMessage.success('站点设置已保存')
    // 品牌色/站名已在全局覆盖层更新，整页刷新让布局与前台一致呈现
    window.location.reload()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 mb-6">站点设置</h1>

    <el-skeleton v-if="loading" :rows="8" animated />

    <el-form
      v-else
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="110px"
      class="card max-w-2xl p-6"
    >
      <!-- 主题切换 -->
      <el-form-item label="主题风格">
        <div class="flex flex-wrap gap-3">
          <div
            v-for="t in themes"
            :key="t.key"
            class="cursor-pointer rounded-lg border-2 p-3 w-40 transition-colors"
            :class="form.theme === t.key ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'"
            @click="form.theme = t.key; onThemeChange(t.key)"
          >
            <div class="flex items-center justify-between">
              <span class="font-medium text-gray-800">{{ t.name }}</span>
              <span
                class="inline-block w-4 h-4 rounded-full"
                :style="{ backgroundColor: t.brandColor }"
              />
            </div>
            <div class="text-xs text-gray-400 mt-1">{{ t.key }}</div>
          </div>
        </div>
        <div class="text-xs text-gray-400 mt-2">选择主题会应用对应的品牌主色，可继续在下方微调。</div>
      </el-form-item>

      <!-- 品牌主色 -->
      <el-form-item label="品牌主色">
        <div class="flex items-center gap-3">
          <el-color-picker
            v-model="form.brandColor"
            :predefine="themes.map((t) => t.brandColor)"
          />
          <el-input
            v-model="form.brandColor"
            class="w-40"
            placeholder="#2563eb"
          />
          <span class="text-xs text-gray-400">作用于导航、按钮、链接等品牌元素</span>
        </div>
      </el-form-item>

      <!-- 站点名称 -->
      <el-form-item label="站点名称" prop="siteName">
        <el-input
          v-model="form.siteName"
          placeholder="站点名称"
          maxlength="50"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="站点标语">
        <el-input
          v-model="form.siteTagline"
          placeholder="一句话介绍站点（如：记录技术、生活与思考）"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="站点描述">
        <el-input
          v-model="form.siteDescription"
          type="textarea"
          :rows="3"
          placeholder="用于 SEO 与页面描述"
          maxlength="300"
          show-word-limit
        />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" :loading="saving" @click="save">
          保存设置
        </el-button>
        <el-button @click="navigateTo('/admin')">取消</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>
