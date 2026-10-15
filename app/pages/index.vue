<script setup lang="ts">
import type { ArticleItem, Category, PageResult, Tag } from '~/types'
import type { AiItem, AiStats } from '~/types/ai'
import type { RecentRead } from '~/composables/useRecentReading'

// 公开门户首页：文章 + AI 广场混排，访客可看可爬；
// 个人区（继续阅读 / 快捷动作）只在登录后出现（方案：同一路由按登录态分流）。
definePageMeta({ layout: 'workbench' })

const site = useSiteConfig()
const authStore = useAuthStore()
const { get } = useApi()

const { data: articlesData, pending: articlesPending } = await useAsyncData(
  'home-articles',
  () => get<PageResult<ArticleItem>>('/api/articles', { page: 1, size: 6, status: 'published' }),
  { default: () => null }
)
const { data: aiData, pending: aiPending } = await useAsyncData(
  'home-ai-items',
  () => get<PageResult<AiItem>>('/api/ai/items', { page: 1, size: 6, sort: 'hot' }),
  { default: () => null }
)
const { data: aiHotData } = await useAsyncData('home-ai-hot', () => get<AiItem[]>('/api/ai/hot', { size: 5 }), {
  default: () => null,
})
const { data: aiStats } = await useAsyncData('home-ai-stats', () => get<AiStats>('/api/ai/stats'), {
  default: () => null,
})
const { data: categoriesData } = await useAsyncData('home-categories', () => get<Category[]>('/api/categories'), {
  default: () => null,
})
const { data: tagsData } = await useAsyncData('home-tags', () => get<Tag[]>('/api/tags/hot', { size: 12 }), {
  default: () => null,
})

const articles = computed(() => articlesData.value?.data?.records || [])
const articleTotal = computed(() => Number(articlesData.value?.data?.total) || articles.value.length)
const aiItems = computed(() => aiData.value?.data?.records || [])
const aiHot = computed(() => aiHotData.value?.data || [])
const stats = computed(() => aiStats.value?.data || null)
const categories = computed(() => (categoriesData.value?.data || []).slice(0, 8))
const tags = computed(() => (tagsData.value?.data || []).slice(0, 12))

// 继续阅读来自本地记录，只能在客户端读
const recent = ref<RecentRead[]>([])
onMounted(() => {
  if (authStore.isLoggedIn) recent.value = useRecentReading().read()
})

useSeoMeta({
  description: () =>
    (site.description || '') +
    ` 站内包含 ${articleTotal.value} 篇技术文章与 ${stats.value?.total || 0} 个经过精选的 AI 资源条目（MCP / Skill / 提示词 / 模型 / 工具）。`,
})
</script>

<template>
  <div>
    <!-- 门户头部 -->
    <section class="mb-6 rounded-2xl border border-slate-200 bg-white p-6 lg:p-8">
      <p class="text-xs font-semibold uppercase tracking-wide text-brand-600">{{ site.tagline || '博客 · AI 广场' }}</p>
      <h1 class="mt-2 text-2xl font-bold text-slate-900 lg:text-3xl">{{ site.name }}</h1>
      <p class="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">{{ site.description }}</p>
      <div class="mt-4 flex flex-wrap items-center gap-2">
        <NuxtLink to="/articles" class="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white transition-colors hover:bg-brand-700">
          开始阅读
        </NuxtLink>
        <NuxtLink
          to="/ai"
          class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 transition-colors hover:border-brand-300 hover:text-brand-600"
        >
          逛 AI 广场
        </NuxtLink>
      </div>
      <p class="mt-4 text-xs text-slate-400">
        {{ articleTotal }} 篇文章 · {{ stats?.total || 0 }} 个 AI 条目 · 覆盖 {{ stats?.platforms?.length || 0 }} 个客户端 · 每个条目标注权限风险
      </p>
    </section>

    <!-- 个人区（仅登录后） -->
    <section v-if="authStore.isLoggedIn" class="mb-6 grid gap-4 sm:grid-cols-2">
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <h2 class="mb-3 text-sm font-semibold text-slate-900">继续阅读</h2>
        <ul v-if="recent.length" class="space-y-2">
          <li v-for="item in recent" :key="item.path">
            <!-- 文章详情统一新开窗口；AI 条目留在当前窗口 -->
            <a
              v-if="item.kind === 'article'"
              :href="item.path"
              target="_blank"
              rel="noopener noreferrer"
              class="block truncate text-sm text-slate-700 hover:text-brand-600"
            >
              {{ item.title }}
            </a>
            <NuxtLink v-else :to="item.path" class="block truncate text-sm text-slate-700 hover:text-brand-600">
              {{ item.title }}
            </NuxtLink>
          </li>
        </ul>
        <p v-else class="text-sm text-slate-400">
          还没有阅读记录，去挑一篇 →
          <NuxtLink to="/articles" class="text-brand-600 hover:underline">文章列表</NuxtLink>
        </p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <h2 class="mb-3 text-sm font-semibold text-slate-900">快捷动作</h2>
        <div class="flex flex-wrap gap-2">
          <NuxtLink to="/admin/articles" class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:border-brand-300 hover:text-brand-600">
            <AppIcon name="plus" />写文章
          </NuxtLink>
          <NuxtLink to="/admin/ai-items" class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:border-brand-300 hover:text-brand-600">
            <AppIcon name="upload" />录入 AI 条目
          </NuxtLink>
          <NuxtLink to="/admin" class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:border-brand-300 hover:text-brand-600">
            <AppIcon name="chart" />后台
          </NuxtLink>
          <NuxtLink to="/admin/site-settings" class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:border-brand-300 hover:text-brand-600">
            <AppIcon name="settings" />站点设置
          </NuxtLink>
        </div>
      </div>
    </section>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div class="min-w-0 space-y-8">
        <!-- 最新文章 -->
        <section>
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-base font-bold text-slate-900">最新文章</h2>
            <NuxtLink to="/articles" class="text-sm text-brand-600 hover:underline">全部 {{ articleTotal }} 篇 →</NuxtLink>
          </div>
          <el-skeleton v-if="articlesPending && !articles.length" :rows="4" animated />
          <div v-else-if="articles.length" class="grid gap-4 sm:grid-cols-2">
            <BlogArticleCard v-for="article in articles" :key="article.id" :article="article" />
          </div>
          <p v-else class="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-400">还没有文章。</p>
        </section>

        <!-- AI 广场 -->
        <section>
          <div class="mb-1 flex items-center justify-between">
            <h2 class="text-base font-bold text-slate-900">AI 广场</h2>
            <NuxtLink to="/ai" class="text-sm text-brand-600 hover:underline">全部 {{ stats?.total || 0 }} 个条目 →</NuxtLink>
          </div>
          <p class="mb-3 text-xs text-slate-400">编辑精选的 MCP 服务、Skill、提示词、模型与工具，标注权限风险与客户端兼容性</p>
          <el-skeleton v-if="aiPending && !aiItems.length" :rows="4" animated />
          <div v-else-if="aiItems.length" class="grid gap-4 sm:grid-cols-2">
            <AiItemCard v-for="item in aiItems" :key="item.slug" :item="item" />
          </div>
          <p v-else class="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-400">还没有条目。</p>
        </section>
      </div>

      <!-- 右栏 -->
      <aside class="space-y-4">
        <section class="rounded-xl border border-slate-200 bg-white p-4">
          <h2 class="mb-3 text-sm font-semibold text-slate-900">AI 热度榜</h2>
          <ol class="space-y-2">
            <li v-for="(item, i) in aiHot" :key="item.slug" class="flex items-baseline gap-2">
              <span class="w-3 text-xs text-slate-300">{{ i + 1 }}</span>
              <NuxtLink :to="'/ai/' + item.slug" class="truncate text-sm text-slate-700 hover:text-brand-600">
                {{ item.name }}
              </NuxtLink>
              <span class="ml-auto text-[11px] text-slate-400">★ {{ item.starCount }}</span>
            </li>
          </ol>
        </section>

        <section class="rounded-xl border border-slate-200 bg-white p-4">
          <h2 class="mb-3 text-sm font-semibold text-slate-900">分类</h2>
          <nav class="flex flex-col gap-0.5">
            <NuxtLink
              v-for="cat in categories"
              :key="cat.id"
              :to="{ path: '/articles', query: { category: cat.id } }"
              class="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              <span>{{ cat.name }}</span>
              <span class="text-xs text-slate-400">{{ cat.articleCount }}</span>
            </NuxtLink>
          </nav>
        </section>

        <section v-if="tags.length" class="rounded-xl border border-slate-200 bg-white p-4">
          <h2 class="mb-3 text-sm font-semibold text-slate-900">热门标签</h2>
          <div class="flex flex-wrap gap-1.5">
            <NuxtLink
              v-for="tag in tags"
              :key="tag.id"
              :to="{ path: '/articles', query: { tag: tag.id } }"
              class="rounded-full bg-slate-50 px-2.5 py-1 text-xs text-slate-600 transition-colors hover:bg-brand-50 hover:text-brand-600"
            >
              {{ tag.name }}
            </NuxtLink>
          </div>
        </section>

        <section class="rounded-xl border border-slate-200 bg-white p-4">
          <h2 class="mb-3 text-sm font-semibold text-slate-900">客户端覆盖</h2>
          <ul class="space-y-2 text-sm">
            <li v-for="(count, name) in stats?.byPlatform || {}" :key="name" class="flex items-center">
              <NuxtLink :to="{ path: '/ai', query: { platform: name } }" class="text-slate-600 hover:text-brand-600">
                {{ name }}
              </NuxtLink>
              <span class="ml-auto text-xs text-slate-400">{{ count }}</span>
            </li>
          </ul>
        </section>
      </aside>
    </div>
  </div>
</template>

