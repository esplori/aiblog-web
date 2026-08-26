<script setup lang="ts">
const authStore = useAuthStore()

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
        <NuxtLink to="/" class="text-xl font-bold text-gray-800">
          AI Blog
        </NuxtLink>

        <!-- 导航菜单 -->
        <nav class="flex items-center gap-6">
          <NuxtLink to="/" class="text-gray-600 hover:text-blue-500">
            首页
          </NuxtLink>
          <NuxtLink to="/articles" class="text-gray-600 hover:text-blue-500">
            文章
          </NuxtLink>

          <template v-if="authStore.isLoggedIn">
            <NuxtLink to="/admin" class="text-gray-600 hover:text-blue-500">
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
      <div class="container text-center text-sm">
        <p>© {{ new Date().getFullYear() }} AI Blog. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>
