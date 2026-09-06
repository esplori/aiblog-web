<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

const authStore = useAuthStore()
const { get, put, post } = useApi()

// 仅管理员可执行初始化向导
if (authStore.user?.role !== 'admin') {
  navigateTo('/403')
}

interface ThemePreset { key: string; name: string; brandColor: string }
interface SetupForm {
  siteName: string
  siteTagline: string
  siteDescription: string
  theme: string
  brandColor: string
  logoUrl: string
  faviconUrl: string
  footerText: string
  copyright: string
  icp: string
}

const stepTitles = ['站点信息', '主题外观', '品牌与页脚', '栏目', '完成']
const active = ref(0)

const loading = ref(true)
const saving = ref(false)
const themes = ref<ThemePreset[]>([])
const categoryInput = ref('')

const form = reactive<SetupForm>({
  siteName: '',
  siteTagline: '',
  siteDescription: '',
  theme: 'blue',
  brandColor: '#2563eb',
  logoUrl: '',
  faviconUrl: '',
  footerText: '',
  copyright: '',
  icp: '',
})

const nameInput = ref()
const nameRules = { siteName: [{ required: true, message: '请输入站点名称', trigger: 'blur' }] }

const onThemeChange = (key: string) => {
  const t = themes.value.find((x) => x.key === key)
  if (t) form.brandColor = t.brandColor
}

const load = async () => {
  loading.value = true
  try {
    const [s, t] = await Promise.all([
      get<any>('/api/site-settings'),
      get<any>('/api/site-settings/themes'),
    ])
    const d = s.data
    form.siteName = d.siteName || ''
    form.siteTagline = d.siteTagline || ''
    form.siteDescription = d.siteDescription || ''
    form.theme = d.theme || 'blue'
    form.brandColor = d.brandColor || '#2563eb'
    form.logoUrl = d.logoUrl || ''
    form.faviconUrl = d.faviconUrl || ''
    form.footerText = d.footerText || ''
    form.copyright = d.copyright || ''
    form.icp = d.icp || ''
    themes.value = (t.data || []).filter((x: ThemePreset) => x && x.key)
  } catch (e: any) {
    ElMessage.error(e?.data?.message || '加载站点信息失败')
  } finally {
    loading.value = false
  }
}

const prev = () => {
  if (active.value > 0) active.value--
}

const next = async () => {
  // 第一步站点名必填
  if (active.value === 0) {
    const valid = await nameInput.value.validate().catch(() => false)
    if (!valid) return
  }
  // 栏目解析：仅第4步校验至少一个
  if (active.value === 3 && !categoryInput.value.trim()) {
    ElMessage.warning('请至少输入一个栏目名称（也可以直接跳过）')
    return
  }
  if (active.value < stepTitles.length - 1) active.value++
}

const categoryNames = computed(() =>
  categoryInput.value
    .split('\n')
    .map((n) => n.trim())
    .filter((n) => n.length > 0),
)

const finish = async () => {
  if (active.value !== stepTitles.length - 1) return
  saving.value = true
  try {
    // 1) 保存站点设置
    await put('/api/admin/site-settings', { ...form })
    // 2) 逐个创建栏目
    for (const name of categoryNames.value) {
      try {
        await post('/api/categories', { name })
      } catch (e: any) {
        // 同名/重复创建失败不阻断
        console.warn('创建分类失败', name, e?.data?.message)
      }
    }
    ElMessage.success('站点初始化完成！现在可以开始发布内容了')
    await refreshSiteSettings()
    navigateTo('/admin')
  } catch (e: any) {
    ElMessage.error(e?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const skip = () => navigateTo('/admin')

onMounted(load)
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">站点初始化向导</h1>
      <el-button text @click="skip">稍后配置</el-button>
    </div>

    <!-- 步骤条 -->
    <div class="card mb-6 p-6">
      <el-steps :active="active" align-center finish-status="success">
        <el-step v-for="t in stepTitles" :key="t" :title="t" />
      </el-steps>
    </div>

    <el-skeleton v-if="loading" :rows="8" animated />

    <div v-else class="card p-6">
      <!-- 顶部实时预览 -->
      <div class="flex items-center justify-between mb-6 p-3 rounded-lg border border-gray-100 bg-gray-50">
        <span class="font-semibold text-gray-800">
          <img v-if="form.logoUrl" :src="form.logoUrl" :alt="form.siteName" class="inline h-6 mr-2 align-middle" />
          {{ form.siteName || '站点预览' }}
        </span>
        <span class="inline-block w-5 h-5 rounded-full" :style="{ backgroundColor: form.brandColor }" />
        <span class="text-sm text-gray-400">{{ form.theme }}</span>
      </div>

      <!-- 步骤1：站点信息 -->
      <div v-if="active === 0">
        <el-form ref="nameInput" :model="form" :rules="nameRules" label-width="110px">
          <el-form-item label="站点名称" prop="siteName">
            <el-input v-model="form.siteName" placeholder="客户站点名称" maxlength="50" show-word-limit />
          </el-form-item>
          <el-form-item label="站点标语">
            <el-input v-model="form.siteTagline" placeholder="一句话介绍站点" maxlength="100" show-word-limit />
          </el-form-item>
          <el-form-item label="站点描述">
            <el-input v-model="form.siteDescription" type="textarea" :rows="3" placeholder="用于 SEO" maxlength="300" show-word-limit />
          </el-form-item>
        </el-form>
      </div>

      <!-- 步骤2：主题外观 -->
      <div v-else-if="active === 1">
        <h3 class="text-lg font-semibold mb-4 text-gray-800">选择主题风格</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div
            v-for="t in themes" :key="t.key"
            class="cursor-pointer rounded-lg border-2 p-4 transition-colors"
            :class="form.theme === t.key ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'"
            @click="form.theme = t.key; onThemeChange(t.key)"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="font-medium text-gray-800">{{ t.name }}</span>
              <span class="inline-block w-5 h-5 rounded-full" :style="{ backgroundColor: t.brandColor }" />
            </div>
            <div class="text-xs text-gray-400">{{ t.key }}</div>
            <div class="mt-3 h-2 rounded bg-gradient-to-r" :style="{ background: `linear-gradient(90deg, ${t.brandColor}, #fff)` }" />
          </div>
        </div>
        <h3 class="text-lg font-semibold mb-2 text-gray-800">品牌主色</h3>
        <div class="flex items-center gap-3">
          <el-color-picker v-model="form.brandColor" :predefine="themes.map((t) => t.brandColor)" />
          <el-input v-model="form.brandColor" class="w-40" />
        </div>
      </div>

      <!-- 步骤3：品牌与页脚 -->
      <div v-else-if="active === 2">
        <el-form label-width="110px">
          <el-form-item label="站点 Logo">
            <div class="flex items-center gap-3 w-full">
              <img v-if="form.logoUrl" :src="form.logoUrl" class="h-8 max-w-[120px] object-contain" />
              <el-input v-model="form.logoUrl" class="flex-1" placeholder="Logo 图片 URL" />
            </div>
          </el-form-item>
          <el-form-item label="站点图标">
            <div class="flex items-center gap-3 w-full">
              <img v-if="form.faviconUrl" :src="form.faviconUrl" class="w-4 h-4" />
              <el-input v-model="form.faviconUrl" class="flex-1" placeholder="favicon URL" />
            </div>
          </el-form-item>
          <el-form-item label="页脚文案">
            <el-input v-model="form.footerText" placeholder="如：由 xxx 建站" maxlength="300" show-word-limit />
          </el-form-item>
          <el-form-item label="版权声明">
            <el-input v-model="form.copyright" placeholder="如：© 2026 xxx 版权所有" maxlength="300" show-word-limit />
          </el-form-item>
          <el-form-item label="ICP 备案号">
            <el-input v-model="form.icp" placeholder="如：粤ICP备xxxxxxxx号" maxlength="100" show-word-limit />
          </el-form-item>
        </el-form>
      </div>

      <!-- 步骤4：栏目 -->
      <div v-else-if="active === 3">
        <h3 class="text-lg font-semibold mb-2 text-gray-800">设置栏目（分类）</h3>
        <p class="text-sm text-gray-500 mb-4">每行一个栏目名称，例如：<br />技术 / 生活 / 随笔。可留空跳过，稍后在"分类管理"里再添加。</p>
        <el-input
          v-model="categoryInput"
          type="textarea"
          :rows="5"
          placeholder="技术&#10;产品&#10;生活随笔"
        />
        <div class="mt-2 flex flex-wrap gap-2">
          <el-tag v-for="c in categoryNames" :key="c" type="info">{{ c }}</el-tag>
        </div>
      </div>

      <!-- 步骤5：完成 -->
      <div v-else-if="active === 4">
        <div class="text-center py-6">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
            <Icon name="ep:check" class="text-3xl text-green-500" />
          </div>
          <h3 class="text-xl font-bold text-gray-900 mb-2">配置确认</h3>
          <p class="text-gray-500 mb-6">确认无误后点击完成，将保存站点设置并创建 {{ categoryNames.length }} 个栏目。</p>
          <el-button type="primary" size="large" :loading="saving" @click="finish">
            完成并保存
          </el-button>
        </div>
      </div>

      <!-- 底部导航按钮 -->
      <div v-if="active < stepTitles.length - 1" class="flex justify-between mt-6 pt-4 border-t border-gray-100">
        <el-button :disabled="active === 0" @click="prev">上一步</el-button>
        <el-button type="primary" @click="next">下一步</el-button>
      </div>
    </div>
  </div>
</template>
