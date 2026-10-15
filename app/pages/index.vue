<script setup lang="ts">
import type { ArticleItem, Category, PageResult } from '~/types'
import type { AiItem, AiStats } from '~/types/ai'
import type { RecentRead } from '~/composables/useRecentReading'
import { TYPE_LABEL } from '~/types/ai'

// 工作台首页：登录后的任务起点（文章 + AI 广场两条线各一块）
definePageMeta({ layout: 'workbench', middleware: 'workspace-only' })

useSeoMeta({ title: '工作台', robots: 'noindex, nofollow' })

const authStore = useAuthStore()
const { get } = useApi()

const { data: articlesData, pending: articlesPending } = await useAsyncData(
  'wb-latest-articles',
  () => get<PageResult<ArticleItem>>('/api/articles', { page: 1, size: 5, status: 'published' }),
  { default: () => null }
)
const { data: aiHotData, pending: aiPending } = await useAsyncData(
  'wb-ai-hot',
  () => get<AiItem[]>('/api/ai/hot', { size: 5 }),
  { default: () => null }
)
const { data: aiStats } = await useAsyncData(
  'wb-ai-stats',
  () => get<AiStats>('/api/ai/stats'),
  { default: () => null }
)
const { data: categoriesData } = await useAsyncData(
  'wb-categories',
  () => get<Category[]>('/api/categories'),
  { default: () => null }
)

const articles = computed(() => articlesData.value?.data?.records || [])
const articleTotal = computed(() => Number(articlesData.value?.data?.total) || articles.value.length)
const aiHot = computed(() => aiHotData.value?.data || [])
const stats = computed(() => aiStats.value?.data || null)
const categories = computed(() => categoriesData.value?.data || [])

const platformBars = computed(() => {
  const byPlatform = stats.value?.byPlatform || {}
  const list = Object.entries(byPlatform).map(([name, count]) => ({ name, count: Number(count) }))
  const max = Math.max(1, ...list.map(i => i.count))
  return list.slice(0, 8).map(i => ({ ...i, percent: Math.round((i.count / max) * 100) }))
})

const selectedCount = computed(() => aiHot.value.filter(i => i.featured).length)

// 「继续阅读」来自本地记录（不落库）
const recent = ref<RecentRead[]>([])
const greeting = ref('你好')
onMounted(() => {
  recent.value = useRecentReading().read()
  const hour = new Date().getHours()
  greeting.value = hour < 6 ? '夜深了' : hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好'
})

const displayName = computed(() => authStore.user?.displayName || authStore.user?.username || '')
const today = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })
</script>

<template>
  <div>
    <!-- 概览 -->
    <div class="mb-5">
      <h1 class="text-xl font-bold text-slate-900">{{ greeting }}<span v-if="displayName">，{{ displayName }}</span></h1>
      <p class="mt-1 text-sm text-slate-500">
        {{ today }} · 站点 {{ articleTotal }} 篇文章，AI 广场 {{ stats?.total || 0 }} 个条目，覆盖 {{ stats?.platforms?.length || 0 }} 个客户端
      </p>
    </div>

    <!-- KPI -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <p class="text-xs text-slate-500">文章总数</p>
        <p class="mt-1 text-2xl font-bold text-slate-900">{{ articleTotal }}</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <p class="text-xs text-slate-500">AI 条目</p>
        <p class="mt-1 text-2xl font-bold text-slate-900">{{ stats?.total || 0 }}</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <p class="text-xs text-slate-500">覆盖客户端</p>
        <p class="mt-1 text-2xl font-bold text-slate-900">{{ stats?.platforms?.length || 0 }}</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <p class="text-xs text-slate-500">分类</p>
        <p class="mt-1 text-2xl font-bold text-slate-900">{{ categories.length }}</p>
      </div>
    </div>

    <!-- Bento -->
    <div class="grid grid-cols-1 lg:grid-cols-6 gap-4">
      <!-- 继续阅读 -->
      <section class="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4">
        <h2 class="text-sm font-semibold text-slate-900 mb-3">继续阅读</h2>
        <ul v-if="recent.length" class="space-y-2">
          <li v-for="item in recent" :key="item.path">
            <NuxtLink :to="item.path" class="block text-sm text-slate-700 hover:text-brand-600 truncate">
              {{ item.title }}
            </NuxtLink>
          </li>
        </ul>
        <div v-else class="text-sm text-slate-400">
          <p>还没有阅读记录。</p>
          <NuxtLink to="/articles" class="mt-2 inline-block text-brand-600 hover:underline">去文章列表看看 →</NuxtLink>
        </div>
      </section>

      <!-- 最新文章 -->
      <section class="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold text-slate-900">最新文章</h2>
          <NuxtLink to="/articles" class="text-xs text-brand-600 hover:underline">全部</NuxtLink>
        </div>
        <el-skeleton v-if="articlesPending && !articles.length" :rows="4" animated />
        <ul v-else-if="articles.length" class="space-y-2">
          <li v-for="a in articles" :key="a.uuid" class="flex items-baseline gap-2">
            <NuxtLink :to="'/post/' + a.uuid" class="text-sm text-slate-700 hover:text-brand-600 truncate">
              {{ a.title }}
            </NuxtLink>
            <span class="ml-auto shrink-0 text-[11px] text-slate-400">{{ (a.createdAt || '').slice(0, 10) }}</span>
          </li>
        </ul>
        <p v-else class="text-sm text-slate-400">还没有文章。去后台写第一篇？</p>
      </section>

      <!-- AI 热门 -->
      <section class="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold text-slate-900">AI 广场热门</h2>
          <NuxtLink to="/ai" class="text-xs text-brand-600 hover:underline">全部</NuxtLink>
        </div>
        <el-skeleton v-if="aiPending && !aiHot.length" :rows="4" animated />
        <ul v-else class="space-y-2.5">
          <li v-for="item in aiHot" :key="item.slug">
            <NuxtLink :to="'/ai/' + item.slug" class="flex items-center gap-2">
              <span class="ai-type" :class="'ai-type--' + item.type">{{ TYPE_LABEL[item.type] || item.type }}</span>
              <span class="text-sm text-slate-700 hover:text-brand-600 truncate">{{ item.name }}</span>
              <span class="ml-auto shrink-0 text-[11px] text-slate-400">★ {{ item.starCount }}</span>
            </NuxtLink>
          </li>
        </ul>
      </section>

      <!-- 快捷动作 -->
      <section class="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4">
        <h2 class="text-sm font-semibold text-slate-900 mb-3">快捷动作</h2>
        <div class="flex flex-wrap gap-2">
          <NuxtLink to="/admin/articles" class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:border-brand-300 hover:text-brand-600">
            <AppIcon name="plus" />写文章
          </NuxtLink>
          <NuxtLink to="/admin/ai-items" class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:border-brand-300 hover:text-brand-600">
            <AppIcon name="upload" />录入 AI 条目
          </NuxtLink>
          <NuxtLink to="/ai?sort=new" class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:border-brand-300 hover:text-brand-600">
            <AppIcon name="spark" />逛广场
          </NuxtLink>
          <NuxtLink to="/admin/site-settings" class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:border-brand-300 hover:text-brand-600">
            <AppIcon name="settings" />站点设置
          </NuxtLink>
        </div>
      </section>

      <!-- 平台分布 -->
      <section class="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-4">
        <h2 class="text-sm font-semibold text-slate-900 mb-1">条目覆盖的客户端</h2>
        <p class="text-xs text-slate-400 mb-3">按条目的客户端兼容行统计（{{ selectedCount }} 个精选条目）</p>
        <ul v-if="platformBars.length" class="space-y-2.5">
          <li v-for="bar in platformBars" :key="bar.name">
            <div class="flex items-center justify-between text-xs text-slate-600 mb-1">
              <span>{{ bar.name }}</span>
              <span class="text-slate-400">{{ bar.count }}</span>
            </div>
            <div class="h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div class="h-full rounded-full bg-brand-400" :style="{ width: bar.percent + '%' }" />
            </div>
          </li>
        </ul>
        <p v-else class="text-sm text-slate-400">还没有条目数据。</p>
      </section>
    </div>
  </div>
</template>

