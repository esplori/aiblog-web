<script setup lang="ts">
import type { ExamPaper, ExamResult, ExamQuestionItem } from '~/types/interview'

/**
 * 考场：倒计时 + 答题卡 + 交卷 → 成绩单
 */
definePageMeta({ layout: 'workbench' })

const route = useRoute()
const authStore = useAuthStore()
const { get, post } = useApi()
const examId = Number(route.params.id)

const paper = ref<ExamPaper | null>(null)
const result = ref<ExamResult | null>(null)
const loading = ref(true)
const submitting = ref(false)
const errorMessage = ref('')

const index = ref(0)
const answers = reactive<Record<number, string>>({})
const multiSel = reactive<Record<number, string[]>>({})
const remain = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const loginUrl = computed(() => '/login?redirect=' + encodeURIComponent('/interview/exams/' + examId))
const questions = computed<ExamQuestionItem[]>(() => paper.value?.questions || [])
const current = computed<ExamQuestionItem | null>(() => questions.value[index.value] || null)
const ongoing = computed(() => !result.value && paper.value?.status === 'ongoing')

const judgeOptions = [
  { key: 'T', text: '正确' },
  { key: 'F', text: '错误' },
]

const options = computed(() => {
  if (current.value?.questionKind === 'judge') return judgeOptions
  return current.value?.options || []
})

const answeredCount = computed(
  () => questions.value.filter((q) => String(answers[q.questionId] || '').trim().length > 0).length
)

const fmt = (s: number) => {
  const m = Math.floor(Math.max(0, s) / 60)
  const sec = Math.max(0, s) % 60
  return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0')
}

const pick = (q: ExamQuestionItem, key: string) => {
  if (!ongoing.value) return
  if (q.questionKind === 'multiple') {
    const cur = multiSel[q.questionId] || []
    const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]
    multiSel[q.questionId] = next
    answers[q.questionId] = [...next].sort().join(',')
  } else {
    answers[q.questionId] = key
  }
}

const isPicked = (q: ExamQuestionItem, key: string) =>
  q.questionKind === 'multiple' ? (multiSel[q.questionId] || []).includes(key) : answers[q.questionId] === key

const load = async () => {
  if (!authStore.isLoggedIn) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const res = await get<ExamPaper>('/api/interview/exams/' + examId)
    paper.value = res.data
    if (res.data?.status === 'submitted') {
      await loadResult()
    } else {
      remain.value = res.data?.remainingSeconds || 0
      startTimer()
    }
  } catch (e: any) {
    errorMessage.value = String(e?.data?.message || e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const loadResult = async () => {
  const res = await get<ExamResult>('/api/interview/exams/' + examId + '/result')
  result.value = res.data
  stopTimer()
}

const startTimer = () => {
  stopTimer()
  timer = setInterval(() => {
    remain.value -= 1
    if (remain.value <= 0) {
      stopTimer()
      void submit(true)
    }
  }, 1000)
}

const stopTimer = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

const submit = async (auto = false) => {
  if (submitting.value || result.value) return
  if (!auto && !confirm('确认交卷？交卷后不能再修改答案。')) return
  submitting.value = true
  try {
    const payload = {
      answers: questions.value.map((q) => ({ questionId: q.questionId, answer: answers[q.questionId] || '' })),
    }
    const res = await post<ExamResult>('/api/interview/exams/' + examId + '/submit', payload)
    result.value = res.data
    stopTimer()
  } catch (e: any) {
    errorMessage.value = String(e?.data?.message || e?.message || '交卷失败')
  } finally {
    submitting.value = false
  }
}

onMounted(load)
onBeforeUnmount(stopTimer)

useHead({ title: '模拟考试 · 答题' })
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <NuxtLink to="/interview/exams" class="text-xs text-slate-400 hover:text-brand-600">← 模拟考试</NuxtLink>

    <section v-if="!authStore.isLoggedIn" class="mt-6 rounded-xl border border-slate-200 bg-white p-10 text-center">
      <h1 class="text-base font-semibold text-slate-900">登录后参加考试</h1>
      <NuxtLink :to="loginUrl" class="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm text-white">去登录</NuxtLink>
    </section>

    <el-skeleton v-else-if="loading" class="mt-6" :rows="6" animated />

    <!-- 成绩单 -->
    <template v-else-if="result">
      <section class="mt-4 rounded-xl border border-slate-200 bg-white p-6">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p class="text-xs text-slate-400">{{ result.topicNames || result.title }}</p>
            <h1 class="mt-1 text-2xl font-semibold text-slate-900">
              {{ result.score }} <span class="text-sm font-normal text-slate-400">/ {{ result.totalPoints }} 分</span>
            </h1>
          </div>
          <span
            class="rounded-full px-3 py-1 text-xs"
            :class="result.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'"
          >{{ result.passed ? '及格' : '未及格' }} · 及格线 {{ result.passScore }}</span>
        </div>

        <div class="mt-4 grid grid-cols-3 gap-3 text-center text-xs text-slate-500">
          <div class="rounded-lg bg-slate-50 p-3">
            <p class="text-lg font-semibold text-slate-900">{{ result.accuracy }}%</p>
            <p class="mt-0.5">正确率</p>
          </div>
          <div class="rounded-lg bg-slate-50 p-3">
            <p class="text-lg font-semibold text-slate-900">{{ result.correctCount }}/{{ result.questionCount }}</p>
            <p class="mt-0.5">答对题数</p>
          </div>
          <div class="rounded-lg bg-slate-50 p-3">
            <p class="text-lg font-semibold text-slate-900">{{ fmt(result.elapsedSeconds || 0) }}</p>
            <p class="mt-0.5">用时</p>
          </div>
        </div>

        <div v-if="result.byTopic.length" class="mt-5">
          <p class="text-xs text-slate-400">主题得分</p>
          <div v-for="t in result.byTopic" :key="t.name" class="mt-2 flex items-center gap-3 text-xs text-slate-600">
            <span class="w-28 shrink-0 truncate">{{ t.name }}</span>
            <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div class="h-full rounded-full bg-brand-500" :style="{ width: (t.correct / Math.max(1, t.total)) * 100 + '%' }" />
            </div>
            <span class="w-12 shrink-0 text-right text-slate-400">{{ t.correct }}/{{ t.total }}</span>
          </div>
        </div>
      </section>

      <section v-if="result.wrongItems.length" class="mt-4">
        <h2 class="mb-2 text-sm font-semibold text-slate-900">错题（{{ result.wrongItems.length }}）</h2>
        <div class="space-y-2">
          <details v-for="w in result.wrongItems" :key="w.questionId" class="rounded-lg border border-slate-200 bg-white p-3">
            <summary class="cursor-pointer text-sm text-slate-800">{{ w.title }}</summary>
            <p class="mt-2 text-xs text-slate-500">你的答案：{{ w.userAnswer || '未作答' }} · 正确答案：{{ w.correctAnswer }}</p>
            <p v-if="w.explanation" class="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-600">{{ w.explanation }}</p>
          </details>
        </div>
      </section>

      <div class="mt-5 flex gap-2">
        <NuxtLink to="/interview/exams" class="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white">再考一场</NuxtLink>
        <NuxtLink to="/interview/topics" class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700">去刷题</NuxtLink>
      </div>
    </template>

    <!-- 答题 -->
    <template v-else-if="paper">
      <header class="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 class="text-lg font-semibold text-slate-900">{{ paper.title }}</h1>
          <p class="mt-0.5 text-xs text-slate-400">
            {{ paper.questionCount }} 题 · 共 {{ paper.totalPoints }} 分 · 已答 {{ answeredCount }}
          </p>
        </div>
        <div class="rounded-lg bg-slate-900 px-3 py-1.5 font-mono text-sm text-white">{{ fmt(remain) }}</div>
      </header>

      <article v-if="current" class="mt-4 rounded-xl border border-slate-200 bg-white p-5">
        <div class="mb-2 flex items-center gap-2 text-xs text-slate-400">
          <span>第 {{ index + 1 }} / {{ questions.length }} 题</span>
          <span>{{ current.questionKind === 'multiple' ? '多选' : current.questionKind === 'judge' ? '判断' : '单选' }}</span>
          <span>{{ current.points }} 分</span>
        </div>
        <h2 class="text-base font-semibold text-slate-900">{{ current.title }}</h2>
        <p v-if="current.body" class="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">{{ current.body }}</p>

        <div class="mt-4 space-y-2">
          <button
            v-for="opt in options"
            :key="opt.key"
            type="button"
            class="flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left text-sm transition"
            :class="isPicked(current, opt.key) ? 'border-brand-400 bg-brand-50 text-slate-900' : 'border-slate-200 text-slate-700 hover:border-brand-300'"
            @click="pick(current, opt.key)"
          >
            <span class="mt-0.5 font-mono text-xs text-slate-400">{{ opt.key }}</span>
            <span class="flex-1">{{ opt.text }}</span>
          </button>
        </div>
      </article>

      <div class="mt-4 flex flex-wrap items-center gap-2">
        <el-button :disabled="index === 0" @click="index -= 1">上一题</el-button>
        <el-button :disabled="index >= questions.length - 1" @click="index += 1">下一题</el-button>
        <button
          type="button"
          class="ml-auto rounded-lg bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          :disabled="submitting"
          @click="submit(false)"
        >{{ submitting ? '判分中…' : '交卷' }}</button>
      </div>

      <section class="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <p class="text-xs text-slate-400">答题卡</p>
        <div class="mt-2 flex flex-wrap gap-1.5">
          <button
            v-for="(q, i) in questions"
            :key="q.questionId"
            type="button"
            class="h-7 w-7 rounded text-xs transition"
            :class="[
              i === index ? 'ring-2 ring-brand-400' : '',
              String(answers[q.questionId] || '').trim() ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500',
            ]"
            @click="index = i"
          >{{ i + 1 }}</button>
        </div>
      </section>

      <p v-if="errorMessage" class="mt-3 text-xs text-red-600">{{ errorMessage }}</p>
    </template>
  </div>
</template>

