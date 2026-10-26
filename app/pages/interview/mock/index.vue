<script setup lang="ts">
import type { PageResult } from '~/types'
import type { MockSessionSummary } from '~/types/interview'
import {
  MOCK_DAILY_LIMIT,
  MOCK_MODE_LABEL,
  MOCK_QUESTION_COUNTS,
  MOCK_ROUND_OPTIONS,
  MOCK_STATUS_LABEL,
  POSITION_OPTIONS,
  positionLabel,
} from '~/types/interview'

// AI 模拟考试入口（P3）：配置一场 → 生成会话 → 进入房间
definePageMeta({ layout: 'workbench' })

const authStore = useAuthStore()
const router = useRouter()
const { get, post } = useApi()

const loginUrl = computed(() => '/login?redirect=' + encodeURIComponent('/interview/mock'))

const sessions = ref<MockSessionSummary[]>([])

const loading = ref(false)
const listLoading = ref(false)
const starting = ref(false)
const errorMessage = ref('')
const listError = ref('')
const startError = ref('')

const form = reactive({
  // 岗位是必填项：这里直接给默认值，避免「看着像选中了、其实提交了 null」导致接口 422
  position: POSITION_OPTIONS[0] as string,
  round: '',
  mode: 'bank',
  questionCount: 5,
})

/** 接口异常时给出友好提示：命中「今日已用完」类文案时不暴露技术细节 */
const friendlyStartError = (e: any): string => {
  const msg = String(e?.data?.message || e?.message || '')
  if (/上限|额度|用完|超出|limit|quota/i.test(msg)) {
    return `今日模拟场次已用完（每人每天最多 ${MOCK_DAILY_LIMIT} 场），明天再来吧。`
  }
  return msg || '创建失败，请稍后重试'
}

const loadSessions = async () => {
  if (!authStore.isLoggedIn) return
  listLoading.value = true
  listError.value = ''
  try {
    const res = await get<MockSessionSummary[] | PageResult<MockSessionSummary>>('/api/interview/sessions')
    const raw = res.data as any
    sessions.value = Array.isArray(raw) ? raw : raw?.records || []
  } catch (e: any) {
    listError.value = e?.data?.message || e?.message || '模拟记录加载失败'
  } finally {
    listLoading.value = false
  }
}

const load = async () => {
  if (!authStore.isLoggedIn) return
  loading.value = true
  errorMessage.value = ''
  try {
    await loadSessions()
  } catch (e: any) {
    errorMessage.value = e?.data?.message || e?.message || '数据加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

const start = async () => {
  if (starting.value) return
  // 双保险：即使 position 被清空也给出人话提示，而不是把 422 抛给用户
  if (!form.position) {
    startError.value = '请先选择目标岗位'
    return
  }
  starting.value = true
  startError.value = ''
  try {
    const res = await post<MockSessionSummary>('/api/interview/sessions', {
      position: form.position || null,
      round: form.round || null,
      mode: form.mode,
      questionCount: form.questionCount,
    })
    const session = res.data
    if (session?.id) {
      await router.push('/interview/mock/' + session.id)
    } else {
      startError.value = '创建成功但未返回会话 ID，请刷新后重试'
    }
  } catch (e: any) {
    startError.value = friendlyStartError(e)
  } finally {
    starting.value = false
  }
}

const statusTone = (status: string) => {
  if (status === 'done') return 'text-emerald-600'
  if (status === 'failed') return 'text-rose-600'
  if (status === 'ongoing' || status === 'scoring' || status === 'created') return 'text-brand-600'
  return 'text-slate-500'
}

const formatTime = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16).replace('T', ' ')
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

onMounted(() => {
  load()
})

useSeoMeta({
  title: '模拟考试 · 刷题',
  description: '选择岗位与轮次，进行一场 AI 模拟考试并获取评分报告。',
})
</script>

<template>
  <div>
    <!-- 未登录：不调接口，只显示引导 -->
    <section v-if="!authStore.isLoggedIn" class="card mx-auto max-w-xl py-10 text-center">
      <h1 class="text-lg font-bold text-slate-900">登录后开始 AI 模拟考试</h1>
      <p class="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
        选择岗位与轮次，AI 会逐题出题并评分，最后给出准确性与改进建议。
      </p>
      <NuxtLink
        :to="loginUrl"
        class="mt-5 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
      >去登录</NuxtLink>
    </section>

    <template v-else>
      <!-- 加载骨架 -->
      <div v-if="loading" class="space-y-5">
        <div class="card">
          <div class="h-4 w-32 rounded bg-slate-100" />
          <div class="mt-4 h-10 w-full rounded bg-slate-100" />
          <div class="mt-3 h-10 w-full rounded bg-slate-100" />
        </div>
        <div class="card">
          <div class="h-4 w-24 rounded bg-slate-100" />
          <div class="mt-3 h-3 w-2/3 rounded bg-slate-100" />
        </div>
      </div>

      <section v-else-if="errorMessage" class="card py-10 text-center">
        <p class="text-sm text-slate-500">{{ errorMessage }}</p>
        <button
          type="button"
          class="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:border-brand-300 hover:text-brand-600"
          @click="load"
        >重试</button>
      </section>

      <div v-else class="space-y-5">
        <!-- 配置卡 -->
        <section class="card">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 class="text-base font-bold text-slate-900">开始一场模拟</h1>
              <p class="mt-1 text-xs text-slate-500">配置面试信息，生成后逐题作答，交卷由 AI 评分。</p>
            </div>
            <p class="text-[11px] text-slate-400">每人每天最多 {{ MOCK_DAILY_LIMIT }} 场</p>
          </div>

          <form class="mt-4 space-y-4" @submit.prevent="start">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label class="block">
                <span class="text-xs font-medium text-slate-500">岗位</span>
                <select v-model="form.position" class="interview-select mt-1 w-full">
                  <option value="">不限</option>
                  <option v-for="p in POSITION_OPTIONS" :key="p" :value="p">{{ positionLabel(p) }}</option>
                </select>
              </label>

              <label class="block">
                <span class="text-xs font-medium text-slate-500">轮次</span>
                <select v-model="form.round" class="interview-select mt-1 w-full">
                  <option value="">不限</option>
                  <option v-for="r in MOCK_ROUND_OPTIONS" :key="r" :value="r">{{ r }}</option>
                </select>
              </label>
            </div>

            <!-- 出题方式：两个可选卡片 -->
            <div>
              <span class="text-xs font-medium text-slate-500">出题方式</span>
              <div class="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  class="rounded-xl border p-3 text-left transition-colors"
                  :class="form.mode === 'bank' ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:border-brand-300'"
                  @click="form.mode = 'bank'"
                >
                  <span class="block text-sm font-semibold" :class="form.mode === 'bank' ? 'text-brand-700' : 'text-slate-900'">题库抽题</span>
                  <span class="mt-1 block text-[11px] leading-relaxed text-slate-500">从真实面经题库中抽取，秒级生成，题目稳定可复盘。</span>
                </button>
                <button
                  type="button"
                  class="rounded-xl border p-3 text-left transition-colors"
                  :class="form.mode === 'ai' ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:border-brand-300'"
                  @click="form.mode = 'ai'"
                >
                  <span class="block text-sm font-semibold" :class="form.mode === 'ai' ? 'text-brand-700' : 'text-slate-900'">AI 出题</span>
                  <span class="mt-1 block text-[11px] leading-relaxed text-slate-500">按岗位 + 轮次定制生成，需要几十秒；期间可离开页面，稍后回来查看。</span>
                </button>
              </div>
            </div>

            <!-- 题量 -->
            <div>
              <span class="text-xs font-medium text-slate-500">题量</span>
              <div class="mt-2 flex flex-wrap gap-2">
                <button
                  v-for="n in MOCK_QUESTION_COUNTS"
                  :key="n"
                  type="button"
                  class="rounded-lg border px-4 py-1.5 text-sm transition-colors"
                  :class="form.questionCount === n ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-700 hover:border-brand-300 hover:text-brand-600'"
                  @click="form.questionCount = n"
                >{{ n }} 题</button>
              </div>
            </div>

            <p v-if="startError" class="text-xs text-rose-600">{{ startError }}</p>

            <button
              type="submit"
              class="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-60"
              :disabled="starting"
            >{{ starting ? '创建中…' : '开始模拟考试' }}</button>
          </form>
        </section>

        <!-- 我的模拟记录 -->
        <section class="card">
          <h2 class="text-sm font-semibold text-slate-900">我的模拟记录</h2>

          <div v-if="listLoading" class="mt-3 space-y-2">
            <div v-for="i in 3" :key="i" class="h-12 rounded-lg bg-slate-100" />
          </div>

          <p v-else-if="listError" class="mt-3 text-xs text-rose-600">{{ listError }}</p>

          <p v-else-if="!sessions.length" class="mt-3 rounded-lg border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">
            还没有模拟记录，配置一场开始吧
          </p>

          <ul v-else class="mt-3 divide-y divide-slate-100">
            <li v-for="s in sessions" :key="s.id">
              <NuxtLink
                :to="'/interview/mock/' + s.id"
                class="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 transition-colors hover:text-brand-600"
              >
                <span class="text-xs text-slate-400">{{ formatTime(s.createdAt) }}</span>
                <span class="text-xs text-slate-500">{{ s.position ? positionLabel(s.position) : '不限岗位' }}</span>
                <span v-if="s.round" class="text-xs text-slate-400">{{ s.round }}</span>
                <span class="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">{{ MOCK_MODE_LABEL[s.mode] || s.mode }}</span>
                <span class="text-[11px]" :class="statusTone(s.status)">{{ MOCK_STATUS_LABEL[s.status] || s.status }}</span>
                <span class="ml-auto text-xs text-slate-500">
                  <template v-if="s.status === 'done' && s.score != null">得分 {{ s.score }}</template>
                  <template v-else>{{ s.answeredCount ?? 0 }}/{{ s.questionCount ?? 0 }} 题</template>
                </span>
              </NuxtLink>
            </li>
          </ul>
        </section>
      </div>
    </template>
  </div>
</template>
