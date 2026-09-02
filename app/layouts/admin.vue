<script setup lang="ts">
interface MenuItem {
  id: number
  name: string
  path: string
  icon: string
  sortOrder: number
  enabled: boolean
  roles?: string[]
}

const authStore = useAuthStore()
const route = useRoute()
const { get } = useApi()
const isCollapse = ref(false)
const isMobile = ref(false)

// 检测移动端屏幕宽度
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
  if (isMobile.value) {
    isCollapse.value = true
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

const menuItems = ref<MenuItem[]>([])
const menuLoaded = ref(false)

// 当前路由是否在当前用户可见范围内
const isAllowed = computed(() => {
  if (authStore.user?.role === 'admin') return true
  if (route.path === '/admin/settings') return true // 个人设置所有登录用户可用
  const path = route.path
  return menuItems.value.some(m => {
    if (path === m.path) return true
    // 仪表盘 /admin 只匹配自身，不匹配其下所有子路径
    if (m.path === '/admin') return false
    return path.startsWith(m.path + '/')
  })
})

onMounted(async () => {
  if (!authStore.isLoggedIn) {
    navigateTo('/login')
    return
  }
  // 页面刷新后 token 恢复了但 user 数据为 null，需要重新加载
  if (!authStore.user) {
    await authStore.fetchUser()
  }
  // 按当前用户角色加载可见菜单（后端 role_menus 配置）
  try {
    const res = await get<MenuItem[]>('/api/menus')
    menuItems.value = res.data || []
  } catch (e) {
    console.error('加载菜单失败', e)
    menuItems.value = []
  }
  menuLoaded.value = true
})

// 菜单加载完成后校验页面权限，无权限跳转 403
watch(menuLoaded, (v) => {
  if (v && !isAllowed.value) {
    ElMessage.error('无权限访问该页面')
    navigateTo('/403')
  }
})
</script>

<template>
  <div class="min-h-screen flex">
    <!-- 移动端遮罩层 -->
    <div
      v-if="isMobile && !isCollapse"
      class="fixed inset-0 bg-black/50 z-40"
      @click="isCollapse = true"
    />

    <!-- 侧边栏（移动端抽屉式 / 桌面端固定） -->
    <aside
      class="admin-sidebar bg-white border-r border-gray-100 fixed md:relative z-50 h-screen transition-all duration-300"
      :class="[
        isCollapse ? '-translate-x-full md:w-16 md:translate-x-0' : 'translate-x-0 w-60',
        isMobile ? 'shadow-xl' : ''
      ]"
    >
      <!-- Logo -->
      <div class="h-16 flex items-center justify-center border-b border-gray-100">
        <span v-if="!isCollapse" class="text-lg font-bold text-gray-900">Pylox 管理</span>
        <span v-else class="text-lg font-bold text-gray-900">PX</span>
      </div>

      <!-- 菜单（按角色动态加载） -->
      <el-menu
        :default-active="route.path"
        :collapse="isCollapse"
        router
        class="border-none"
      >
        <el-menu-item
          v-for="item in menuItems"
          :key="item.id"
          :index="item.path"
          class="!h-12 !my-1 !mx-2 !rounded-lg hover:!bg-blue-50"
        >
          <el-icon><Icon :name="item.icon" /></el-icon>
          <template #title>{{ item.name }}</template>
        </el-menu-item>
        <div v-if="menuItems.length === 0" class="text-center text-gray-400 text-sm py-8">
          暂无可用菜单
        </div>
      </el-menu>
    </aside>

    <!-- 右侧内容区 -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- 顶部栏 -->
      <header class="bg-white h-16 flex items-center justify-between px-4 border-b border-gray-100">
        <el-button text @click="isCollapse = !isCollapse">
          <el-icon :size="20">
            <Icon :name="isCollapse ? 'ep:expand' : 'ep:fold'" />
          </el-icon>
        </el-button>

        <div class="flex items-center gap-4">
          <NuxtLink to="/" class="hidden sm:inline-block text-sm text-gray-500 hover:text-blue-600 transition-colors">
            访问前台
          </NuxtLink>
          <el-dropdown>
            <span class="flex items-center gap-2 cursor-pointer">
              <el-avatar :size="28">{{ authStore.user?.displayName?.charAt(0) }}</el-avatar>
              <span class="text-sm hidden sm:inline">{{ authStore.user?.displayName }}</span>
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
      <main class="flex-1 p-4 md:p-6 bg-gray-50 min-w-0 overflow-x-auto">
        <div v-if="!menuLoaded" class="h-full flex items-center justify-center text-gray-400 text-sm py-20">
          加载中...
        </div>
        <slot v-else-if="isAllowed" />
      </main>
    </div>
  </div>
</template>
