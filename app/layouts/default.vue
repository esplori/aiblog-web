<script setup lang="ts">
const authStore = useAuthStore()
const { name, brandColor, logoUrl, copyright, footerText, icp } = useSiteConfig()

// SSR 阶段将品牌色写入 html style，避免客户端注入导致首屏闪烁
useBrandTheme(brandColor)

const year = new Date().getFullYear()

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
          <span v-else class="text-xl font-bold text-gray-800">
            {{ name }}
          </span>
        </NuxtLink>

        <!-- 导航菜单 -->
        <nav class="flex items-center gap-6">
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
      </div>
    </header>

    <!-- 主内容 -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- 底部 -->
    <footer class="bg-gray-800 text-gray-400 py-8">
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
