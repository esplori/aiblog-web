<script setup lang="ts">
import type { User } from '~/types'
import type { AiStats } from '~/types/ai'
import { MODULES, canSeeModule, resolveActive, resolveModule } from '~/utils/navModules'
import type { NavItem, NavModule } from '~/utils/navModules'

// 工作台外壳：左侧模块栏 + 顶栏 + 功能区。
// 博客与 AI 广场是同级模块，切模块时只有功能区内容变化。
const site = useSiteConfig()
const authStore = useAuthStore()
const route = useRoute()
const { get } = useApi()

useBrandTheme(site.brandColor)

const collapsed = ref(false)
onMounted(() => {
  try {
    collapsed.value = localStorage.getItem('wb:side') === 'rail'
  } catch {
    collapsed.value = false
  }
})
const toggleSide = () => {
  collapsed.value = !collapsed.value
  if (import.meta.client) {
    try {
      localStorage.setItem('wb:side', collapsed.value ? 'rail' : 'wide')
    } catch {
      /* 忽略隐私模式下的写入失败 */
    }
  }
}

const drawerOpen = ref(false)
watch(() => route.fullPath, () => {
  drawerOpen.value = false
})

// 当前登录用户：侧栏左下角要显示真实账号。
// 原先只有 layouts/default.vue 调 authStore.fetchUser()，工作台外壳从不拉，
// 于是刷新页面后 store 里 user 为 null，模板兜底渲染成「未登录」——
// 表现成「明明登录了却显示未登录」。这里在 SSR 阶段补一次，首屏就是账号名。
const { data: meData } = await useAsyncData('wb-me', async () => {
  if (!authStore.isLoggedIn || authStore.user) return null
  try {
    const res = await get<User>('/api/users/me')
    return res.data ?? null
  } catch {
    // 拉不到就按未登录渲染，跳转交给 useApi 的 401 分支，别在 SSR 里去 navigateTo
    return null
  }
}, { default: () => null })
if (meData.value && !authStore.user) authStore.user = meData.value

// 徽章数据（SSR 预取，两个模块共用）
const { data: aiStats } = await useAsyncData('wb-ai-stats', () => get<AiStats>('/api/ai/stats'), {
  default: () => null,
})
// 徽章只用于 AI 广场计数；「全部文章」与题库菜单按需求不显示数量，
// 对应的 /api/articles、/api/interview/stats 预取也一并去掉，少两次 SSR 请求。
const badgeCount = (key?: string): number | null => {
  if (!key) return null
  if (key === 'articles' || key.startsWith('interview')) return null
  const stats = aiStats.value?.data
  if (!stats) return null
  if (key === 'ai.total') return stats.total || null
  const type = key.replace('ai.', '')
  const count = stats.byType?.[type]
  return count ? Number(count) : null
}

const currentModule = computed(() => resolveModule(route.path))
const activeKey = computed(() => resolveActive(route.path, route.query.type as string | undefined))

/**
 * 可见性按**权限**判，不只看登录状态。
 *
 * 原来只判 isLoggedIn：任何登录用户都会看到「写文章」「后台首页」这些入口，
 * 点进去才被 403 挡住。菜单是承诺，给不出就别摆出来。
 *
 * 目前只有 admin 一个角色，与 layouts/admin.vue 的判定保持一致；
 * 将来出现多角色（编辑、只读）时，应改成以后端 /api/menus 返回的菜单为准。
 */
const canUseAdmin = computed(() => authStore.user?.role === 'admin')
const itemVisible = (item: NavItem) => !item.auth || canUseAdmin.value

/**
 * 模块级可见性：股票这类「数据按用户隔离」的模块，没权限时整个收起来。
 * 只靠 itemVisible 会留下一个空的模块标题，点进去还是 403。
 */
const { stockEnabled } = useFeatureFlags()
const moduleVisible = (mod: NavModule) => canSeeModule(mod, {
  canUseAdmin: canUseAdmin.value,
  stockEnabled,
})
const visibleModules = computed(() => MODULES.filter(moduleVisible))

/**
 * 未登录直接输 URL 进受保护模块（如 /finance）：跳登录页，别让用户对着 403 发呆。
 * 只在客户端做——SSR 期间跳转会打断首屏渲染，而且 SSR 已经按未登录渲染过一遍了。
 */
const guardAuthModule = () => {
  if (import.meta.server) return
  if (authStore.isLoggedIn) return
  if (currentModule.value?.auth) {
    navigateTo(`/login?redirect=${encodeURIComponent(route.fullPath)}`)
  }
}

onMounted(guardAuthModule)
watch(() => currentModule.value?.key, guardAuthModule)

const breadcrumb = computed(() => {
  const mod = currentModule.value
  for (const group of mod.groups) {
    for (const item of group.items) {
      if (item.key === activeKey.value) return [mod.label, item.label]
    }
  }
  return [mod.label]
})

const goto = (item: NavItem) => {
  if (item.type) return navigateTo({ path: item.path, query: { type: item.type } })
  return navigateTo(item.path)
}

const keyword = ref('')
const submitSearch = () => {
  const k = keyword.value.trim()
  if (!k) return
  navigateTo({ path: '/articles', query: { keyword: k } })
}

const userInitial = computed(() => {
  const name = authStore.user?.displayName || authStore.user?.username || 'U'
  return String(name).charAt(0).toUpperCase()
})

const onLogout = () => {
  authStore.logout()
}
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <a
      href="#wb-main"
      class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow"
    >
      跳到主内容
    </a>

    <div class="lg:flex lg:max-w-[1600px] lg:mx-auto">
      <!-- ============ 侧边栏 ============ -->
      <aside
        class="hidden lg:flex lg:flex-col sticky top-0 h-screen shrink-0 bg-white border-r border-slate-200 transition-[width] duration-150"
        :class="collapsed ? 'w-16' : 'w-60'"
      >
        <!-- 品牌 -->
        <div class="h-14 flex items-center gap-2 px-4 border-b border-slate-100">
          <img v-if="site.logoUrl" :src="site.logoUrl" :alt="site.name" class="h-7 max-w-[120px] object-contain" />
          <NuxtLink v-else to="/" class="text-base font-bold text-slate-900 truncate">{{ site.name }}</NuxtLink>
          <button
            type="button"
            class="ml-auto text-slate-400 hover:text-slate-700"
            :aria-label="collapsed ? '展开侧边栏' : '折叠侧边栏'"
            :aria-expanded="String(!collapsed)"
            @click="toggleSide"
          >
            <WorkbenchAppIcon name="menu" />
          </button>
        </div>

        <!-- 模块切换 + 导航 -->
        <nav class="flex-1 overflow-y-auto px-2 py-3" aria-label="模块导航">
          <div v-for="mod in visibleModules" :key="mod.key" class="mb-4">
            <!-- 折叠态：模块图标即入口；展开态：模块名只作分区标题，不再和「首页 / 全部条目」重复 -->
            <NuxtLink
              v-if="collapsed"
              :to="mod.home"
              class="flex items-center justify-center rounded-lg px-2 py-2 transition-colors"
              :class="mod.key === currentModule.key ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-50'"
              :aria-label="mod.label"
            >
              <WorkbenchAppIcon :name="mod.icon || 'doc'" />
            </NuxtLink>
            <p
              v-else
              class="px-2 pb-1 text-[15px] font-semibold"
              :class="mod.key === currentModule.key ? 'text-brand-600' : 'text-slate-900'"
            >
              {{ mod.label }}
            </p>

            <div v-if="!collapsed" class="mt-1">
              <template v-for="group in mod.groups" :key="group.key">
                <p v-if="group.label" class="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {{ group.label }}
                </p>
                <ul>
                  <li v-for="item in group.items.filter(itemVisible)" :key="item.key">
                    <button
                      type="button"
                      class="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-left transition-colors"
                      :class="item.key === activeKey
                        ? 'bg-slate-100 text-slate-900 font-medium'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'"
                      :aria-current="item.key === activeKey ? 'page' : undefined"
                      @click="goto(item)"
                    >
                      <WorkbenchAppIcon :name="item.icon" class="text-slate-400" />
                      <span class="truncate">{{ item.label }}</span>
                      <span v-if="badgeCount(item.badge)" class="ml-auto text-[11px] text-slate-400">
                        {{ badgeCount(item.badge) }}
                      </span>
                    </button>
                  </li>
                </ul>
              </template>
            </div>
          </div>
        </nav>

        <!-- 用户 / 登录 -->
        <div class="border-t border-slate-100 p-3">
          <div v-if="authStore.isLoggedIn" class="flex items-center gap-2">
            <span class="w-8 h-8 rounded-full bg-brand-100 text-brand-700 text-sm font-semibold flex items-center justify-center shrink-0">
              {{ userInitial }}
            </span>
            <div v-if="!collapsed" class="min-w-0">
              <p class="text-sm font-medium text-slate-900 truncate">
                {{ authStore.user?.displayName || authStore.user?.username || '未登录' }}
              </p>
              <p class="text-[11px] text-slate-400 truncate">{{ authStore.user?.role === 'admin' ? '管理员' : '成员' }}</p>
            </div>
            <button v-if="!collapsed" type="button" class="ml-auto text-slate-400 hover:text-slate-700" aria-label="退出登录" @click="onLogout">
              <WorkbenchAppIcon name="logout" />
            </button>
          </div>

          <template v-else>
            <NuxtLink
              v-if="collapsed"
              to="/login"
              class="flex items-center justify-center text-slate-500 hover:text-brand-600"
              aria-label="登录"
            >
              <WorkbenchAppIcon name="user" />
            </NuxtLink>
            <template v-else>
              <NuxtLink to="/login" class="block rounded-lg bg-brand-600 py-1.5 text-center text-sm text-white transition-colors hover:bg-brand-700">
                登录
              </NuxtLink>
              <p class="mt-2 text-center text-[11px] leading-relaxed text-slate-400">登录后可继续上次阅读</p>
            </template>
          </template>
        </div>
      </aside>

      <!-- ============ 主区 ============ -->
      <div class="flex-1 min-w-0">
        <header class="sticky top-0 z-30 h-14 bg-white/85 backdrop-blur border-b border-slate-200 flex items-center gap-3 px-4 lg:px-6">
          <button type="button" class="lg:hidden text-slate-500" aria-label="打开导航" @click="drawerOpen = true">
            <WorkbenchAppIcon name="menu" />
          </button>

          <nav class="hidden sm:flex items-center gap-1.5 text-sm" aria-label="面包屑">
            <span class="text-slate-400">{{ breadcrumb[0] }}</span>
            <span class="text-slate-300">/</span>
            <span class="text-slate-800 font-medium">{{ breadcrumb[1] }}</span>
          </nav>

          <form class="ml-auto hidden md:block" role="search" @submit.prevent="submitSearch">
            <label class="sr-only" for="wb-search">站内搜索</label>
            <input
              id="wb-search"
              v-model="keyword"
              type="search"
              placeholder="搜索文章…"
              class="w-56 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
            />
          </form>

        </header>

        <main id="wb-main" class="px-4 lg:px-6 py-6 mx-auto max-w-[1240px]">
          <slot />
        </main>
      </div>
    </div>

    <!-- 移动端抽屉导航 -->
    <el-drawer v-model="drawerOpen" direction="ltr" size="272px" :with-header="false">
      <div class="px-1">
        <p class="text-base font-bold text-slate-900 mb-3">{{ site.name }}</p>
        <div v-for="mod in visibleModules" :key="mod.key" class="mb-4">
          <p class="text-[15px] font-semibold text-slate-900 mb-1">{{ mod.label }}</p>
          <ul>
            <li v-for="item in mod.groups.flatMap(g => g.items).filter(itemVisible)" :key="item.key">
              <button
                type="button"
                class="w-full flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm"
                :class="item.key === activeKey ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-600'"
                @click="goto(item)"
              >
                <WorkbenchAppIcon :name="item.icon" class="text-slate-400" />
                <span>{{ item.label }}</span>
                <span v-if="badgeCount(item.badge)" class="ml-auto text-[11px] text-slate-400">{{ badgeCount(item.badge) }}</span>
              </button>
            </li>
          </ul>
        </div>
        <div v-if="!authStore.isLoggedIn" class="mt-4 border-t border-slate-100 pt-3">
          <NuxtLink
            to="/login"
            class="block rounded-lg bg-brand-600 py-2 text-center text-sm text-white transition-colors hover:bg-brand-700"
            @click="drawerOpen = false"
          >
            登录
          </NuxtLink>
          <p class="mt-2 text-center text-[11px] leading-relaxed text-slate-400">登录后可继续上次阅读</p>
        </div>
  </div>
    </el-drawer>
  </div>
</template>

