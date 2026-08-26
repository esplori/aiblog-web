<script setup lang="ts">
const authStore = useAuthStore()
const route = useRoute()
const isCollapse = ref(false)

const menuItems = [
  { path: '/admin', icon: 'ep:odometer', title: '仪表盘' },
  { path: '/admin/articles', icon: 'ep:document', title: '文章管理' },
  { path: '/admin/categories', icon: 'ep:folder', title: '分类管理' },
  { path: '/admin/tags', icon: 'ep:price-tag', title: '标签管理' },
  { path: '/admin/comments', icon: 'ep:chat-dot-round', title: '评论管理' },
  { path: '/admin/files', icon: 'ep:files', title: '文件管理' },
  { path: '/admin/users', icon: 'ep:user', title: '用户管理' },
]

onMounted(async () => {
  if (!authStore.isLoggedIn) {
    navigateTo('/login')
    return
  }
  // 页面刷新后 token 恢复了但 user 数据为 null，需要重新加载
  if (!authStore.user) {
    await authStore.fetchUser()
  }
})
</script>

<template>
  <div class="min-h-screen flex">
    <!-- 侧边栏（浅色风格，与前管一致） -->
    <aside class="admin-sidebar bg-white border-r border-gray-100" :class="isCollapse ? 'w-16' : 'w-60'">
      <!-- Logo -->
      <div class="h-16 flex items-center justify-center border-b border-gray-100">
        <span v-if="!isCollapse" class="text-lg font-bold text-gray-900">AI Blog 管理</span>
        <span v-else class="text-lg font-bold text-gray-900">AB</span>
      </div>

      <!-- 菜单 -->
      <el-menu
        :default-active="route.path"
        :collapse="isCollapse"
        router
        class="border-none"
      >
        <el-menu-item
          v-for="item in menuItems"
          :key="item.path"
          :index="item.path"
          class="!h-12 !my-1 !mx-2 !rounded-lg hover:!bg-blue-50"
        >
          <el-icon><Icon :name="item.icon" /></el-icon>
          <template #title>{{ item.title }}</template>
        </el-menu-item>
      </el-menu>
    </aside>

    <!-- 右侧内容区 -->
    <div class="flex-1 flex flex-col">
      <!-- 顶部栏 -->
      <header class="bg-white h-16 flex items-center justify-between px-4 border-b border-gray-100">
        <el-button text @click="isCollapse = !isCollapse">
          <el-icon :size="20">
            <Icon :name="isCollapse ? 'ep:expand' : 'ep:fold'" />
          </el-icon>
        </el-button>

        <div class="flex items-center gap-4">
          <NuxtLink to="/" class="text-sm text-gray-500 hover:text-blue-600 transition-colors">
            访问前台
          </NuxtLink>
          <el-dropdown>
            <span class="flex items-center gap-2 cursor-pointer">
              <el-avatar :size="28">{{ authStore.user?.displayName?.charAt(0) }}</el-avatar>
              <span class="text-sm">{{ authStore.user?.displayName }}</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="navigateTo('/admin/settings')">
                  个人设置
                </el-dropdown-item>
                <el-dropdown-item divided @click="authStore.logout()">
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <!-- 内容 -->
      <main class="flex-1 p-6 bg-gray-50">
        <slot />
      </main>
    </div>
  </div>
</template>
