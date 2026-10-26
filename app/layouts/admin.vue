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
const { name, brandColor, logoUrl } = useSiteConfig()

// 后台布局也注入品牌色（SSR 阶段写入 html style）
useBrandTheme(brandColor)

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

/**
 * 侧栏分组：后端只给平铺菜单，前端按 path 归类。
 * 顺序即展示顺序；未匹配任何组的菜单落到「其它」，避免新增菜单被藏起来。
 */
const GROUP_DEFS = [
  { key: 'overview', label: '概览', paths: ['/admin'] },
  { key: 'content', label: '内容', paths: ['/admin/articles', '/admin/categories', '/admin/tags', '/admin/comments', '/admin/files'] },
  { key: 'resource', label: '资源', paths: ['/admin/ai-items', '/admin/interview-questions'] },
  { key: 'system', label: '系统', paths: ['/admin/users', '/admin/roles', '/admin/menus', '/admin/site-settings'] },
]
const OTHER_GROUP = { key: 'other', label: '其它', paths: [] as string[] }

const menuGroups = computed(() => {
  const groups = GROUP_DEFS.map(g => ({ ...g, items: [] as MenuItem[] }))
  const other = { ...OTHER_GROUP, items: [] as MenuItem[] }
  for (const item of menuItems.value) {
    const g = groups.find(g => g.paths.includes(item.path))
    ;(g || other).items.push(item)
  }
  const out = groups.filter(g => g.items.length > 0)
  if (other.items.length) out.push(other)
  return out
})

/** 选中判定：仪表盘只认自身，其余路径匹配子路由 */
const isActive = (path: string) => {
  if (path === '/admin') return route.path === '/admin'
  return route.path === path || route.path.startsWith(path + '/')
}

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

    <!-- 侧边栏：分组导航（移动端抽屉 / 桌面端固定，可折叠为图标轨） -->
    <aside
      class="admin-sidebar bg-white border-r border-slate-200 fixed md:sticky md:top-0 z-50 h-screen flex flex-col shrink-0 transition-[width,transform] duration-200"
      :class="[
        isCollapse ? '-translate-x-full md:translate-x-0 md:w-16' : 'translate-x-0 w-60',
        isMobile ? 'shadow-xl' : ''
      ]"
    >
      <!-- 品牌区 -->
      <div class="h-[60px] shrink-0 flex items-center gap-2 px-3 border-b border-slate-100" :class="isCollapse && 'md:justify-center md:px-0'">
        <NuxtLink to="/admin" class="flex items-center gap-2 min-w-0">
          <img v-if="logoUrl" :src="logoUrl" :alt="name" class="h-7 max-w-[120px] object-contain shrink-0" />
          <template v-else>
            <span class="w-7 h-7 shrink-0 rounded-lg bg-brand-600 text-white text-[13px] font-bold flex items-center justify-center">
              {{ (name || 'A').slice(0, 1) }}
            </span>
            <span v-if="!isCollapse" class="min-w-0 flex flex-col leading-tight">
              <b class="text-[13.5px] font-semibold text-slate-900 truncate">{{ name }} 管理</b>
              <span class="text-[10.5px] text-slate-400">admin</span>
            </span>
          </template>
        </NuxtLink>
        <button
          v-if="!isCollapse"
          class="ml-auto hidden md:flex w-7 h-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-2 focus-visible:outline-brand-500"
          aria-label="折叠菜单"
          @click="isCollapse = true"
        >
          <Icon name="ep:d-arrow-left" />
        </button>
      </div>

      <!-- 菜单（按角色动态加载，前端分组） -->
      <nav class="flex-1 overflow-y-auto px-2 py-3" aria-label="后台导航">
        <div v-for="group in menuGroups" :key="group.key" class="mb-3.5">
          <p v-if="!isCollapse" class="px-2.5 pt-1.5 pb-1.5 text-[10.5px] font-semibold tracking-[0.04em] text-slate-400">
            {{ group.label }}
          </p>
          <div v-else class="mx-2 mb-1.5 border-t border-slate-100" />

          <el-tooltip
            v-for="item in group.items"
            :key="item.id"
            :content="item.name"
            placement="right"
            :show-after="200"
            :disabled="!isCollapse"
          >
            <NuxtLink
              :to="item.path"
              class="relative flex items-center gap-2.5 h-9 px-2.5 mb-0.5 rounded-[10px] text-[13.5px] transition-colors focus-visible:outline-2 focus-visible:outline-brand-500"
              :class="[
                isActive(item.path) ? 'bg-brand-50 text-brand-600 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                isCollapse && 'md:justify-center md:px-0'
              ]"
            >
              <span v-if="isActive(item.path)" class="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-brand-600" />
              <Icon
                :name="item.icon"
                class="text-base shrink-0"
                :class="isActive(item.path) ? 'text-brand-600' : 'text-slate-400'"
              />
              <span v-if="!isCollapse" class="truncate">{{ item.name }}</span>
            </NuxtLink>
          </el-tooltip>
        </div>

        <p v-if="menuLoaded && menuItems.length === 0" class="px-2.5 py-6 text-center text-sm text-slate-400">
          暂无可用菜单
        </p>
      </nav>

      <!-- 用户区 -->
      <div class="shrink-0 border-t border-slate-100 p-2.5">
        <el-dropdown trigger="click" class="w-full">
          <div
            class="flex items-center gap-2 rounded-[10px] p-1.5 cursor-pointer hover:bg-slate-50 transition-colors"
            :class="isCollapse && 'md:justify-center md:p-1'"
          >
            <span class="w-7 h-7 shrink-0 rounded-full bg-brand-100 text-brand-700 text-[11.5px] font-semibold flex items-center justify-center">
              {{ authStore.user?.displayName?.charAt(0) || 'U' }}
            </span>
            <span v-if="!isCollapse" class="min-w-0 leading-tight">
              <b class="block text-[12.5px] font-semibold text-slate-800 truncate">{{ authStore.user?.displayName }}</b>
              <span class="text-[10.5px] text-slate-400">{{ authStore.user?.role }}</span>
            </span>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="navigateTo('/admin/settings')">个人设置</el-dropdown-item>
              <el-dropdown-item divided @click="authStore.logout()">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </aside>

    <!-- 右侧内容区 -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- 顶部栏 -->
      <header class="admin-topbar bg-white h-16 flex items-center justify-between gap-3 px-4 border-b border-slate-200">
        <div class="flex items-center gap-2">
          <button
            class="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="展开菜单"
            @click="isCollapse = !isCollapse"
          >
            <Icon :name="isCollapse ? 'ep:expand' : 'ep:fold'" :size="20" />
          </button>
          <button
            v-if="isCollapse"
            class="hidden md:flex w-8 h-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="展开菜单"
            @click="isCollapse = false"
          >
            <Icon name="ep:expand" :size="18" />
          </button>
        </div>

        <div class="flex items-center gap-4">
          <NuxtLink to="/" class="hidden sm:inline-block text-sm text-slate-500 hover:text-brand-600 transition-colors">
            访问前台
          </NuxtLink>
        </div>
      </header>

      <!-- 内容 -->
      <main class="admin-main flex-1 p-4 md:p-6 bg-slate-50 min-w-0 overflow-x-auto">
        <div v-if="!menuLoaded" class="h-full flex items-center justify-center text-slate-400 text-sm py-20">
          加载中...
        </div>
        <slot v-else-if="isAllowed" />
      </main>
    </div>
  </div>
</template>
