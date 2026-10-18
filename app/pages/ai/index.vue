<script setup lang="ts">
import type { PageResult } from '~/types'
import type { AiItem, AiStats } from '~/types/ai'
import { TYPE_LABEL, TYPE_ORDER } from '~/types/ai'

// AI 广场：公开可爬（未登录也能看），沿用工作台外壳
definePageMeta({ layout: 'workbench' })

const site = useSiteConfig()
const route = useRoute()
const { get } = useApi()

const type = computed(() => String(route.query.type || ''))
const platform = computed(() => String(route.query.platform || ''))
const sort = computed(() => String(route.query.sort || 'hot'))
const page = computed(() => Number(route.query.page || 1) || 1)
const keyword = ref(String(route.query.keyword || ''))
watch(() => route.query.keyword, (v) => {
  keyword.value = String(v || '')
})

const { data, pending } = await useAsyncData(
  () => ['ai-list', type.value, platform.value, sort.value, page.value, String(route.query.keyword || '')].join('|'),
  () => get<PageResult<AiItem>>('/api/ai/items', {
    page: page.value,
    size: 12,
    type: type.value || undefined,
    platform: platform.value || undefined,
    keyword: String(route.query.keyword || '') || undefined,
    sort: sort.value,
  }),
  { default: () => null }
)

const { data: statsData } = await useAsyncData('ai-public-stats', () => get<AiStats>('/api/ai/stats'), {
  default: () => null,
})
const { data: hotData } = await useAsyncData('ai-public-hot', () => get<AiItem[]>('/api/ai/hot', { size: 5 }), {
  default: () => null,
})

const items = computed(() => data.value?.data?.records || [])
const total = computed(() => Number(data.value?.data?.total) || 0)
const stats = computed(() => statsData.value?.data || null)
const hot = computed(() => hotData.value?.data || [])
const platforms = computed(() => stats.value?.platforms || [])
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / 12)))

const setQuery = (patch: Record<string, any>) => {
  const query: Record<string, any> = { ...route.query, ...patch }
  Object.keys(query).forEach((k) => {
    if (query[k] === '' || query[k] === null || query[k] === undefined) delete query[k]
  })
  if (!('page' in patch)) delete query.page
  navigateTo({ path: '/ai', query })
}
const setType = (t: string) => setQuery({ type: t })
const togglePlatform = (p: string) => setQuery({ platform: platform.value === p ? '' : p })
const setSort = (v: string) => setQuery({ sort: v })
const onSearch = () => setQuery({ keyword: keyword.value.trim() })

useSeoMeta({
  title: () => (type.value ? (TYPE_LABEL[type.value] || type.value) + ' · AI 广场' : 'AI 广场'),
  description: () => '经过编辑精选与实测的 AI 资源目录：MCP 服务、Skill、提示词与工具，标注权限风险与客户端兼容性。' + site.description,
})
</script>

<template>
  <div>
    <div class="mb-4">
      <h1 class="text-xl font-bold text-slate-900">AI 广场</h1>
      <p class="mt-1 text-sm text-slate-500">
        {{ stats?.total || 0 }} 个条目 · {{ platforms.length }} 个客户端 · 每个条目都标注权限风险
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-1.5 mb-3" role="tablist" aria-label="条目类型">
      <button
        type="button"
        role="tab"
        :aria-selected="type === ''"
        class="rounded-lg px-3 py-1.5 text-sm transition-colors"
        :class="type === '' ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-brand-300'"
        @click="setType('')"
      >
        全部 <span class="text-xs opacity-70">{{ stats?.total || 0 }}</span>
      </button>
      <button
        v-for="t in TYPE_ORDER"
        :key="t"
        type="button"
        role="tab"
        :aria-selected="type === t"
        class="rounded-lg px-3 py-1.5 text-sm transition-colors"
        :class="type === t ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-brand-300'"
        @click="setType(t)"
      >
        {{ TYPE_LABEL[t] }} <span class="text-xs opacity-70">{{ stats?.byType?.[t] || 0 }}</span>
      </button>
    </div>

    <div class="flex flex-wrap items-center gap-2 mb-5">
      <form class="flex items-center gap-2" role="search" @submit.prevent="onSearch">
        <label class="sr-only" for="ai-search">搜索条目</label>
        <input
          id="ai-search"
          v-model="keyword"
          type="search"
          placeholder="搜索名称 / 用途 / 仓库…"
          class="w-56 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </form>

      <span class="text-xs text-slate-400 ml-1">客户端</span>
      <button
        v-for="p in platforms.slice(0, 5)"
        :key="p"
        type="button"
        class="rounded-full px-2.5 py-1 text-xs transition-colors"
        :class="platform === p ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'"
        :aria-pressed="platform === p"
        @click="togglePlatform(p)"
      >
        {{ p }}
      </button>

      <select
        :value="sort"
        class="ml-auto rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-600"
        aria-label="排序方式"
        @change="setSort(($event.target as HTMLSelectElement).value)"
      >
        <option value="hot">综合热度</option>
        <option value="new">最新上线</option>
        <option value="stars">星标最多</option>
      </select>
    </div>

    <div class="grid lg:grid-cols-[minmax(0,1fr)_260px] gap-6">
      <div>
        <el-skeleton v-if="pending && !items.length" :rows="6" animated />
        <div v-else-if="items.length" class="grid sm:grid-cols-2 gap-4">
          <AiItemCard v-for="item in items" :key="item.slug" :item="item" />
        </div>
        <div v-else class="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <p class="text-sm text-slate-500">这个筛选下还没有条目。</p>
          <button type="button" class="mt-2 text-sm text-brand-600 hover:underline" @click="setQuery({ type: '', platform: '', keyword: '' })">
            清空筛选
          </button>
        </div>

        <div v-if="totalPages > 1" class="flex items-center justify-center gap-3 mt-6 text-sm">
          <button
            type="button"
            class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-40"
            :disabled="page <= 1"
            @click="setQuery({ page: page - 1 })"
          >
            上一页
          </button>
          <span class="text-slate-500">{{ page }} / {{ totalPages }}</span>
          <button
            type="button"
            class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-40"
            :disabled="page >= totalPages"
            @click="setQuery({ page: page + 1 })"
          >
            下一页
          </button>
        </div>
      </div>

      <aside class="space-y-4">
        <section class="bg-white rounded-xl border border-slate-200 p-4">
          <h2 class="text-sm font-semibold text-slate-900 mb-3">热度榜</h2>
          <ol class="space-y-2">
            <li v-for="(item, i) in hot" :key="item.slug" class="flex items-baseline gap-2">
              <span class="text-xs text-slate-300 w-3">{{ i + 1 }}</span>
              <NuxtLink :to="'/ai/' + item.slug" class="text-sm text-slate-700 hover:text-brand-600 truncate">
                {{ item.name }}
              </NuxtLink>
              <span class="ml-auto text-[11px] text-slate-400">★ {{ item.starCount }}</span>
            </li>
          </ol>
        </section>

        <section class="bg-white rounded-xl border border-slate-200 p-4">
          <h2 class="text-sm font-semibold text-slate-900 mb-3">客户端覆盖</h2>
          <ul class="space-y-2 text-sm">
            <li v-for="(count, name) in stats?.byPlatform || {}" :key="name" class="flex items-center">
              <button type="button" class="text-slate-600 hover:text-brand-600" @click="togglePlatform(String(name))">
                {{ name }}
              </button>
              <span class="ml-auto text-xs text-slate-400">{{ count }}</span>
            </li>
          </ul>
        </section>

        <section class="bg-white rounded-xl border border-slate-200 p-4 text-xs leading-relaxed text-slate-500">
          <h2 class="text-sm font-semibold text-slate-900 mb-2">风险档位</h2>
          <p><span class="ai-risk ai-risk--read">只读</span> 只读上下文</p>
          <p class="mt-1"><span class="ai-risk ai-risk--write">可写</span> 会改动文件或数据</p>
          <p class="mt-1"><span class="ai-risk ai-risk--net">联网</span> 会外发请求</p>
          <p class="mt-1"><span class="ai-risk ai-risk--exec">执行</span> 会执行命令（最高风险）</p>
        </section>
      </aside>
    </div>
  </div>
</template>

