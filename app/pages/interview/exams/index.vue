<script setup lang="ts">
import type { ExamSummary, InterviewTopicNode } from '~/types/interview'
import { examStatusLabel } from '~/types/interview'

/**
 * 模拟考试入口：选主题 + 题量 + 时长 → 组卷 → 进考场
 */
definePageMeta({ layout: 'workbench' })

const authStore = useAuthStore()
const router = useRouter()
const { get, post } = useApi()

const loginUrl = computed(() => '/login?redirect=' + encodeURIComponent('/interview/exams'))

const topics = ref<InterviewTopicNode[]>([])
const exams = ref<ExamSummary[]>([])
const starting = ref(false)
const loading = ref(false)
const errorMessage = ref('')

const form = reactive({
  topicSlugs: [] as string[],
  questionCount: 10,
  durationMinutes: 30,
})

const COUNT_OPTIONS = [10, 20, 30]
const DURATION_OPTIONS = [15, 30, 60]

/** 所选主题下可用的客观题总数（用于提示题量是否够） */
const availableCount = computed(() => {
  if (!form.topicSlugs.length) {
    return topics.value.reduce((sum, t) => sum + (t.objectiveCount || 0), 0)
  }
  return topics.value
    .filter((t) => form.topicSlugs.includes(t.slug))
    .reduce((sum, t) => sum + (t.objectiveCount || 0), 0)
})

const enough = computed(() => availableCount.value >= Math.min(form.questionCount, 3))

const loadTopics = async () => {
  try {
    const res = await get<InterviewTopicNode[]>('/api/interview/topics')
    // 不过滤：有多少主题就显示多少（没有客观题的也列出来，组卷时后端会提示题量不足）
    topics.value = res.data || []
  } catch {
    topics.value = []
  }
}

const loadExams = async () => {
  if (!authStore.isLoggedIn) return
  loading.value = true
  try {
    const res = await get<ExamSummary[]>('/api/interview/exams')
    exams.value = res.data || []
  } catch {
    exams.value = []
  } finally {
    loading.value = false
  }
}

const start = async () => {
  if (!authStore.isLoggedIn) return
  starting.value = true
  errorMessage.value = ''
  try {
    const res = await post<{ id: number }>('/api/interview/exams', {
      topicSlugs: form.topicSlugs,
      questionCount: form.questionCount,
      durationMinutes: form.durationMinutes,
    })
    await router.push('/interview/exams/' + res.data.id)
  } catch (e: any) {
    errorMessage.value = String(e?.data?.message || e?.message || '创建失败，请稍后重试')
  } finally {
    starting.value = false
  }
}

onMounted(async () => {
  await loadTopics()
  await loadExams()
})

useHead({ title: '模拟考试 · 刷题' })
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <header class="mb-5">
      <p class="text-xs text-slate-400">刷题 · 考试</p>
      <h1 class="mt-1 text-2xl font-semibold text-slate-900">模拟考试</h1>
      <p class="mt-1.5 text-sm text-slate-500">按主题组卷，限时作答，交卷即时判分出成绩单。</p>
    </header>

    <section v-if="!authStore.isLoggedIn" class="rounded-xl border border-slate-200 bg-white p-10 text-center">
      <h2 class="text-base font-semibold text-slate-900">登录后开始模拟考试</h2>
      <p class="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">考试需要登录，才能保存你的作答与成绩单。</p>
      <NuxtLink :to="loginUrl" class="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700">
        去登录
      </NuxtLink>
    </section>

    <template v-else>
      <section class="rounded-xl border border-slate-200 bg-white p-5">
        <h2 class="text-sm font-semibold text-slate-900">组卷设置</h2>

        <p class="mt-3 text-xs text-slate-400">主题（可多选，不选 = 全部主题）</p>
        <el-select
          v-model="form.topicSlugs"
          multiple
          filterable
          collapse-tags
          collapse-tags-tooltip
          placeholder="选择主题（可不选 = 全部）"
          class="mt-2 w-full"
          :disabled="!topics.length"
        >
          <el-option
            v-for="t in topics"
            :key="t.slug"
            :label="t.name + '（' + t.questionCount + ' 题 / 客观题 ' + t.objectiveCount + '）'"
            :value="t.slug"
          />
        </el-select>

        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p class="text-xs text-slate-400">题量</p>
            <div class="mt-2 flex gap-2">
              <button
                v-for="n in COUNT_OPTIONS"
                :key="n"
                type="button"
                class="rounded-lg border px-3 py-1.5 text-sm transition"
                :class="form.questionCount === n ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:border-brand-300'"
                @click="form.questionCount = n"
              >
                {{ n }} 题
              </button>
            </div>
          </div>
          <div>
            <p class="text-xs text-slate-400">时长</p>
            <div class="mt-2 flex gap-2">
              <button
                v-for="m in DURATION_OPTIONS"
                :key="m"
                type="button"
                class="rounded-lg border px-3 py-1.5 text-sm transition"
                :class="form.durationMinutes === m ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:border-brand-300'"
                @click="form.durationMinutes = m"
              >
                {{ m }} 分钟
              </button>
            </div>
          </div>
        </div>

        <p class="mt-4 text-xs" :class="enough ? 'text-slate-400' : 'text-amber-600'">
          当前可选客观题 {{ availableCount }} 道{{ enough ? '' : '，题量太少，先补题或换主题' }}
        </p>
        <p v-if="errorMessage" class="mt-2 text-xs text-red-600">{{ errorMessage }}</p>

        <button
          type="button"
          class="mt-4 w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
          :disabled="starting || !enough"
          @click="start"
        >
          {{ starting ? '组卷中…' : '开始考试' }}
        </button>
      </section>

      <section class="mt-5">
        <h2 class="mb-2 text-sm font-semibold text-slate-900">我的考试</h2>
        <el-skeleton v-if="loading && !exams.length" :rows="3" animated />
        <div v-else-if="exams.length" class="space-y-2">
          <NuxtLink
            v-for="e in exams"
            :key="e.id"
            :to="'/interview/exams/' + e.id"
            class="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm transition hover:border-brand-300"
          >
            <div class="min-w-0">
              <p class="truncate font-medium text-slate-800">{{ e.title }}</p>
              <p class="mt-0.5 text-xs text-slate-400">
                {{ e.questionCount }} 题 · {{ examStatusLabel(e.status) }}
              </p>
            </div>
            <span class="shrink-0 text-xs" :class="e.status === 'submitted' ? 'text-slate-500' : 'text-brand-600'">
              {{ e.status === 'submitted' ? e.score + ' / ' + e.totalPoints + ' 分' : '继续答题 →' }}
            </span>
          </NuxtLink>
        </div>
        <p v-else class="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
          还没有考试记录，上面设置好就能开考。
        </p>
      </section>
    </template>
  </div>
</template>

