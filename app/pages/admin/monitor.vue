<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

const { get } = useApi()

const loading = ref(true)
const errorMsg = ref('')

// 健康状态
const health = ref<any>(null)
// 进程内指标
const metrics = ref<any>(null)
// 历史趋势
const trend = ref<any>(null)
// 会话 / 追踪
const conversations = ref<any[]>([])
const runs = ref<any[]>([])

const days = ref(7)

// ---- 数据加载 ----
const loadAll = async () => {
  loading.value = true
  errorMsg.value = ''
  try {
    const [h, m, t, c, r] = await Promise.allSettled([
      get('/api/admin/monitor/health'),
      get('/api/admin/monitor/metrics'),
      get(`/api/admin/monitor/trend?days=${days.value}`),
      get('/api/admin/monitor/conversations'),
      get('/api/admin/monitor/traces?limit=20'),
    ])
    if (h.status === 'fulfilled') health.value = h.value.data
    if (m.status === 'fulfilled') metrics.value = m.value.data
    if (t.status === 'fulfilled') trend.value = t.value.data
    if (c.status === 'fulfilled') conversations.value = c.value.data?.conversations || []
    if (r.status === 'fulfilled') runs.value = r.value.data?.runs || []
  } catch (e: any) {
    errorMsg.value = e?.message || '加载监控数据失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadAll)

// ---- 派生数据 ----
const agentStatus = computed(() => health.value?.status || 'unknown')
const statusText = computed(() => ({ ok: '在线', degraded: '降级', down: '离线', unknown: '未知' } as Record<string, string>)[agentStatus.value] || agentStatus.value)
const statusType = computed(() => ({ ok: 'success', degraded: 'warning', down: 'danger', unknown: 'info' } as Record<string, string>)[agentStatus.value] || 'info')

const uptimeText = computed(() => {
  const s = health.value?.uptime_seconds ?? metrics.value?.gauges?.uptime_seconds
  if (!s) return '-'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
})

// 健康检查项
const healthChecks = computed(() => {
  const checks = health.value?.checks
  if (!checks) return []
  return Object.entries(checks).map(([name, v]: any) => ({ name, ...v }))
})

// 趋势序列
const trendSeries = computed(() => {
  const series = trend.value?.series || {}
  const dates = Object.values(series)[0]?.dates || []
  return {
    dates,
    toolCalls: series.tool_calls_total?.values || [],
    llmCalls: series.llm_calls_total?.values || [],
    tokens: series.tokens_total?.values || [],
    errors: series.tool_errors_total?.values || [],
  }
})

// 今日/昨日增量（趋势最后一天）
const todayToolCalls = computed(() => trendSeries.value.toolCalls.at(-1) || 0)
const todayLlmCalls = computed(() => trendSeries.value.llmCalls.at(-1) || 0)
const todayTokens = computed(() => trendSeries.value.tokens.at(-1) || 0)
const todayErrors = computed(() => trendSeries.value.errors.at(-1) || 0)

// 工具 TOP（进程内计数）
const toolTop = computed(() => {
  const buckets = metrics.value?.counters?.tool_calls_total || {}
  return Object.entries(buckets)
    .filter(([k]) => k.startsWith('tool='))
    .map(([k, v]: any) => ({ tool: k.replace('tool=', ''), calls: v }))
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 10)
})

// LLM provider 统计（进程内计数）
const llmProviders = computed(() => {
  const buckets = metrics.value?.counters?.llm_calls_total || {}
  return Object.entries(buckets)
    .filter(([k]) => k.includes('provider='))
    .map(([k, v]: any) => {
      const provider = k.split(',').find((p) => p.startsWith('provider='))?.replace('provider=', '') || k
      return { provider, calls: v }
    })
    .sort((a, b) => b.calls - a.calls)
})

// 错误率
const errorRate = computed(() => {
  const calls = metrics.value?.counters?.tool_calls_total?.total
  const errors = metrics.value?.counters?.tool_errors_total
  if (!calls) return '0%'
  const total = Object.values(errors || {}).reduce((s: number, v: any) => s + (typeof v === 'number' ? v : 0), 0)
  return `${((total / calls) * 100).toFixed(1)}%`
})

const fmtNum = (n: any) => (n == null ? '-' : Number(n).toLocaleString())
const fmtToken = (n: any) => {
  if (n == null) return '-'
  const v = Number(n)
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`
  return String(v)
}
const fmtTime = (ts: any) => {
  if (!ts) return '-'
  const d = new Date(ts * 1000)
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
const fmtDuration = (s: any) => {
  if (s == null) return '-'
  if (s < 60) return `${s.toFixed(1)}s`
  return `${Math.floor(s / 60)}m ${(s % 60).toFixed(0)}s`
}

// CSS 柱状图高度（相对最大值）
const barHeight = (values: number[], v: number) => {
  const max = Math.max(...values, 1)
  return `${Math.max((v / max) * 100, v > 0 ? 4 : 0)}%`
}

const sourceText = (s: string) => ({ cli: 'CLI', web: 'Web', feishu: '飞书', test: '测试' } as Record<string, string>)[s] || s
const statusTagType = (s: string) => ({ running: 'success', completed: 'info', failed: 'danger', cancelled: 'warning' } as Record<string, string>)[s] || 'info'
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">运行监控</h1>
      <div class="flex items-center gap-3">
        <el-radio-group v-model="days" size="small" @change="loadAll">
          <el-radio-button :value="7">近 7 天</el-radio-button>
          <el-radio-button :value="30">近 30 天</el-radio-button>
        </el-radio-group>
        <el-button size="small" :loading="loading" @click="loadAll">刷新</el-button>
      </div>
    </div>

    <el-alert v-if="errorMsg" :title="errorMsg" type="error" show-icon closable class="mb-4" />

    <div v-loading="loading">
      <!-- 状态卡 -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="card">
          <div class="flex items-center justify-between">
            <span class="text-gray-500 text-sm">Agent 状态</span>
            <el-tag :type="statusType" size="small">{{ statusText }}</el-tag>
          </div>
          <div class="text-2xl font-bold mt-2">{{ uptimeText }}</div>
          <div class="text-gray-400 text-xs mt-1">已运行时长</div>
        </div>
        <div class="card">
          <div class="text-gray-500 text-sm">今日工具调用</div>
          <div class="text-2xl font-bold mt-2 text-blue-500">{{ fmtNum(todayToolCalls) }}</div>
          <div class="text-gray-400 text-xs mt-1">错误 {{ fmtNum(todayErrors) }} 次</div>
        </div>
        <div class="card">
          <div class="text-gray-500 text-sm">今日 LLM 调用</div>
          <div class="text-2xl font-bold mt-2 text-green-500">{{ fmtNum(todayLlmCalls) }}</div>
          <div class="text-gray-400 text-xs mt-1">进程错误率 {{ errorRate }}</div>
        </div>
        <div class="card">
          <div class="text-gray-500 text-sm">今日 Token</div>
          <div class="text-2xl font-bold mt-2 text-orange-500">{{ fmtToken(todayTokens) }}</div>
          <div class="text-gray-400 text-xs mt-1">进程累计 {{ fmtToken(metrics?.counters?.tokens_total?.total) }}</div>
        </div>
      </div>

      <!-- 健康检查明细 -->
      <div class="card mb-6" v-if="healthChecks.length">
        <h2 class="text-lg font-semibold mb-3">依赖健康检查</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div v-for="c in healthChecks" :key="c.name" class="flex items-center justify-between border rounded-lg px-3 py-2">
            <div>
              <div class="text-sm font-medium">{{ c.name }}</div>
              <div class="text-xs text-gray-400 truncate max-w-[180px]" :title="c.detail">{{ c.detail }}</div>
            </div>
            <el-tag :type="c.status === 'ok' ? 'success' : 'danger'" size="small">
              {{ c.status === 'ok' ? '正常' : '异常' }}
            </el-tag>
          </div>
        </div>
      </div>

      <!-- 趋势图 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="card">
          <h2 class="text-lg font-semibold mb-4">工具 / LLM 调用趋势（{{ days }} 天）</h2>
          <div v-if="trendSeries.dates.length" class="flex items-end justify-between gap-2 h-40">
            <div v-for="(d, i) in trendSeries.dates" :key="d" class="flex-1 flex flex-col items-center gap-1">
              <div class="flex flex-col items-center justify-end w-full h-32 gap-0.5">
                <div class="w-4/5 rounded-t bg-blue-400" :style="{ height: barHeight(trendSeries.toolCalls, trendSeries.toolCalls[i]) }" :title="`工具调用 ${fmtNum(trendSeries.toolCalls[i])}`" />
                <div class="w-4/5 rounded-t bg-green-400" :style="{ height: barHeight(trendSeries.llmCalls, trendSeries.llmCalls[i]) }" :title="`LLM 调用 ${fmtNum(trendSeries.llmCalls[i])}`" />
              </div>
              <span class="text-xs text-gray-400">{{ d.slice(5) }}</span>
            </div>
          </div>
          <el-empty v-else description="暂无趋势数据" :image-size="60" />
          <div class="flex gap-4 mt-3 text-xs text-gray-500">
            <span><span class="inline-block w-2.5 h-2.5 rounded-sm bg-blue-400 mr-1" />工具调用</span>
            <span><span class="inline-block w-2.5 h-2.5 rounded-sm bg-green-400 mr-1" />LLM 调用</span>
          </div>
        </div>

        <div class="card">
          <h2 class="text-lg font-semibold mb-4">Token 消耗趋势（{{ days }} 天）</h2>
          <div v-if="trendSeries.dates.length" class="flex items-end justify-between gap-2 h-40">
            <div v-for="(d, i) in trendSeries.dates" :key="d" class="flex-1 flex flex-col items-center gap-1">
              <div class="flex items-end justify-center w-full h-32">
                <div class="w-4/5 rounded-t bg-orange-400" :style="{ height: barHeight(trendSeries.tokens, trendSeries.tokens[i]) }" :title="`Token ${fmtToken(trendSeries.tokens[i])}`" />
              </div>
              <span class="text-xs text-gray-400">{{ d.slice(5) }}</span>
            </div>
          </div>
          <el-empty v-else description="暂无趋势数据" :image-size="60" />
        </div>
      </div>

      <!-- 工具 TOP + LLM Provider -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="card">
          <h2 class="text-lg font-semibold mb-3">工具调用 TOP（本次运行）</h2>
          <el-table :data="toolTop" size="small" max-height="320">
            <el-table-column prop="tool" label="工具" min-width="160" />
            <el-table-column prop="calls" label="调用次数" width="120" align="right">
              <template #default="{ row }">{{ fmtNum(row.calls) }}</template>
            </el-table-column>
          </el-table>
        </div>
        <div class="card">
          <h2 class="text-lg font-semibold mb-3">LLM Provider 统计（本次运行）</h2>
          <el-table :data="llmProviders" size="small" max-height="320">
            <el-table-column prop="provider" label="Provider" min-width="160" />
            <el-table-column prop="calls" label="调用次数" width="120" align="right">
              <template #default="{ row }">{{ fmtNum(row.calls) }}</template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <!-- 最近会话 + 运行追踪 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card">
          <h2 class="text-lg font-semibold mb-3">最近会话</h2>
          <el-table :data="conversations.slice(0, 10)" size="small" max-height="320">
            <el-table-column prop="title" label="标题" min-width="140" show-overflow-tooltip />
            <el-table-column label="来源" width="70">
              <template #default="{ row }">{{ sourceText(row.source) }}</template>
            </el-table-column>
            <el-table-column label="消息数" width="80" align="right">
              <template #default="{ row }">{{ row.message_count }}</template>
            </el-table-column>
            <el-table-column label="Token" width="90" align="right">
              <template #default="{ row }">{{ fmtToken(row.total_tokens) }}</template>
            </el-table-column>
            <el-table-column label="时间" width="110">
              <template #default="{ row }">{{ fmtTime(row.created_at) }}</template>
            </el-table-column>
          </el-table>
        </div>
        <div class="card">
          <h2 class="text-lg font-semibold mb-3">最近运行追踪</h2>
          <el-table :data="runs" size="small" max-height="320">
            <el-table-column prop="user_input" label="用户输入" min-width="160" show-overflow-tooltip />
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="statusTagType(row.status)" size="small">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="工具数" width="70" align="right">
              <template #default="{ row }">{{ row.tool_count }}</template>
            </el-table-column>
            <el-table-column label="耗时" width="90">
              <template #default="{ row }">{{ fmtDuration(row.duration) }}</template>
            </el-table-column>
            <el-table-column label="时间" width="110">
              <template #default="{ row }">{{ fmtTime(row.started_at) }}</template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </div>
  </div>
</template>
