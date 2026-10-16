<script setup lang="ts">
import type { PageResult, ArticleItem } from '~/types'
import type { AiStats } from '~/types/ai'
import type { InterviewStats } from '~/types/interview'
import { MODULES, resolveActive, resolveModule } from '~/utils/navModules'
import type { NavItem } from '~/utils/navModules'

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

// 徽章数据（SSR 预取，两个模块共用）
const { data: aiStats } = await useAsyncData('wb-ai-stats', () => get<AiStats>('/api/ai/stats'), {
  default: () => null,
})
const { data: articleTotal } = await useAsyncData(
  'wb-article-total',
  () => get<PageResult<ArticleItem>>('/api/articles', { page: 1, size: 1, status: 'published' }),
  { default: () => null }
)
const { data: interviewStats } = await useAsyncData('wb-interview-stats', () => get<InterviewStats>('/api/interview/stats'), {
  default: () => null,
})

const badgeCount = (key?: string): number | null => {
  if (!key) return null
  if (key === 'articles') {
    const total = articleTotal.value?.data?.total
    return total ? Number(total) : null
  }
  if (key.startsWith('interview.')) {
    const interview = interviewStats.value?.data
    if (!interview) return null
    if (key === 'interview.total') return interview.total || null
    const count = interview.byPosition?.[key.replace('interview.', '')]
    return count ? Number(count) : null
  }
  const stats = aiStats.value?.data
  if (!stats) return null
  if (key === 'ai.total') return stats.total || null
  const type = key.replace('ai.', '')
  const count = stats.byType?.[type]
  return count ? Number(count) : null
}

const currentModule = computed(() => resolveModule(route.path))
const activeKey = computed(() => resolveActive(route.path, route.query.type as string | undefined))

const itemVisible = (item: NavItem) => !item.auth || authStore.isLoggedIn

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
            <AppIcon name="menu" />
          </button>
        </div>

        <!-- 模块切换 + 导航 -->
        <nav class="flex-1 overflow-y-auto px-2 py-3" aria-label="模块导航">
          <div v-for="mod in MODULES" :key="mod.key" class="mb-4">
            <!-- 折叠态：模块图标即入口；展开态：模块名只作分区标题，不再和「首页 / 全部条目」重复 -->
            <NuxtLink
              v-if="collapsed"
              :to="mod.home"
              class="flex items-center justify-center rounded-lg px-2 py-2 transition-colors"
              :class="mod.key === currentModule.key ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-50'"
              :aria-label="mod.label"
            >
              <AppIcon :name="mod.icon || 'doc'" />
            </NuxtLink>
            <p
              v-else
              class="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide"
              :class="mod.key === currentModule.key ? 'text-brand-600' : 'text-slate-400'"
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
                      <AppIcon :name="item.icon" class="text-slate-400" />
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
              <AppIcon name="logout" />
            </button>
          </div>

          <template v-else>
            <NuxtLink
              v-if="collapsed"
              to="/login"
              class="flex items-center justify-center text-slate-500 hover:text-brand-600"
              aria-label="登录"
            >
              <AppIcon name="user" />
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
            <AppIcon name="menu" />
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

          <NuxtLink to="/ai" class="text-slate-500 hover:text-brand-600" aria-label="AI 广场">
            <AppIcon name="spark" />
          </NuxtLink>
          <NuxtLink to="/interview" class="text-slate-500 hover:text-brand-600" aria-label="面试题库">
            <AppIcon name="notebook" />
          </NuxtLink>
          <NuxtLink
            v-if="!authStore.isLoggedIn"
            to="/login"
            class="rounded-lg bg-brand-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-brand-700"
          >
            登录
          </NuxtLink>
          <NuxtLink v-if="authStore.isLoggedIn" to="/admin" class="text-slate-500 hover:text-brand-600" aria-label="管理后台">
            <AppIcon name="settings" />
          </NuxtLink>
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
        <div v-for="mod in MODULES" :key="mod.key" class="mb-4">
          <p class="text-sm font-semibold text-slate-800 mb-1">{{ mod.label }}</p>
          <ul>
            <li v-for="item in mod.groups.flatMap(g => g.items).filter(itemVisible)" :key="item.key">
              <button
                type="button"
                class="w-full flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm"
                :class="item.key === activeKey ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-600'"
                @click="goto(item)"
              >
                <AppIcon :name="item.icon" class="text-slate-400" />
                <span>{{ item.label }}</span>
                <span v-if="badgeCount(item.badge)" class="ml-auto text-[11px] text-slate-400">{{ badgeCount(item.badge) }}</span>
              </button>
            </li>
          </ul>
        </div>
  </div>
    </el-drawer>
  </div>
</template>

