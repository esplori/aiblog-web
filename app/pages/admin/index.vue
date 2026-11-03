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

// 浅蓝磨砂主题:只作用于仪表盘,离开本页自动摘掉 body class
import '~/assets/css/admin-themes/frost-blue.css'
useHead({ bodyAttrs: { class: 'frost-dash-body' } })

/** 图表统一走浅蓝调色板,避免各图各色 */
const CHART_BLUE = '#2f6fde'
const CHART_TEAL = '#5fa8d3'
const CHART_PALETTE = ['#2f6fde', '#5a8ce8', '#8fb0ec', '#7fb3c9', '#a9bbd8', '#c7d6ef']

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
  weekArticleCount: 0,
  lastWeekArticleCount: 0,
})

const loading = ref(true)
const updatedAt = ref('')

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
    const res = await get<any[]>('/api/admin/stats/top-articles', { limit: 5, days: topDays.value })
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
  await Promise.all([loadTrend(), loadTypeDist(), loadAudience()])
}

const reloadAll = async () => {
  loadError.value = ''
  await Promise.all([loadStats(), loadTopArticles(), loadTrend(), loadCategoryDist(), loadArticleTrend(), loadTypeDist(), loadAudience()])
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
        itemStyle: { color: CHART_BLUE, borderRadius: [0, 4, 4, 0] },
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
      itemStyle: { color: CHART_TEAL, borderRadius: [4, 4, 0, 0] },
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
        itemStyle: { color: CHART_PALETTE[i % CHART_PALETTE.length] },
      })),
    },
  ],
}))

// 受众分布：来源与设备（近 rangeDays 天）
const audience = ref<{ referrers: any[]; devices: any[] }>({ referrers: [], devices: [] })

const loadAudience = async () => {
  if (!isAdmin.value) return
  try {
    const res = await get<any>('/api/admin/stats/audience', { days: rangeDays.value })
    audience.value = {
      referrers: res.data?.referrers || [],
      devices: res.data?.devices || [],
    }
  } catch (e) {
    fail('来源与设备', e)
  }
}

const SOURCE_LABELS: Record<string, string> = {
  direct: '直接访问',
  search: '搜索引擎',
  referral: '外部链接',
}

const referrerOption = computed(() => {
  const rows = [...audience.value.referrers]
  return {
    grid: { left: 8, right: 24, top: 8, bottom: 4, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', minInterval: 1 },
    yAxis: { type: 'category', data: rows.map((r) => SOURCE_LABELS[r.source] || r.source) },
    series: [{
      name: 'PV',
      type: 'bar',
      barMaxWidth: 16,
      data: rows.map((r) => Number(r.pv)),
      itemStyle: { color: CHART_BLUE, borderRadius: [0, 4, 4, 0] },
    }],
  }
})

const deviceOption = computed(() => {
  const rows = audience.value.devices
  const label = (d: string) => (d === 'mobile' ? '移动端' : '桌面端')
  return {
    tooltip: { trigger: 'item', formatter: (p: any) => `${p.name}<br/>PV ${p.value}（${p.percent}%）<br/>UV ${p.data.uv}` },
    legend: { bottom: 0, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 12 } },
    series: [{
      type: 'pie',
      radius: ['44%', '68%'],
      center: ['50%', '44%'],
      label: { show: false },
      itemStyle: { borderColor: '#fff', borderWidth: 2 },
      data: rows.map((r, i) => ({
        name: label(r.device),
        value: Number(r.pv),
        uv: Number(r.uv),
        itemStyle: { color: [CHART_BLUE, '#a9bbd8'][i % 2] },
      })),
    }],
  }
})

// 热门文章时间窗：全时段累计会让老文章永远霸榜
const topDays = ref(0)
const TOP_OPTIONS = [
  { label: '全部', value: 0 },
  { label: '近 7 天', value: 7 },
  { label: '近 30 天', value: 30 },
]

const changeTopDays = async (days: number) => {
  if (topDays.value === days) return
  topDays.value = days
  await loadTopArticles()
}

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
      itemStyle: { color: CHART_BLUE },
    },
    {
      name: 'UV', type: 'line', smooth: true, symbolSize: 6,
      data: trend.value.map(p => Number(p.uv)),
      itemStyle: { color: CHART_TEAL },
    },
  ],
}))

const SOURCE_LABEL_OF = (k: string) => SOURCE_LABELS[k] || k || '未知'
const DEVICE_LABEL_OF = (k: string) =>
  k === 'mobile' ? '移动端' : k === 'desktop' ? '桌面端' : k === 'tablet' ? '平板' : k || '其他'

/** 把来源/设备行转成百分比条，取前 n 项；总数来自同一窗口，不必再加接口 */
const pctRows = (rows: any[], key: string, labelOf: (k: string) => string, n = 3) => {
  const total = rows.reduce((sum, r) => sum + Number(r.pv || 0), 0) || 1
  return rows.slice(0, n).map((r) => ({
    name: labelOf(r[key]),
    pct: Math.round((Number(r.pv || 0) / total) * 100),
  }))
}
const referrerBars = computed(() => pctRows(audience.value.referrers, 'source', SOURCE_LABEL_OF))
const deviceBars = computed(() => pctRows(audience.value.devices, 'device', DEVICE_LABEL_OF))
const topLabel = computed(() => TOP_OPTIONS.find((o) => o.value === topDays.value)?.label || '全部')
const fmtNum = (n: number) => Number(n || 0).toLocaleString('zh-CN')

onMounted(async () => {
  // 确保用户信息已加载（角色决定统计口径）
  if (!authStore.user) {
    await authStore.fetchUser()
  }
  await Promise.allSettled([
    loadStats(), loadTopArticles(), loadTrend(),
    loadCategoryDist(), loadArticleTrend(), loadTypeDist(), loadAudience(),
  ])
  updatedAt.value = dayjs().format('HH:mm')
})
</script>

<template>
  <div class="dash">
    <header class="dash-top">
      <div>
        <div class="dash-crumb">内容 / <b>仪表盘</b></div>
        <h1 class="dash-h1">
          {{ isAdmin ? '运行概览' : '我的数据' }}
          <span>近 {{ rangeDays }} 天<template v-if="updatedAt"> · 更新于 {{ updatedAt }}</template></span>
        </h1>
      </div>
      <div class="dash-ctrl">
        <div class="range-seg">
          <button
            v-for="opt in RANGE_OPTIONS"
            :key="opt.value"
            :class="rangeDays === opt.value ? 'is-on' : ''"
            @click="changeRange(opt.value)"
          >{{ opt.label }}</button>
        </div>
        <button class="dash-ib" title="刷新" @click="reloadAll">⟳</button>
      </div>
    </header>

    <div v-if="loadError" class="load-error mb-4 flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <span>⚠ {{ loadError }}——下面显示的数字可能不完整。</span>
      <button class="rounded border border-red-300 px-3 py-1 text-xs hover:bg-red-100" @click="reloadAll">重新加载</button>
    </div>

    <section class="dash-row1">
      <div class="card dash-k dash-k--hero">
        <div class="dash-lab">已发布文章</div>
        <div class="dash-val">{{ fmtNum(stats.publishedCount) }}<em>篇</em></div>
        <div class="dash-d">
          <span class="up">+{{ stats.weekArticleCount }}</span> 本周新增 · 上周 {{ stats.lastWeekArticleCount }} 篇
        </div>
      </div>
      <div class="card dash-k">
        <div class="dash-lab">区间阅读</div>
        <div class="dash-val">{{ fmtNum(trendTotalPv) }}</div>
        <div class="dash-d">
          PV · UV {{ fmtNum(trendTotalUv) }} ·
          <span :class="todayPvDelta.up === null ? '' : todayPvDelta.up ? 'up' : 'dn'">{{ todayPvDelta.text }}</span>
        </div>
      </div>
      <div class="card dash-k">
        <div class="dash-lab">互动</div>
        <div class="dash-val">{{ fmtNum(stats.commentCount) }}</div>
        <div class="dash-d">评论 · 待审 {{ stats.pendingCommentCount }} · 标签 {{ stats.tagCount }} 个</div>
      </div>
    </section>

    <section class="dash-row2">
      <div class="card dash-card dash-chart">
        <div class="dash-hd">
          <b>访问与阅读趋势</b>
          <span>今日 {{ todayStat.pv }} PV · 昨日 {{ yesterdayStat.pv }} PV</span>
        </div>
        <div v-if="trend.length === 0" class="dash-empty">
          还没有访问数据——埋点已开启，从今天起开始积累
        </div>
        <ClientOnly v-else>
          <VChart :option="trendOption" autoresize style="height: 100%; min-height: 240px; width: 100%" />
        </ClientOnly>
      </div>

      <div class="card dash-card">
        <div class="dash-hd">
          <b>热门文章</b>
          <NuxtLink to="/admin/articles" class="act">全部文章</NuxtLink>
        </div>
        <div class="flex gap-1 mb-2">
          <button
            v-for="opt in TOP_OPTIONS"
            :key="opt.value"
            class="dash-tab"
            :class="topDays === opt.value ? 'is-on' : ''"
            @click="changeTopDays(opt.value)"
          >{{ opt.label }}</button>
        </div>
        <div v-if="topArticles.length === 0" class="dash-empty">暂无数据</div>
        <ul v-else class="dash-list">
          <li v-for="(a, i) in topArticles" :key="a.id">
            <NuxtLink :to="`/admin/articles/edit/${a.id}`" class="rw">
              <span class="rk" :class="i < 3 ? 'is-top' : ''">{{ i + 1 }}</span>
              <span class="rt">{{ a.title }}</span>
              <span class="rn">{{ fmtNum(a.viewCount) }}</span>
            </NuxtLink>
          </li>
        </ul>
      </div>
    </section>

    <section class="dash-row3">
      <div class="card dash-card">
        <div class="dash-hd"><b>访问来源</b><span>近 {{ rangeDays }} 天</span></div>
        <div class="dash-bars">
          <div v-for="r in referrerBars" :key="r.name" class="dash-bar">
            <div class="bl"><span>{{ r.name }}</span><span>{{ r.pct }}%</span></div>
            <div class="bb"><i :style="{ width: r.pct + '%' }" /></div>
          </div>
          <div v-if="referrerBars.length === 0" class="dash-empty">暂无数据</div>
        </div>
        <div class="dash-dev">
          <div class="dash-lab" style="margin-bottom: 7px">设备</div>
          <div v-for="d in deviceBars" :key="d.name" class="dash-bar">
            <div class="bl"><span>{{ d.name }}</span><span>{{ d.pct }}%</span></div>
            <div class="bb"><i :style="{ width: d.pct + '%' }" /></div>
          </div>
        </div>
      </div>

      <div class="card dash-card">
        <div class="dash-hd"><b>站点概况</b><span>累计</span></div>
        <div class="dash-kv"><span>用户总数</span><b>{{ fmtNum(stats.userCount) }}</b></div>
        <div class="dash-kv"><span>分类</span><b>{{ stats.categoryCount }}</b></div>
        <div class="dash-kv"><span>标签</span><b>{{ stats.tagCount }}</b></div>
        <div class="dash-kv"><span>评论总数</span><b>{{ fmtNum(stats.commentCount) }}</b></div>
        <div class="dash-kv"><span>本月新增文章</span><b>{{ stats.monthArticleCount }}</b></div>
        <div class="dash-kv"><span>草稿</span><b>{{ stats.draftCount }}</b></div>
        <div class="dash-note">按{{ topLabel }}统计的热门文章在左侧卡片内切换区间</div>
      </div>
    </section>
  </div>
</template>

<style>
.dash{--ink:#12161c;--ink2:#48505c;--ink3:#8a93a0;--brand:#2a5c8f;--brand2:#3e7cb8;--hair:rgba(21,32,50,.07)}
.dash-top{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:16px}
.dash-crumb{font-size:11.5px;color:var(--ink3)}
.dash-crumb b{color:var(--ink);font-weight:600}
.dash-h1{font-size:21px;font-weight:650;letter-spacing:-.5px;margin-top:6px;color:var(--ink);line-height:1.2}
.dash-h1 span{font-size:12px;font-weight:400;color:var(--ink3);letter-spacing:0;margin-left:10px}
.dash-ctrl{display:flex;align-items:center;gap:7px}
.dash .range-seg{display:flex;padding:3px;border-radius:10px;background:rgba(255,255,255,.6);border:1px solid var(--hair)}
.dash .range-seg button{padding:5px 13px;border-radius:8px;font-size:11.5px;color:var(--ink3);background:transparent;border:0;cursor:pointer;transition:.15s}
.dash .range-seg button.is-on{background:#fff;color:var(--ink);font-weight:600;box-shadow:0 1px 3px rgba(18,28,45,.1)}
.dash-ib{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;background:rgba(255,255,255,.6);border:1px solid var(--hair);color:var(--ink3);cursor:pointer;font-size:15px;line-height:1}
.dash-ib:hover{color:var(--brand)}
.dash-row1{display:grid;grid-template-columns:1.42fr 1fr 1fr;gap:12px;margin-bottom:12px}
.dash-row2{display:grid;grid-template-columns:1.72fr 1fr;gap:12px;margin-bottom:12px}
.dash-row3{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media (max-width:1100px){.dash-row1,.dash-row2,.dash-row3{grid-template-columns:1fr}}
.dash-k{padding:15px 18px;position:relative;border-radius:18px!important}
.dash-k--hero{padding-left:21px}
.dash-k--hero:before{content:"";position:absolute;left:0;top:16px;bottom:16px;width:3px;border-radius:0 3px 3px 0;background:linear-gradient(180deg,#3e7cb8,#245078)}
.dash-lab{font-size:10.5px;font-weight:600;color:var(--ink3);letter-spacing:.1em}
.dash-val{font-size:30px;font-weight:650;letter-spacing:-1.3px;margin:8px 0 6px;font-variant-numeric:tabular-nums;color:var(--ink);line-height:1.1}
.dash-val em{font-style:normal;font-size:12.5px;font-weight:500;color:var(--ink3);margin-left:4px}
.dash-d{font-size:10.5px;color:var(--ink3);font-variant-numeric:tabular-nums}
.dash-d .up{color:#2e7d62;font-weight:600}
.dash-d .dn{color:#b4453c;font-weight:600}
.dash-card{padding:13px 16px 14px;border-radius:18px!important;display:flex;flex-direction:column;min-width:0}
.dash-hd{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;gap:8px}
.dash-hd b{font-size:12.5px;font-weight:600;color:var(--ink2)}
.dash-hd span{font-size:11px;color:var(--ink3);font-variant-numeric:tabular-nums}
.dash-hd .act{color:var(--brand);font-weight:600;font-size:11px}
.dash-chart{min-height:306px}
.dash-empty{font-size:12px;color:var(--ink3);padding:22px 0;text-align:center}
.dash-tab{font-size:11px;padding:3px 9px;border-radius:8px;color:var(--ink3);background:transparent;border:0;cursor:pointer}
.dash-tab.is-on{background:rgba(42,92,143,.08);color:var(--brand);font-weight:600}
.dash-list li+li{border-top:1px solid var(--hair)}
.dash .rw{display:flex;align-items:center;gap:9px;padding:9px 0;text-decoration:none}
.dash .rw:hover .rt{color:var(--brand)}
.dash .rk{width:18px;height:18px;flex-shrink:0;border-radius:6px;display:grid;place-items:center;font-size:10px;color:var(--ink3);background:rgba(21,32,50,.05);font-variant-numeric:tabular-nums}
.dash .rk.is-top{background:rgba(42,92,143,.1);color:var(--brand);font-weight:600}
.dash .rt{flex:1;min-width:0;font-size:12.5px;color:var(--ink2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:-.1px}
.dash .rn{font-size:11px;color:var(--ink3);font-variant-numeric:tabular-nums;flex-shrink:0}
.dash-bars{display:flex;flex-direction:column;gap:10px}
.dash-bar .bl{display:flex;justify-content:space-between;font-size:11px;color:var(--ink3);margin-bottom:5px;font-variant-numeric:tabular-nums}
.dash-bar .bb{height:4px;border-radius:2px;background:rgba(21,32,50,.06);overflow:hidden}
.dash-bar .bb i{display:block;height:4px;border-radius:2px;background:linear-gradient(90deg,#3e7cb8,#2a5c8f)}
.dash-dev{margin-top:14px;padding-top:12px;border-top:1px solid var(--hair);display:flex;flex-direction:column;gap:9px}
.dash-kv{display:flex;justify-content:space-between;font-size:12px;color:var(--ink2);padding:6px 0;border-bottom:1px solid var(--hair)}
.dash-kv b{font-weight:600;color:var(--ink);font-variant-numeric:tabular-nums}
.dash-note{margin-top:auto;padding-top:10px;font-size:10.5px;color:var(--ink3)}
</style>
