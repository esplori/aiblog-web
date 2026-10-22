<script setup lang="ts">
import type { FinSummary, FinTrade } from '~/types/finance'

definePageMeta({ layout: 'workbench' })

const authStore = useAuthStore()
const { get, post, del } = useApi()

const loginUrl = computed(() => '/login?redirect=' + encodeURIComponent('/finance'))

const summary = ref<FinSummary | null>(null)
const trades = ref<FinTrade[]>([])
const loading = ref(false)
const message = ref('')

const tradeOpen = ref(false)
const watchOpen = ref(false)
const saving = ref(false)
const tradeForm = reactive({ symbol: '', side: 'BUY', price: '', shares: '', fee: '', occurredOn: '', note: '' })
const watchForm = reactive({ symbol: '', targetPrice: '', note: '' })

const fmt = (n?: number, digits = 2) =>
  n === null || n === undefined ? '--' : Number(n).toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits })
const signClass = (n?: number) => (n === undefined || n === null ? 'text-slate-500' : n > 0 ? 'text-rose-600' : n < 0 ? 'text-emerald-600' : 'text-slate-500')
const signText = (n?: number) => (n === undefined || n === null ? '--' : (n > 0 ? '+' : '') + fmt(n))

async function load() {
  if (!authStore.isLoggedIn) return
  loading.value = true
  try {
    const [s, t] = await Promise.all([
      get<FinSummary>('/api/finance/summary'),
      get<FinTrade[]>('/api/finance/trades'),
    ])
    if (s.code === 200) summary.value = s.data
    if (t.code === 200) trades.value = t.data || []
  } catch (e) {
    message.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => authStore.isLoggedIn, load)

function openTrade(item?: { symbol: string; name?: string }) {
  tradeForm.symbol = item?.symbol || ''
  tradeForm.side = 'BUY'
  tradeForm.price = ''
  tradeForm.shares = ''
  tradeForm.fee = ''
  tradeForm.occurredOn = new Date().toISOString().slice(0, 10)
  tradeForm.note = ''
  tradeOpen.value = true
}

async function submitTrade() {
  if (!tradeForm.symbol || !tradeForm.price || !tradeForm.shares) {
    message.value = '代码、价格、股数都要填'
    return
  }
  saving.value = true
  message.value = ''
  try {
    const res = await post('/api/finance/trades', {
      symbol: tradeForm.symbol,
      side: tradeForm.side,
      price: Number(tradeForm.price),
      shares: Number(tradeForm.shares),
      fee: tradeForm.fee ? Number(tradeForm.fee) : 0,
      occurredOn: tradeForm.occurredOn || undefined,
      note: tradeForm.note || undefined,
    })
    if (res.code !== 200) throw new Error(res.message || '保存失败')
    tradeOpen.value = false
    await load()
  } catch (e) {
    message.value = e instanceof Error ? e.message : '保存失败'
  } finally {
    saving.value = false
  }
}

async function submitWatch() {
  if (!watchForm.symbol) {
    message.value = '股票代码不能为空'
    return
  }
  saving.value = true
  message.value = ''
  try {
    const res = await post('/api/finance/watchlist', {
      symbol: watchForm.symbol,
      targetPrice: watchForm.targetPrice ? Number(watchForm.targetPrice) : undefined,
      note: watchForm.note || undefined,
    })
    if (res.code !== 200) throw new Error(res.message || '保存失败')
    watchOpen.value = false
    watchForm.symbol = ''
    watchForm.targetPrice = ''
    watchForm.note = ''
    await load()
  } catch (e) {
    message.value = e instanceof Error ? e.message : '保存失败'
  } finally {
    saving.value = false
  }
}

async function removeWatch(id: number) {
  await del('/api/finance/watchlist/' + id)
  await load()
}

async function removeTrade(id: number) {
  if (!confirm('删除这条成交记录？')) return
  await del('/api/finance/trades/' + id)
  await load()
}
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <header class="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="text-xs text-slate-400">股票 · 持仓</p>
        <h1 class="mt-1 text-2xl font-semibold text-slate-900">我的持仓</h1>
        <p class="mt-1.5 text-sm text-slate-500">记录每笔买卖，自动算成本与盈亏，收盘后生成当日汇总。</p>
      </div>
      <div v-if="authStore.isLoggedIn" class="flex gap-2">
        <button class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:border-brand-300" @click="watchOpen = true">
          加自选
        </button>
        <button class="rounded-lg bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700" @click="openTrade()">
          记一笔买卖
        </button>
      </div>
    </header>

    <section v-if="!authStore.isLoggedIn" class="rounded-xl border border-slate-200 bg-white p-10 text-center">
      <h2 class="text-base font-semibold text-slate-900">登录后查看持仓</h2>
      <p class="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">持仓与成交记录按账号隔离，登录后才能记账。</p>
      <NuxtLink :to="loginUrl" class="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700">去登录</NuxtLink>
    </section>

    <template v-else>
      <p v-if="message" class="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{{ message }}</p>

      <section class="grid gap-3 sm:grid-cols-4">
        <div class="rounded-xl border border-slate-200 bg-white p-4">
          <p class="text-xs text-slate-400">总市值</p>
          <p class="mt-1 text-xl font-semibold text-slate-900">{{ fmt(summary?.marketValue) }}</p>
          <p class="mt-1 text-[11px] text-slate-400">成本 {{ fmt(summary?.cost) }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4">
          <p class="text-xs text-slate-400">今日盈亏</p>
          <p class="mt-1 text-xl font-semibold" :class="signClass(summary?.dayPnl)">{{ signText(summary?.dayPnl) }}</p>
          <p class="mt-1 text-[11px]" :class="signClass(summary?.dayPnlPct)">{{ signText(summary?.dayPnlPct) }}%</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4">
          <p class="text-xs text-slate-400">累计浮盈</p>
          <p class="mt-1 text-xl font-semibold" :class="signClass(summary?.pnl)">{{ signText(summary?.pnl) }}</p>
          <p class="mt-1 text-[11px]" :class="signClass(summary?.pnlPct)">{{ signText(summary?.pnlPct) }}%</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4">
          <p class="text-xs text-slate-400">持仓数</p>
          <p class="mt-1 text-xl font-semibold text-slate-900">{{ summary?.positions?.length || 0 }}</p>
          <p class="mt-1 text-[11px] text-slate-400">自选 {{ summary?.watchlist?.length || 0 }}</p>
        </div>
      </section>

      <section v-if="summary?.advice?.length" class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <h2 class="text-sm font-semibold text-amber-800">决策提示</h2>
        <ul class="mt-2 space-y-1 text-xs leading-relaxed text-amber-700">
          <li v-for="(a, i) in summary.advice" :key="i">· {{ a }}</li>
        </ul>
      </section>

      <section class="mt-4 rounded-xl border border-slate-200 bg-white">
        <div class="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 class="text-sm font-semibold text-slate-900">持仓</h2>
          <span v-if="loading" class="text-xs text-slate-400">加载中…</span>
        </div>
        <div v-if="!summary?.positions?.length" class="px-5 py-8 text-center text-xs text-slate-400">
          还没有持仓记录，点右上角「记一笔买卖」开始。
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th class="px-4 py-2 text-left font-medium">标的</th>
                <th class="px-4 py-2 text-right font-medium">股数</th>
                <th class="px-4 py-2 text-right font-medium">成本</th>
                <th class="px-4 py-2 text-right font-medium">现价</th>
                <th class="px-4 py-2 text-right font-medium">市值</th>
                <th class="px-4 py-2 text-right font-medium">浮盈</th>
                <th class="px-4 py-2 text-right font-medium">今日</th>
                <th class="px-4 py-2 text-right font-medium">仓位</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in summary.positions" :key="p.symbol" class="border-t border-slate-100">
                <td class="px-4 py-2">
                  <p class="font-medium text-slate-800">{{ p.name || p.symbol }}</p>
                  <p class="text-[11px] text-slate-400">{{ p.symbol }}</p>
                </td>
                <td class="px-4 py-2 text-right text-slate-600">{{ p.shares }}</td>
                <td class="px-4 py-2 text-right text-slate-600">{{ fmt(p.avgCost, 3) }}</td>
                <td class="px-4 py-2 text-right text-slate-800">{{ fmt(p.price, 3) }}</td>
                <td class="px-4 py-2 text-right text-slate-600">{{ fmt(p.marketValue) }}</td>
                <td class="px-4 py-2 text-right" :class="signClass(p.pnl)">
                  {{ signText(p.pnl) }}
                  <span class="block text-[11px]">{{ signText(p.pnlPct) }}%</span>
                </td>
                <td class="px-4 py-2 text-right" :class="signClass(p.dayPnl)">{{ signText(p.dayPnl) }}</td>
                <td class="px-4 py-2 text-right text-slate-500">{{ fmt(p.weight, 1) }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="mt-4 rounded-xl border border-slate-200 bg-white">
        <div class="border-b border-slate-100 px-5 py-3">
          <h2 class="text-sm font-semibold text-slate-900">自选</h2>
        </div>
        <div v-if="!summary?.watchlist?.length" class="px-5 py-8 text-center text-xs text-slate-400">
          还没有自选，点右上角「加自选」。
        </div>
        <ul v-else class="divide-y divide-slate-100">
          <li v-for="w in summary.watchlist" :key="w.id" class="flex items-center justify-between px-5 py-3">
            <div>
              <p class="text-sm font-medium text-slate-800">
                {{ w.name || w.symbol }}
                <span class="ml-1 text-[11px] text-slate-400">{{ w.symbol }}</span>
                <span v-if="w.held" class="ml-1 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] text-brand-600">已持仓</span>
              </p>
              <p class="mt-0.5 text-[11px] text-slate-400">
                {{ w.note || '—' }}
                <span v-if="w.targetPrice"> · 目标价 {{ fmt(w.targetPrice, 3) }}</span>
              </p>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm text-slate-800">{{ fmt(w.price, 3) }}</span>
              <span class="text-xs" :class="signClass(w.changePct)">{{ signText(w.changePct) }}%</span>
              <button class="text-xs text-slate-400 hover:text-rose-500" @click="removeWatch(w.id)">删除</button>
            </div>
          </li>
        </ul>
      </section>

      <section class="mt-4 rounded-xl border border-slate-200 bg-white">
        <div class="border-b border-slate-100 px-5 py-3">
          <h2 class="text-sm font-semibold text-slate-900">成交记录</h2>
        </div>
        <div v-if="!trades.length" class="px-5 py-8 text-center text-xs text-slate-400">暂无记录。</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th class="px-4 py-2 text-left font-medium">日期</th>
                <th class="px-4 py-2 text-left font-medium">标的</th>
                <th class="px-4 py-2 text-left font-medium">方向</th>
                <th class="px-4 py-2 text-right font-medium">价格</th>
                <th class="px-4 py-2 text-right font-medium">股数</th>
                <th class="px-4 py-2 text-right font-medium">金额</th>
                <th class="px-4 py-2 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in trades" :key="t.id" class="border-t border-slate-100">
                <td class="px-4 py-2 text-slate-500">{{ t.occurredOn }}</td>
                <td class="px-4 py-2">
                  <span class="font-medium text-slate-800">{{ t.name || t.symbol }}</span>
                  <span class="ml-1 text-[11px] text-slate-400">{{ t.symbol }}</span>
                </td>
                <td class="px-4 py-2">
                  <span class="rounded px-1.5 py-0.5 text-[11px]" :class="t.side === 'BUY' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'">
                    {{ t.side === 'BUY' ? '买入' : '卖出' }}
                  </span>
                </td>
                <td class="px-4 py-2 text-right text-slate-600">{{ fmt(t.price, 3) }}</td>
                <td class="px-4 py-2 text-right text-slate-600">{{ t.shares }}</td>
                <td class="px-4 py-2 text-right text-slate-600">{{ fmt(t.amount) }}</td>
                <td class="px-4 py-2 text-right">
                  <button class="text-xs text-slate-400 hover:text-rose-500" @click="removeTrade(t.id)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <el-dialog v-model="tradeOpen" title="记一笔买卖" width="420px">
      <div class="space-y-3">
        <div>
          <p class="text-xs text-slate-400">股票代码（如 600036）</p>
          <el-input v-model="tradeForm.symbol" placeholder="600036" class="mt-1" />
        </div>
        <div>
          <p class="text-xs text-slate-400">方向</p>
          <el-radio-group v-model="tradeForm.side" class="mt-1">
            <el-radio-button value="BUY">买入</el-radio-button>
            <el-radio-button value="SELL">卖出</el-radio-button>
          </el-radio-group>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <p class="text-xs text-slate-400">成交价</p>
            <el-input v-model="tradeForm.price" type="number" class="mt-1" />
          </div>
          <div>
            <p class="text-xs text-slate-400">股数</p>
            <el-input v-model="tradeForm.shares" type="number" class="mt-1" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <p class="text-xs text-slate-400">手续费</p>
            <el-input v-model="tradeForm.fee" type="number" class="mt-1" />
          </div>
          <div>
            <p class="text-xs text-slate-400">成交日</p>
            <el-input v-model="tradeForm.occurredOn" type="date" class="mt-1" />
          </div>
        </div>
        <div>
          <p class="text-xs text-slate-400">备注</p>
          <el-input v-model="tradeForm.note" class="mt-1" />
        </div>
      </div>
      <template #footer>
        <button class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600" @click="tradeOpen = false">取消</button>
        <button class="ml-2 rounded-lg bg-brand-600 px-3 py-1.5 text-sm text-white disabled:opacity-60" :disabled="saving" @click="submitTrade">
          保存
        </button>
      </template>
    </el-dialog>

    <el-dialog v-model="watchOpen" title="加自选" width="380px">
      <div class="space-y-3">
        <div>
          <p class="text-xs text-slate-400">股票代码</p>
          <el-input v-model="watchForm.symbol" placeholder="600036" class="mt-1" />
        </div>
        <div>
          <p class="text-xs text-slate-400">目标价（可选）</p>
          <el-input v-model="watchForm.targetPrice" type="number" class="mt-1" />
        </div>
        <div>
          <p class="text-xs text-slate-400">备注（可选）</p>
          <el-input v-model="watchForm.note" class="mt-1" />
        </div>
      </div>
      <template #footer>
        <button class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600" @click="watchOpen = false">取消</button>
        <button class="ml-2 rounded-lg bg-brand-600 px-3 py-1.5 text-sm text-white disabled:opacity-60" :disabled="saving" @click="submitWatch">
          保存
        </button>
      </template>
    </el-dialog>
  </div>
</template>
