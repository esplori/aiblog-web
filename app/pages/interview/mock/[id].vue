<script setup lang="ts">
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { RadarChart } from 'echarts/charts'
import { RadarComponent, TooltipComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import type { MockAnswer, MockQuestion, MockSessionDetail } from '~/types/interview'
import {
  MOCK_DIMENSION_ORDER,
  MOCK_MODE_LABEL,
  MOCK_STATUS_LABEL,
  positionLabel,
} from '~/types/interview'
import { renderMarkdown } from '~/utils/markdown'

// 模拟考试房间（P3）：created(出题) / ongoing(作答) / scoring(评分) / done(报告) / failed
definePageMeta({ layout: 'workbench' })

use([CanvasRenderer, RadarChart, TooltipComponent, RadarComponent])

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const site = useSiteConfig()
const { get, post } = useApi()

const id = computed(() => String(route.params.id))
const loginUrl = computed(() => '/login?redirect=' + encodeURIComponent('/interview/mock/' + id.value))

const detail = ref<MockSessionDetail | null>(null)
const loading = ref(false)
const errorMessage = ref('')
const actionError = ref('')
const pollTimedOut = ref(false)

const status = computed(() => detail.value?.status || '')
const questions = computed<MockQuestion[]>(() => detail.value?.questions || [])

const answerMap = computed<Record<number, MockAnswer>>(() => {
  const map: Record<number, MockAnswer> = {}
  for (const a of detail.value?.answers || []) map[a.seq] = a
  return map
})

const currentSeq = ref(0)
const drafts = reactive<Record<number, string>>({})
const savingSeq = ref(0)
const submitting = ref(false)

const currentIndex = computed(() => questions.value.findIndex((q) => q.seq === currentSeq.value))
const currentQuestion = computed<MockQuestion | null>(() => {
  if (!questions.value.length) return null
  return questions.value[currentIndex.value] || questions.value[0]
})
const isLast = computed(() => currentIndex.value === questions.value.length - 1)
const isFirst = computed(() => currentIndex.value <= 0)

const answeredCount = computed(
  () =>
    questions.value.filter(
      (q) => (drafts[q.seq] || '').trim() || (answerMap.value[q.seq]?.answerText || '').trim()
    ).length
)

const currentBodyHtml = computed(() =>
  currentQuestion.value?.body ? renderMarkdown(currentQuestion.value.body) : ''
)

/** 题干到达后补齐草稿：已答过的回填答案，未答的初始化空串 */
watch(
  () => detail.value?.questions,
  () => {
    if (currentSeq.value === 0 && questions.value.length) currentSeq.value = questions.value[0].seq
    for (const q of questions.value) {
      if (drafts[q.seq] === undefined) drafts[q.seq] = answerMap.value[q.seq]?.answerText || ''
    }
    if (
      currentSeq.value &&
      !questions.value.some((q) => q.seq === currentSeq.value) &&
      questions.value.length
    ) {
      currentSeq.value = questions.value[0].seq
    }
  },
  { immediate: true }
)

/* ----------------------------- 轮询（生成 / 评分） ----------------------------- */
const POLL_INTERVAL = 3000
const GEN_TIMEOUT = 5 * 60 * 1000
const SCORE_TIMEOUT = 10 * 60 * 1000

let timer: ReturnType<typeof setTimeout> | null = null
let phaseStart = 0

const stopPolling = () => {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

const load = async (silent = false): Promise<string> => {
  if (!silent) loading.value = true
  try {
    const res = await get<MockSessionDetail>('/api/interview/sessions/' + id.value)
    const next = res.data || null
    const prevStatus = detail.value?.status
    detail.value = next
    errorMessage.value = ''
    if (!next) return ''
    // 状态切换时重置计时，让「生成 5 分钟 / 评分 10 分钟」各自独立
    if (next.status !== prevStatus) {
      phaseStart = Date.now()
      pollTimedOut.value = false
    }
    return next.status
  } catch (e: any) {
    if (!silent) errorMessage.value = e?.data?.message || e?.message || '会话加载失败，请稍后重试'
    return detail.value?.status || ''
  } finally {
    if (!silent) loading.value = false
  }
}

const schedulePoll = () => {
  stopPolling()
  timer = setTimeout(async () => {
    const s = await load(true)
    if (s !== 'created' && s !== 'scoring') return
    const limit = s === 'created' ? GEN_TIMEOUT : SCORE_TIMEOUT
    if (!phaseStart) phaseStart = Date.now()
    if (Date.now() - phaseStart > limit) {
      pollTimedOut.value = true
      return
    }
    schedulePoll()
  }, POLL_INTERVAL)
}

const ensurePolling = (s: string) => {
  if (s === 'created' || s === 'scoring') {
    if (!phaseStart) phaseStart = Date.now()
    schedulePoll()
  }
}

/* --------------------------------- 作答 --------------------------------- */
const moveTo = (seq: number) => {
  currentSeq.value = seq
  actionError.value = ''
}

const saveAnswer = async (silent = false): Promise<boolean> => {
  const q = currentQuestion.value
  if (!q) return false
  const text = (drafts[q.seq] || '').trim()
  if (!text) {
    if (!silent) ElMessage.warning('请先作答再保存')
    return false
  }
  savingSeq.value = q.seq
  if (!silent) actionError.value = ''
  try {
    await post('/api/interview/sessions/' + id.value + '/answers', { seq: q.seq, answerText: text })
    const list = detail.value?.answers ? [...detail.value.answers] : []
    const idx = list.findIndex((a) => a.seq === q.seq)
    const next: MockAnswer = { seq: q.seq, answerText: text }
    if (idx >= 0) list[idx] = { ...list[idx], ...next }
    else list.push(next)
    if (detail.value) detail.value.answers = list
    if (!silent) ElMessage.success('已保存')
    return true
  } catch (e: any) {
    actionError.value = e?.data?.message || e?.message || '保存失败，请稍后重试'
    return false
  } finally {
    savingSeq.value = 0
  }
}

const goPrev = () => {
  if (isFirst.value) return
  moveTo(questions.value[currentIndex.value - 1].seq)
}

const goNext = async () => {
  const q = currentQuestion.value
  if (q && (drafts[q.seq] || '').trim()) await saveAnswer(true)
  if (!isLast.value) moveTo(questions.value[currentIndex.value + 1].seq)
}

const submit = async () => {
  if (submitting.value) return
  const q = currentQuestion.value
  if (q && (drafts[q.seq] || '').trim()) await saveAnswer(true)
  try {
    await ElMessageBox.confirm('交卷后不可再修改答案，确定提交吗？', '确认交卷', {
      type: 'warning',
      confirmButtonText: '提交交卷',
      cancelButtonText: '再检查一下',
    })
  } catch {
    return
  }
  submitting.value = true
  actionError.value = ''
  try {
    await post('/api/interview/sessions/' + id.value + '/submit')
    const s = await load(true)
    ensurePolling(s)
  } catch (e: any) {
    actionError.value = e?.data?.message || e?.message || '交卷失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}

/* -------------------------------- 报告视图 -------------------------------- */
const report = computed(() => detail.value?.report || null)

const radarOption = computed(() => {
  const dims = report.value?.dimensions
  const brand = site.brandColor || '#2563eb'
  return {
    radar: {
      indicator: MOCK_DIMENSION_ORDER.map((d) => ({ name: d.label, max: 100 })),
      radius: '62%',
      axisName: { color: '#64748b', fontSize: 11 },
      splitLine: { lineStyle: { color: '#e2e8f0' } },
      splitArea: { areaStyle: { color: ['#ffffff', '#f8fafc'] } },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
    },
    series: [
      {
        type: 'radar',
        symbolSize: 5,
        data: [
          {
            value: MOCK_DIMENSION_ORDER.map((d) => Number(dims?.[d.key] ?? 0)),
            name: '维度得分',
            areaStyle: { color: brand, opacity: 0.18 },
            lineStyle: { color: brand, width: 2 },
            itemStyle: { color: brand },
          },
        ],
      },
    ],
  }
})

const suggestionList = computed<string[]>(() => {
  const s = report.value?.suggestions
  if (!s) return []
  if (Array.isArray(s)) return s.filter(Boolean).map((t) => String(t))
  return String(s)
    .split(/\n+/)
    .map((t) => t.trim())
    .filter(Boolean)
})

/** 逐题报告：后端 items 只有评分类字段，题干补自 detail.questions */
const reportItems = computed(() => {
  const items = report.value?.items
  if (items?.length) {
    return items.map((it) => {
      const q = questions.value.find((x) => x.seq === it.seq)
      return {
        seq: it.seq,
        title: it.title || q?.title || `第 ${it.seq} 题`,
        body: q?.body || '',
        answerText: it.answerText || answerMap.value[it.seq]?.answerText || '',
        score: it.score,
        feedback: it.feedback || '',
      }
    })
  }
  return questions.value.map((q) => ({
    seq: q.seq,
    title: q.title,
    body: q.body || '',
    answerText: answerMap.value[q.seq]?.answerText || '',
    score: answerMap.value[q.seq]?.score ?? null,
    feedback: answerMap.value[q.seq]?.feedback || '',
  }))
})

/* ---------------------------------- 其他 ---------------------------------- */
const statusTone = (s: string) => {
  if (s === 'done') return 'text-emerald-600'
  if (s === 'failed') return 'text-rose-600'
  if (s === 'created' || s === 'ongoing' || s === 'scoring') return 'text-brand-600'
  return 'text-slate-500'
}

const formatTime = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16).replace('T', ' ')
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const restart = () => {
  router.push('/interview/mock')
}

onMounted(async () => {
  if (!authStore.isLoggedIn) return
  const s = await load()
  ensurePolling(s)
})

onUnmounted(stopPolling)

useSeoMeta({
  title: '模拟考试 · 刷题',
  description: 'AI 模拟考试作答与评分报告。',
})
</script>

<template>
  <div>
    <!-- 未登录 -->
    <section v-if="!authStore.isLoggedIn" class="card mx-auto max-w-xl py-10 text-center">
      <h1 class="text-lg font-bold text-slate-900">登录后参加模拟考试</h1>
      <p class="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">模拟考试需要登录才能保存你的作答与生成评分报告。</p>
      <NuxtLink :to="loginUrl" class="mt-5 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700">去登录</NuxtLink>
    </section>

    <template v-else>
      <!-- 首次加载骨架 -->
      <div v-if="loading && !detail" class="space-y-4">
        <div class="card">
          <div class="h-4 w-40 rounded bg-slate-100" />
          <div class="mt-3 h-3 w-2/3 rounded bg-slate-100" />
        </div>
        <div class="card">
          <div class="h-4 w-24 rounded bg-slate-100" />
          <div class="mt-3 h-24 w-full rounded bg-slate-100" />
        </div>
      </div>

      <!-- 加载失败 / 会话不存在 -->
      <section v-else-if="!detail" class="card py-10 text-center">
        <p class="text-sm text-slate-500">{{ errorMessage || '会话不存在或无权访问' }}</p>
        <div class="mt-4 flex justify-center gap-2">
          <button type="button" class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:border-brand-300 hover:text-brand-600" @click="load()">重试</button>
          <NuxtLink to="/interview/mock" class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:border-brand-300 hover:text-brand-600">返回列表</NuxtLink>
        </div>
      </section>

      <div v-else class="space-y-5">
        <!-- 会话概要 -->
        <section class="card">
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 class="text-base font-bold text-slate-900">模拟面试</h1>
            <span class="text-xs text-slate-500">{{ detail.position ? positionLabel(detail.position) : '不限岗位' }}</span>
            <span v-if="detail.round" class="text-xs text-slate-400">{{ detail.round }}</span>
            <span class="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">{{ MOCK_MODE_LABEL[detail.mode] || detail.mode }}</span>
            <span class="rounded-full px-2 py-0.5 text-[11px]" :class="statusTone(status)">{{ MOCK_STATUS_LABEL[status] || status }}</span>
            <span class="ml-auto text-[11px] text-slate-400">{{ formatTime(detail.createdAt) }}</span>
          </div>
          <p v-if="detail.questionCount" class="mt-2 text-[11px] text-slate-400">共 {{ detail.questionCount }} 题</p>
        </section>

        <!-- created：AI 出题中 -->
        <section v-if="status === 'created'" class="card py-12 text-center">
          <div class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600" />
          <p class="text-sm font-medium text-slate-900">AI 正在为你出题…</p>
          <p class="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
            通常需要几十秒。期间可以离开本页，稍后回来即可继续；页面每 3 秒自动刷新。
          </p>
          <p v-if="pollTimedOut" class="mt-4 text-xs text-rose-600">生成等待超过 5 分钟，可能出了点问题。</p>
          <button v-if="pollTimedOut" type="button" class="mt-3 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:border-brand-300 hover:text-brand-600" @click="load()">手动刷新</button>
        </section>

        <!-- ongoing：答题 -->
        <section v-else-if="status === 'ongoing'" class="space-y-4">
          <div v-if="!questions.length" class="card py-10 text-center text-sm text-slate-500">题目加载中，请稍候…</div>

          <template v-else>
            <!-- 题号进度 -->
            <div class="card">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <p class="text-sm font-medium text-slate-900">第 {{ currentIndex + 1 }} / {{ questions.length }} 题</p>
                <p class="text-[11px] text-slate-400">已作答 {{ answeredCount }} / {{ questions.length }}</p>
              </div>
              <div class="mt-3 flex flex-wrap gap-2">
                <button
                  v-for="(q, i) in questions"
                  :key="q.seq"
                  type="button"
                  class="h-8 w-8 rounded-lg border text-xs transition-colors"
                  :class="[
                    q.seq === currentSeq ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:border-brand-300',
                    (drafts[q.seq] || '').trim() && q.seq !== currentSeq ? 'text-brand-600' : '',
                  ]"
                  @click="moveTo(q.seq)"
                >{{ i + 1 }}</button>
              </div>
            </div>

            <!-- 题干 -->
            <div class="card">
              <h2 class="text-sm font-semibold text-slate-900">{{ currentQuestion?.title || `第 ${currentSeq} 题` }}</h2>
              <div v-if="currentBodyHtml" class="interview-md mt-3 text-sm leading-relaxed text-slate-600" v-html="currentBodyHtml" />
              <p v-else class="mt-3 text-xs text-slate-400">本题无补充描述</p>
            </div>

            <!-- 作答 -->
            <div class="card">
              <label class="block">
                <span class="text-xs font-medium text-slate-500">你的作答</span>
                <textarea
                  v-model="drafts[currentSeq]"
                  rows="8"
                  class="mt-2 w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-700 outline-none transition-colors focus:border-brand-400"
                  placeholder="尽量结构化作答：先给结论，再说思路与细节…"
                />
              </label>

              <p v-if="actionError" class="mt-2 text-xs text-rose-600">{{ actionError }}</p>

              <div class="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:border-brand-300 hover:text-brand-600 disabled:opacity-50" :disabled="isFirst" @click="goPrev">上一题</button>
                <button type="button" class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:border-brand-300 hover:text-brand-600 disabled:opacity-60" :disabled="savingSeq === currentSeq" @click="saveAnswer(false)">{{ savingSeq === currentSeq ? '保存中…' : '保存' }}</button>
                <button v-if="!isLast" type="button" class="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700" @click="goNext">下一题</button>
                <button v-else type="button" class="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-60" :disabled="submitting" @click="submit">{{ submitting ? '提交中…' : '交卷' }}</button>
              </div>
            </div>
          </template>
        </section>

        <!-- scoring：评分中 -->
        <section v-else-if="status === 'scoring'" class="card py-12 text-center">
          <div class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600" />
          <p class="text-sm font-medium text-slate-900">AI 正在逐题评分…</p>
          <p class="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">通常 1 分钟内完成，页面每 3 秒自动刷新，可以稍等片刻。</p>
          <p v-if="pollTimedOut" class="mt-4 text-xs text-rose-600">评分等待超过 10 分钟，可稍后手动刷新查看。</p>
          <button v-if="pollTimedOut" type="button" class="mt-3 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:border-brand-300 hover:text-brand-600" @click="load()">手动刷新</button>
        </section>

        <!-- done：评分报告 -->
        <template v-else-if="status === 'done'">
          <section class="card">
            <div class="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
              <div class="text-center md:text-left">
                <p class="text-xs text-slate-400">总分</p>
                <p class="mt-1 text-5xl font-bold leading-none text-slate-900">{{ report?.overallScore ?? detail.score ?? '—' }}</p>
                <p class="mt-2 text-xs text-slate-500">满分 100，四维维度分见右侧雷达图</p>
                <div class="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 md:justify-start">
                  <span v-for="d in MOCK_DIMENSION_ORDER" :key="d.key" class="text-xs text-slate-500">
                    {{ d.label }} <span class="font-semibold text-slate-900">{{ report?.dimensions?.[d.key] ?? '—' }}</span>
                  </span>
                </div>
              </div>
              <div class="h-[260px] w-full">
                <VChart v-if="report" :option="radarOption" autoresize style="height: 100%; width: 100%" />
              </div>
            </div>
          </section>

          <section v-if="suggestionList.length" class="card">
            <h2 class="text-sm font-semibold text-slate-900">总评与建议</h2>
            <ul class="mt-3 space-y-2">
              <li v-for="(s, i) in suggestionList" :key="i" class="flex gap-2 text-sm leading-relaxed text-slate-600">
                <span class="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                <span>{{ s }}</span>
              </li>
            </ul>
          </section>

          <section v-if="reportItems.length" class="space-y-4">
            <h2 class="px-1 text-sm font-semibold text-slate-900">逐题回顾</h2>
            <article v-for="item in reportItems" :key="item.seq" class="card">
              <div class="flex items-start justify-between gap-3">
                <h3 class="text-sm font-semibold text-slate-900">第 {{ item.seq }} 题 · {{ item.title }}</h3>
                <span class="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] text-brand-700">得分 {{ item.score ?? '—' }}</span>
              </div>
              <p v-if="item.answerText" class="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">{{ item.answerText }}</p>
              <p v-else class="mt-3 text-xs text-slate-400">本题未作答</p>
              <div v-if="item.feedback" class="mt-3 border-t border-slate-100 pt-3">
                <p class="text-[11px] font-medium text-slate-400">AI 反馈</p>
                <p class="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{{ item.feedback }}</p>
              </div>
            </article>
          </section>

          <div class="flex flex-wrap gap-2">
            <button type="button" class="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700" @click="restart">再来一场</button>
            <NuxtLink to="/interview/topics" class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:border-brand-300 hover:text-brand-600">去刷题</NuxtLink>
          </div>
        </template>

        <!-- failed -->
        <section v-else-if="status === 'failed'" class="card py-10 text-center">
          <p class="text-sm font-medium text-slate-900">这场模拟没有顺利完成</p>
          <p class="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">生成或评分过程中断，请重新开始一场。</p>
          <button type="button" class="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700" @click="restart">重新开始一场</button>
        </section>

        <!-- 未知状态兜底 -->
        <section v-else class="card py-10 text-center">
          <p class="text-sm text-slate-500">当前状态：{{ status || '未知' }}</p>
          <button type="button" class="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:border-brand-300 hover:text-brand-600" @click="load()">刷新</button>
        </section>
      </div>
    </template>
  </div>
</template>
