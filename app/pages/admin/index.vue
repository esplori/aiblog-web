<script setup lang="ts">
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart, PieChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import dayjs from 'dayjs'

definePageMeta({
  layout: 'admin',
})

use([CanvasRenderer, LineChart, BarChart, PieChart, GridComponent, TooltipComponent, LegendComponent])

const authStore = useAuthStore()
const { get } = useApi()

const isAdmin = computed(() => authStore.user?.role === 'admin')

const stats = ref({
  articleCount: 0,
  commentCount: 0,
  categoryCount: 0,
  tagCount: 0,
  totalViewCount: 0,
  userCount: 0,
  publishedCount: 0,
  draftCount: 0,
  monthArticleCount: 0,
  pendingCommentCount: 0,
})

const loading = ref(true)

/** 趋势/流量分布共用的时间窗；接口本身支持任意 days，前端只暴露三档 */
const rangeDays = ref(30)
const RANGE_OPTIONS = [
  { label: '7 天', value: 7 },
  { label: '30 天', value: 30 },
  { label: '90 天', value: 90 },
]

/**
 * 拉数失败必须看得见。
 * 原来每个请求都 catch 完只 console.error，后端一挂页面照样渲染成一片 0 ——
 * 看的人会当成「今天没人访问」，而不是「接口挂了」。
 */
const loadError = ref('')

const fail = (label: string, e: unknown) => {
  console.error(e)
  loadError.value = loadError.value
    ? `${loadError.value}、${label}`
    : `${label}加载失败`
}

const loadStats = async () => {
  loading.value = true
  try {
    // 管理员看全局统计，普通用户看个人统计
    const url = isAdmin.value ? '/api/admin/stats' : '/api/users/me/stats'
    const res = await get<Record<string, number>>(url)
    stats.value = { ...stats.value, ...res.data }
  } catch (e) {
    fail('概览统计', e)
  } finally {
    loading.value = false
  }
}

const topArticles = ref<Array<{ id: number; uuid: string; title: string; viewCount: number }>>([])

const loadTopArticles = async () => {
  if (!isAdmin.value) return
  try {
    const res = await get<any[]>('/api/admin/stats/top-articles', { limit: 5 })
    topArticles.value = res.data || []
  } catch (e) {
    fail('热门文章', e)
  }
}

const trend = ref<Array<{ day: string; pv: number; uv: number }>>([])

const loadTrend = async () => {
  if (!isAdmin.value) return
  try {
    const res = await get<any[]>('/api/admin/stats/trend', { days: rangeDays.value })
    trend.value = res.data || []
  } catch (e) {
    fail('访问趋势', e)
  }
}

// 今日/昨日对照：trend 是按天升序的，取尾部两条即可，不用再加接口
const todayStr = () => dayjs().format('YYYY-MM-DD')
const yesterdayStr = () => dayjs().subtract(1, 'day').format('YYYY-MM-DD')

const dayStat = (day: string) => {
  const row = trend.value.find((p) => String(p.day).slice(0, 10) === day)
  return { pv: Number(row?.pv ?? 0), uv: Number(row?.uv ?? 0) }
}

const todayStat = computed(() => dayStat(todayStr()))
const yesterdayStat = computed(() => dayStat(yesterdayStr()))

/** 环比文案：昨天为 0 时不显示百分比（除以 0 没有意义） */
const deltaOf = (cur: number, prev: number): { text: string; up: boolean | null } => {
  if (!prev) return { text: '—', up: null }
  const diff = cur - prev
  const pct = Math.round((diff / prev) * 100)
  if (diff === 0) return { text: '持平', up: null }
  return { text: `${diff > 0 ? '↑' : '↓'} ${Math.abs(pct)}%`, up: diff > 0 }
}

const todayPvDelta = computed(() => deltaOf(todayStat.value.pv, yesterdayStat.value.pv))
const todayUvDelta = computed(() => deltaOf(todayStat.value.uv, yesterdayStat.value.uv))

/** 切换时间窗：只重拉跟天窗相关的两块，别把分类分布也带着重算 */
const changeRange = async (days: number) => {
  if (rangeDays.value === days) return
  rangeDays.value = days
  loadError.value = ''
  await Promise.all([loadTrend(), loadTypeDist()])
}

const reloadAll = async () => {
  loadError.value = ''
  await Promise.all([loadStats(), loadTopArticles(), loadTrend(), loadCategoryDist(), loadArticleTrend(), loadTypeDist()])
}

const trendTotalPv = computed(() => trend.value.reduce((s, p) => s + Number(p.pv), 0))
const trendTotalUv = computed(() => trend.value.reduce((s, p) => s + Number(p.uv), 0))

// 分类文章数分布（第一档）
const categoryDist = ref<Array<{ name: string; count: number }>>([])

const loadCategoryDist = async () => {
  if (!isAdmin.value) return
  try {
    const res = await get<any[]>('/api/admin/stats/category-distribution')
    categoryDist.value = res.data || []
  } catch (e) {
    fail('分类分布', e)
  }
}

// 文章发布趋势（按月，第一档）
const articleTrend = ref<Array<{ month: string; count: number }>>([])

const loadArticleTrend = async () => {
  if (!isAdmin.value) return
  try {
    const res = await get<any[]>('/api/admin/stats/article-trend', { months: 6 })
    articleTrend.value = res.data || []
  } catch (e) {
    fail('发文趋势', e)
  }
}

// 分类分布：横向柱状（数量多的在上方，故渲染前反转）
const categoryOption = computed(() => {
  const rows = [...categoryDist.value].reverse()
  return {
    grid: { left: 8, right: 20, top: 10, bottom: 4, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', minInterval: 1 },
    yAxis: { type: 'category', data: rows.map(c => c.name) },
    series: [
      {
        name: '文章数', type: 'bar', barMaxWidth: 18,
        data: rows.map(c => Number(c.count)),
        itemStyle: { color: '#2563eb', borderRadius: [0, 4, 4, 0] },
      },
    ],
  }
})

// 文章发布趋势：按月柱状
const articleTrendOption = computed(() => ({
  grid: { left: 8, right: 12, top: 24, bottom: 4, containLabel: true },
  tooltip: { trigger: 'axis' },
  xAxis: {
    type: 'category',
    data: articleTrend.value.map(p => String(p.month).slice(2)),
  },
  yAxis: { type: 'value', minInterval: 1 },
  series: [
    {
      name: '新增文章', type: 'bar', barMaxWidth: 28,
      data: articleTrend.value.map(p => Number(p.count)),
      itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] },
    },
  ],
}))

// 页面类型流量分布（埋点扩展后才有：以前只有文章详情有数据）
const TYPE_LABELS: Record<string, string> = {
  article: '文章详情',
  home: '首页',
  list: '文章列表',
  interview: '题库',
  ai: 'AI 索引',
  other: '其它',
}

const typeDist = ref<Array<{ type: string; pv: number; uv: number }>>([])

const loadTypeDist = async () => {
  if (!isAdmin.value) return
  try {
    const res = await get<any[]>('/api/admin/stats/type-distribution', { days: rangeDays.value })
    typeDist.value = (res.data || []).filter((r) => Number(r.pv) > 0)
  } catch (e) {
    fail('流量分布', e)
  }
}

const typeDistTotal = computed(() => typeDist.value.reduce((s, r) => s + Number(r.pv), 0))

const typeDistOption = computed(() => ({
  tooltip: {
    trigger: 'item',
    formatter: (p: any) => `${p.name}<br/>PV ${p.value}（${p.percent}%）<br/>UV ${p.data.uv}`,
  },
  legend: { bottom: 0, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 12 } },
  series: [
    {
      type: 'pie',
      radius: ['42%', '68%'],
      center: ['50%', '44%'],
      avoidLabelOverlap: true,
      itemStyle: { borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      data: typeDist.value.map((r, i) => ({
        name: TYPE_LABELS[r.type] || r.type,
        value: Number(r.pv),
        uv: Number(r.uv),
        itemStyle: { color: ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#94a3b8'][i % 6] },
      })),
    },
  ],
}))

// ECharts 折线配置：单点/多点都能正常绘制
const trendOption = computed(() => ({
  grid: { left: 8, right: 12, top: 30, bottom: 4, containLabel: true },
  tooltip: { trigger: 'axis' },
  legend: { data: ['PV', 'UV'], right: 0, top: 0, icon: 'roundRect' },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: trend.value.map(p => String(p.day).slice(5)),
  },
  yAxis: { type: 'value', minInterval: 1 },
  series: [
    {
      name: 'PV', type: 'line', smooth: true, symbolSize: 6,
      data: trend.value.map(p => Number(p.pv)),
      itemStyle: { color: '#2563eb' },
    },
    {
      name: 'UV', type: 'line', smooth: true, symbolSize: 6,
      data: trend.value.map(p => Number(p.uv)),
      itemStyle: { color: '#10b981' },
    },
  ],
}))

onMounted(async () => {
  // 确保用户信息已加载（角色决定统计口径）
  if (!authStore.user) {
    await authStore.fetchUser()
  }
  loadStats()
  loadTopArticles()
  loadTrend()
  loadCategoryDist()
  loadArticleTrend()
  loadTypeDist()
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 mb-6">
      {{ isAdmin ? '仪表盘' : '我的数据' }}
    </h1>

    <div
      v-if="loadError"
      class="mb-6 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      <span>⚠ {{ loadError }}——下面显示的数字可能不完整。</span>
      <button class="rounded border border-red-300 px-3 py-1 text-xs hover:bg-red-100" @click="reloadAll">
        重新加载
      </button>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
      <div class="card text-center">
        <div class="text-3xl font-bold text-brand-600" v-text="stats.articleCount" />
        <div class="text-gray-500 text-sm mt-1">文章总数</div>
      </div>
      <template v-if="isAdmin">
        <div class="card text-center">
          <div class="text-3xl font-bold text-blue-500" v-text="stats.publishedCount" />
          <div class="text-gray-500 text-sm mt-1">已发布</div>
        </div>
        <div class="card text-center">
          <div class="text-3xl font-bold text-gray-500" v-text="stats.draftCount" />
          <div class="text-gray-500 text-sm mt-1">草稿</div>
        </div>
        <div class="card text-center">
          <div class="text-3xl font-bold text-cyan-500" v-text="stats.monthArticleCount" />
          <div class="text-gray-500 text-sm mt-1">本月新增</div>
        </div>
      </template>
      <div class="card text-center">
        <div class="text-3xl font-bold text-red-500" v-text="stats.totalViewCount" />
        <div class="text-gray-500 text-sm mt-1">总访问量</div>
      </div>
      <template v-if="isAdmin">
        <div class="card text-center">
          <div class="text-3xl font-bold text-indigo-500" v-text="stats.userCount" />
          <div class="text-gray-500 text-sm mt-1">用户总数</div>
        </div>
        <div class="card text-center">
          <div class="text-3xl font-bold text-green-500" v-text="stats.commentCount" />
          <div class="text-gray-500 text-sm mt-1">评论总数</div>
        </div>
        <div class="card text-center">
          <div class="text-3xl font-bold text-amber-500" v-text="stats.pendingCommentCount" />
          <div class="text-gray-500 text-sm mt-1">待审评论</div>
          <NuxtLink
            v-if="stats.pendingCommentCount > 0"
            to="/admin/comments"
            class="text-xs text-brand-600 hover:underline"
          >去审核 →</NuxtLink>
        </div>
        <div class="card text-center">
          <div class="text-3xl font-bold text-orange-500" v-text="stats.categoryCount" />
          <div class="text-gray-500 text-sm mt-1">分类数量</div>
        </div>
        <div class="card text-center">
          <div class="text-3xl font-bold text-purple-500" v-text="stats.tagCount" />
          <div class="text-gray-500 text-sm mt-1">标签数量</div>
        </div>
      </template>
    </div>

    <div v-if="isAdmin" class="card mt-8">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 class="text-lg font-semibold">访问趋势（近 {{ rangeDays }} 天）</h2>
        <div class="flex items-center gap-3">
          <div class="text-sm text-gray-500">
            总 PV <span class="font-semibold text-gray-800">{{ trendTotalPv }}</span>
            · 总 UV <span class="font-semibold text-gray-800">{{ trendTotalUv }}</span>
          </div>
          <div class="flex rounded-lg border border-slate-200 p-0.5">
            <button
              v-for="opt in RANGE_OPTIONS"
              :key="opt.value"
              class="rounded px-2.5 py-1 text-xs transition"
              :class="rangeDays === opt.value ? 'bg-brand-600 text-white' : 'text-gray-500 hover:text-brand-600'"
              @click="changeRange(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
      </div>

      <div class="mb-4 grid grid-cols-2 gap-3 text-sm">
        <div class="rounded-lg bg-slate-50 px-3 py-2">
          <span class="text-gray-500">今日</span>
          <span class="ml-2 font-semibold text-gray-800">{{ todayStat.pv }}</span>
          <span class="text-gray-400">PV</span>
          <span
            class="ml-1 text-xs"
            :class="todayPvDelta.up === null ? 'text-gray-400' : todayPvDelta.up ? 'text-green-600' : 'text-red-500'"
          >{{ todayPvDelta.text }}</span>
          <span class="ml-3 font-semibold text-gray-800">{{ todayStat.uv }}</span>
          <span class="text-gray-400">UV</span>
          <span
            class="ml-1 text-xs"
            :class="todayUvDelta.up === null ? 'text-gray-400' : todayUvDelta.up ? 'text-green-600' : 'text-red-500'"
          >{{ todayUvDelta.text }}</span>
        </div>
        <div class="rounded-lg bg-slate-50 px-3 py-2 text-gray-500">
          昨日 {{ yesterdayStat.pv }} PV · {{ yesterdayStat.uv }} UV
        </div>
      </div>
      <div v-if="trend.length === 0" class="text-gray-400 text-sm py-10 text-center">
        还没有访问数据——埋点已开启，从今天起开始积累
      </div>
      <ClientOnly v-else>
        <VChart :option="trendOption" autoresize style="height: 200px; width: 100%" />
      </ClientOnly>
    </div>

    <div v-if="isAdmin" class="card mt-8">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">流量分布（近 {{ rangeDays }} 天）</h2>
        <div class="text-sm text-gray-500">
          合计 PV <span class="font-semibold text-gray-800">{{ typeDistTotal }}</span>
        </div>
      </div>
      <div v-if="typeDist.length === 0" class="text-gray-400 text-sm py-10 text-center">
        还没有页面访问数据
      </div>
      <ClientOnly v-else>
        <VChart :option="typeDistOption" autoresize style="height: 240px; width: 100%" />
      </ClientOnly>
    </div>

    <div v-if="isAdmin" class="card mt-8">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">分类文章分布</h2>
        <NuxtLink to="/admin/categories" class="text-sm text-brand-600 hover:underline">管理分类</NuxtLink>
      </div>
      <div v-if="categoryDist.length === 0" class="text-gray-400 text-sm py-6 text-center">暂无分类</div>
      <ClientOnly v-else>
        <VChart :option="categoryOption" autoresize style="height: 220px; width: 100%" />
      </ClientOnly>
    </div>

    <div v-if="isAdmin" class="card mt-8">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">文章发布趋势（近 6 个月）</h2>
        <NuxtLink to="/admin/articles" class="text-sm text-brand-600 hover:underline">全部文章</NuxtLink>
      </div>
      <div v-if="articleTrend.length === 0" class="text-gray-400 text-sm py-6 text-center">暂无数据</div>
      <ClientOnly v-else>
        <VChart :option="articleTrendOption" autoresize style="height: 200px; width: 100%" />
      </ClientOnly>
    </div>

    <div v-if="isAdmin" class="card mt-8">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">热门文章 TOP5</h2>
        <NuxtLink to="/admin/articles" class="text-sm text-brand-600 hover:underline">全部文章</NuxtLink>
      </div>
      <div v-if="topArticles.length === 0" class="text-gray-400 text-sm py-6 text-center">暂无数据</div>
      <ul v-else class="divide-y divide-gray-100">
        <li v-for="(a, i) in topArticles" :key="a.id" class="flex items-center gap-3 py-3">
          <span
            class="w-6 h-6 flex-shrink-0 rounded-full text-center text-xs leading-6"
            :class="i < 3 ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'"
          >{{ i + 1 }}</span>
          <NuxtLink :to="`/admin/articles/edit/${a.id}`" class="flex-1 truncate text-gray-800 hover:text-brand-600">
            {{ a.title }}
          </NuxtLink>
          <span class="text-sm text-gray-400 flex-shrink-0">{{ a.viewCount }} 次浏览</span>
        </li>
      </ul>
    </div>
  </div>
</template>
