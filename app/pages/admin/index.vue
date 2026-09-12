<script setup lang="ts">
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import VChart from 'vue-echarts'

definePageMeta({
  layout: 'admin',
})

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent])

const authStore = useAuthStore()
const { get } = useApi()

const isAdmin = computed(() => authStore.user?.role === 'admin')

const stats = ref({
  articleCount: 0,
  commentCount: 0,
  categoryCount: 0,
  tagCount: 0,
  totalViewCount: 0,
})

const loading = ref(true)

const loadStats = async () => {
  loading.value = true
  try {
    // 管理员看全局统计，普通用户看个人统计
    const url = isAdmin.value ? '/api/admin/stats' : '/api/users/me/stats'
    const res = await get<Record<string, number>>(url)
    stats.value = { ...stats.value, ...res.data }
  } catch (e) {
    console.error(e)
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
    console.error(e)
  }
}

const trend = ref<Array<{ day: string; pv: number; uv: number }>>([])

const loadTrend = async () => {
  if (!isAdmin.value) return
  try {
    const res = await get<any[]>('/api/admin/stats/trend', { days: 30 })
    trend.value = res.data || []
  } catch (e) {
    console.error(e)
  }
}

const trendTotalPv = computed(() => trend.value.reduce((s, p) => s + Number(p.pv), 0))
const trendTotalUv = computed(() => trend.value.reduce((s, p) => s + Number(p.uv), 0))

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
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 mb-6">
      {{ isAdmin ? '仪表盘' : '我的数据' }}
    </h1>

    <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
      <div class="card text-center">
        <div class="text-3xl font-bold text-brand-600" v-text="stats.articleCount" />
        <div class="text-gray-500 text-sm mt-1">文章总数</div>
      </div>
      <div v-if="isAdmin" class="card text-center">
        <div class="text-3xl font-bold text-green-500" v-text="stats.commentCount" />
        <div class="text-gray-500 text-sm mt-1">评论总数</div>
      </div>
      <div class="card text-center">
        <div class="text-3xl font-bold text-red-500" v-text="stats.totalViewCount" />
        <div class="text-gray-500 text-sm mt-1">总访问量</div>
      </div>
      <div v-if="isAdmin" class="card text-center">
        <div class="text-3xl font-bold text-orange-500" v-text="stats.categoryCount" />
        <div class="text-gray-500 text-sm mt-1">分类数量</div>
      </div>
      <div v-if="isAdmin" class="card text-center">
        <div class="text-3xl font-bold text-purple-500" v-text="stats.tagCount" />
        <div class="text-gray-500 text-sm mt-1">标签数量</div>
      </div>
    </div>

    <div v-if="isAdmin" class="card mt-8">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">访问趋势（近 30 天）</h2>
        <div class="text-sm text-gray-500">
          总 PV <span class="font-semibold text-gray-800">{{ trendTotalPv }}</span>
          · 总 UV <span class="font-semibold text-gray-800">{{ trendTotalUv }}</span>
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
