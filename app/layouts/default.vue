<script setup lang="ts">
const authStore = useAuthStore()
const site = useSiteConfig()
const { name, brandColor, logoUrl, copyright, footerText, icp } = site
const { template, contactPhone, contactEmail, contactAddress } = site

// SSR 阶段将品牌色写入 html style，避免客户端注入导致首屏闪烁
useBrandTheme(brandColor)

const isCorporate = computed(() => template === 'corporate')
const year = new Date().getFullYear()

// 企业官网导航（单页锚点）
const corpNav = [
  { label: '解决方案', to: '/#solutions' },
  { label: '客户案例', to: '/#cases' },
  { label: '新闻资讯', to: '/#news' },
  { label: '关于我们', to: '/#about' },
]

onMounted(() => {
  if (authStore.token) {
    authStore.fetchUser()
  }
})
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- 顶部导航 -->
    <header class="bg-white shadow-sm sticky top-0 z-50">
      <div class="container flex items-center justify-between h-16">
        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center shrink-0">
          <img
            v-if="logoUrl"
            :src="logoUrl"
            :alt="name"
            class="h-8 max-w-[160px] object-contain"
          />
          <span v-else class="text-xl font-bold text-gray-900">
            {{ name }}
          </span>
        </NuxtLink>

        <!-- 企业官网导航 -->
        <nav v-if="isCorporate" class="hidden lg:flex items-center gap-7">
          <NuxtLink
            v-for="n in corpNav"
            :key="n.label"
            :to="n.to"
            class="text-sm font-medium text-gray-700 hover:text-brand-600 transition-colors"
          >{{ n.label }}</NuxtLink>
          <a v-if="contactPhone" :href="`tel:${contactPhone}`" class="text-sm font-semibold text-brand-600">
            {{ contactPhone }}
          </a>
          <NuxtLink
            to="/#contact"
            class="ml-2 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            :style="{ backgroundColor: brandColor }"
          >联系我们</NuxtLink>
        </nav>

        <!-- 博客导航 -->
        <nav v-else class="flex items-center gap-6">
          <NuxtLink to="/" class="text-gray-600 hover:text-brand-600">
            首页
          </NuxtLink>
          <NuxtLink to="/articles" class="text-gray-600 hover:text-brand-600">
            文章
          </NuxtLink>

          <template v-if="authStore.isLoggedIn">
            <NuxtLink to="/admin" class="text-gray-600 hover:text-brand-600">
              管理
            </NuxtLink>
            <el-dropdown>
              <span class="flex items-center gap-2 cursor-pointer">
                <el-avatar :size="32" :src="authStore.user?.avatar">
                  {{ authStore.user?.displayName?.charAt(0) }}
                </el-avatar>
                <span class="text-sm">{{ authStore.user?.displayName }}</span>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="navigateTo('/admin')">
                    后台管理
                  </el-dropdown-item>
                  <el-dropdown-item @click="navigateTo('/admin/settings')">
                    个人设置
                  </el-dropdown-item>
                  <el-dropdown-item divided @click="authStore.logout()">
                    退出登录
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>

          <template v-else>
            <NuxtLink to="/login">
              <el-button type="primary" size="small">登录</el-button>
            </NuxtLink>
          </template>
        </nav>

        <!-- 移动端：企业模式下放一个联系 CTA -->
        <div v-if="isCorporate" class="lg:hidden flex items-center">
          <NuxtLink
            to="/#contact"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
            :style="{ backgroundColor: brandColor }"
          >联系我们</NuxtLink>
        </div>
      </div>
    </header>

    <!-- 主内容 -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- 底部：企业官网多栏 -->
    <footer v-if="isCorporate" class="bg-gray-900 text-gray-400">
      <div class="container py-12">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div class="md:col-span-2">
            <div class="flex items-center gap-2 mb-3">
              <img v-if="logoUrl" :src="logoUrl" :alt="name" class="h-8 object-contain" />
              <span v-else class="text-lg font-bold text-white">{{ name }}</span>
            </div>
            <p class="text-sm leading-relaxed max-w-md">{{ site.tagline || site.description }}</p>
          </div>
          <div>
            <h4 class="text-white font-semibold mb-3">快速链接</h4>
            <ul class="space-y-2 text-sm">
              <li><NuxtLink to="/#solutions" class="hover:text-white">解决方案</NuxtLink></li>
              <li><NuxtLink to="/#cases" class="hover:text-white">客户案例</NuxtLink></li>
              <li><NuxtLink to="/#news" class="hover:text-white">新闻资讯</NuxtLink></li>
              <li><NuxtLink to="/#about" class="hover:text-white">关于我们</NuxtLink></li>
            </ul>
          </div>
          <div>
            <h4 class="text-white font-semibold mb-3">联系我们</h4>
            <ul class="space-y-2 text-sm">
              <li v-if="contactPhone">电话：{{ contactPhone }}</li>
              <li v-if="contactEmail">邮箱：{{ contactEmail }}</li>
              <li v-if="contactAddress">地址：{{ contactAddress }}</li>
            </ul>
          </div>
        </div>
      </div>
      <div class="border-t border-gray-800">
        <div class="container py-5 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-gray-500">
          <span>{{ copyright || `© ${year} ${name}` }}</span>
          <div class="flex items-center gap-4">
            <span v-if="footerText">{{ footerText }}</span>
            <a v-if="icp" href="https://beian.miit.gov.cn/" target="_blank" rel="noopener" class="hover:text-white">
              {{ icp }}
            </a>
            <NuxtLink to="/admin" class="hover:text-white opacity-60">管理登录</NuxtLink>
          </div>
        </div>
      </div>
    </footer>

    <!-- 底部：博客版 -->
    <footer v-else class="bg-gray-800 text-gray-400 py-8">
      <div class="container text-center text-sm space-y-2">
        <p>{{ copyright || `© ${year} ${name}` }}</p>
        <p v-if="footerText">{{ footerText }}</p>
        <a
          v-if="icp"
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noopener"
          class="hover:text-white transition-colors"
        >{{ icp }}</a>
      </div>
    </footer>
  </div>
</template>
