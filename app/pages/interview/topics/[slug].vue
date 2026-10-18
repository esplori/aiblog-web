<script setup lang="ts">
/**
 * 主题练习页（P1）：逐题作答 → 客观题服务端判分 → 答错自动入复习卡
 * 主观题只给参考答案（不自动判分）
 */
definePageMeta({ layout: 'workbench' })

interface Topic {
  id: number
  slug: string
  name: string
  description?: string | null
  questionCount: number
  objectiveCount: number
}
interface Option { key: string; text: string }
interface PracticeQuestion {
  id: number
  slug: string
  title: string
  body?: string | null
  questionKind: string
  difficulty?: number | null
  points?: number
  options: Option[]
}
interface GradeResult {
  graded: boolean
  correct?: boolean
  correctAnswer?: string
  explanation?: string
  referenceAnswer?: string
  addedToReview?: boolean
}

const route = useRoute()
const slug = String(route.params.slug)
const { get, post } = useApi()

const { data: topicData } = await useAsyncData('topic-' + slug, () => get<Topic>('/api/interview/topics/' + slug))
const { data: qData, pending } = await useAsyncData('topic-q-' + slug, () =>
  get<{ records: PracticeQuestion[]; total: number }>('/api/interview/topics/' + slug + '/questions', { page: 1, size: 20 })
)

const topic = computed<Topic | null>(() => topicData.value?.data || null)
const questions = computed<PracticeQuestion[]>(() => qData.value?.data?.records || [])

const index = ref(0)
const draft = ref('')
const multi = ref<string[]>([])
const result = ref<GradeResult | null>(null)
const submitting = ref(false)
const stat = reactive({ done: 0, correct: 0, wrong: 0 })

const current = computed<PracticeQuestion | null>(() => questions.value[index.value] || null)
const isObjective = computed(() => !!current.value && current.value.questionKind !== 'subjective')
const isMulti = computed(() => current.value?.questionKind === 'multiple')
const isJudge = computed(() => current.value?.questionKind === 'judge')

const judgeOptions: Option[] = [
  { key: 'T', text: '正确' },
  { key: 'F', text: '错误' },
]

const options = computed<Option[]>(() => {
  if (isJudge.value) return judgeOptions
  return current.value?.options || []
})

const canSubmit = computed(() => (isMulti.value ? multi.value.length > 0 : draft.value.trim().length > 0))

const pick = (key: string) => {
  if (result.value) return
  if (isMulti.value) {
    multi.value = multi.value.includes(key) ? multi.value.filter((k) => k !== key) : [...multi.value, key]
  } else {
    draft.value = key
  }
}

const answerOf = () => (isMulti.value ? [...multi.value].sort().join(',') : draft.value)

const submit = async () => {
  if (!current.value || submitting.value) return
  submitting.value = true
  try {
    const res = await post<GradeResult>('/api/interview/topics/practice/grade', {
      questionId: current.value.id,
      answer: answerOf(),
    })
    result.value = res.data
    if (res.data?.graded) {
      stat.done += 1
      if (res.data.correct) stat.correct += 1
      else stat.wrong += 1
    }
  } finally {
    submitting.value = false
  }
}

const reveal = async () => {
  if (!current.value) return
  const res = await post<GradeResult>('/api/interview/topics/practice/grade', { questionId: current.value.id, answer: '' })
  result.value = res.data
}

const next = () => {
  if (index.value < questions.value.length - 1) {
    index.value += 1
    draft.value = ''
    multi.value = []
    result.value = null
  }
}

const prev = () => {
  if (index.value > 0) {
    index.value -= 1
    draft.value = ''
    multi.value = []
    result.value = null
  }
}

const restart = () => {
  index.value = 0
  draft.value = ''
  multi.value = []
  result.value = null
  Object.assign(stat, { done: 0, correct: 0, wrong: 0 })
}

useHead({ title: (topic.value?.name || '主题练习') + ' · 刷题' })
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <NuxtLink to="/interview/topics" class="text-xs text-slate-400 hover:text-brand-600">← 全部主题</NuxtLink>

    <header class="mt-2 mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold text-slate-900">{{ topic?.name || '主题练习' }}</h1>
        <p class="mt-1 text-sm text-slate-500">{{ topic?.description || '逐题作答，客观题即时判分' }}</p>
      </div>
      <div class="text-xs text-slate-400">
        已答 {{ stat.done }} · 正确 {{ stat.correct }} · 错误 {{ stat.wrong }}
      </div>
    </header>

    <el-skeleton v-if="pending && !questions.length" :rows="6" animated />

    <template v-else-if="questions.length">
      <div class="mb-3 flex items-center gap-2 text-xs text-slate-400">
        <span>第 {{ index + 1 }} / {{ questions.length }} 题</span>
        <span>· 难度 {{ current?.difficulty || 3 }}</span>
        <span v-if="current?.questionKind !== 'subjective'">· {{ isMulti ? '多选题' : isJudge ? '判断题' : '单选题' }}</span>
      </div>

      <article class="rounded-xl border border-slate-200 bg-white p-5">
        <h2 class="text-base font-semibold text-slate-900">{{ current?.title }}</h2>
        <p v-if="current?.body" class="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">{{ current.body }}</p>

        <!-- 客观题选项 -->
        <div v-if="isObjective" class="mt-4 space-y-2">
          <button
            v-for="opt in options"
            :key="opt.key"
            type="button"
            class="flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left text-sm transition"
            :class="[
              (isMulti ? multi.includes(opt.key) : draft === opt.key)
                ? 'border-brand-400 bg-brand-50 text-slate-900'
                : 'border-slate-200 text-slate-700 hover:border-brand-300',
              result && result.graded && result.correctAnswer && result.correctAnswer.split(',').map((s: string) => s.trim()).includes(opt.key)
                ? 'ring-2 ring-green-300'
                : '',
            ]"
            @click="pick(opt.key)"
          >
            <span class="mt-0.5 font-mono text-xs text-slate-400">{{ opt.key }}</span>
            <span class="flex-1">{{ opt.text }}</span>
          </button>
        </div>

        <!-- 主观题输入 -->
        <div v-else class="mt-4">
          <textarea
            v-model="draft"
            rows="5"
            placeholder="写下你的思路要点，提交后可对照参考答案"
            class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:bg-white"
          />
        </div>

        <!-- 判分反馈 -->
        <div v-if="result" class="mt-4 rounded-lg border p-3 text-sm"
          :class="result.graded ? (result.correct ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-700') : 'border-slate-200 bg-slate-50 text-slate-600'">
          <p v-if="result.graded" class="font-medium">
            {{ result.correct ? '✅ 回答正确' : '❌ 回答错误，正确答案：' + (result.correctAnswer || '-') }}
          </p>
          <p v-else class="font-medium">参考答案</p>
          <p v-if="result.explanation" class="mt-1 whitespace-pre-line leading-relaxed">{{ result.explanation }}</p>
          <p v-if="!result.graded && result.referenceAnswer" class="mt-1 whitespace-pre-line leading-relaxed">{{ result.referenceAnswer }}</p>
        </div>

        <div class="mt-5 flex flex-wrap items-center gap-2">
          <el-button v-if="!result && isObjective" type="primary" :disabled="!canSubmit" :loading="submitting" @click="submit">
            提交答案
          </el-button>
          <el-button v-if="!result && !isObjective" @click="reveal">看参考答案</el-button>
          <el-button :disabled="index === 0" @click="prev">上一题</el-button>
          <el-button :disabled="index >= questions.length - 1" @click="next">下一题</el-button>
        </div>
      </article>

      <div v-if="stat.done && index >= questions.length - 1" class="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        本轮完成：{{ stat.done }} 题，正确 {{ stat.correct }} 题（{{ Math.round((stat.correct / stat.done) * 100) }}%）。
        <button type="button" class="ml-2 text-brand-600 hover:underline" @click="restart">重练</button>
      </div>
    </template>

    <p v-else class="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
      这个主题下还没有题目。
    </p>
  </div>
</template>

