<script setup lang="ts">
import type { InterviewQuestion, ReviewCard, ReviewDueResponse, ReviewResult, ReviewStats } from '~/types/interview'
import { REVIEW_INTERVALS, positionLabel } from '~/types/interview'
import { renderMarkdown } from '~/utils/markdown'

// 今日复习（P2）：SRS 到期卡片，三键反馈后自动切下一张
definePageMeta({ layout: 'workbench' })

const authStore = useAuthStore()
const { get, post } = useApi()

const loginUrl = computed(() => '/login?redirect=' + encodeURIComponent('/interview/review'))

const loading = ref(false)
const errorMessage = ref('')
const gradeError = ref('')

const stats = ref<ReviewStats | null>(null)
const cards = ref<ReviewCard[]>([])
const dueTotal = ref(0)
const index = ref(0)

const current = computed<ReviewCard | null>(() => cards.value[index.value] || null)
const reviewedCount = computed(() => Math.min(index.value, cards.value.length))
const finished = computed(() => cards.value.length > 0 && index.value >= cards.value.length)
const isEmptyToday = computed(() => !loading.value && !errorMessage.value && dueTotal.value === 0)

const answerHtml = ref('')
const answerLoading = ref(false)
const showAnswer = ref(false)
const grading = ref(false)

const load = async () => {
  if (!authStore.isLoggedIn) return
  loading.value = true
  errorMessage.value = ''
  gradeError.value = ''
  try {
    const [statsRes, dueRes] = await Promise.all([
      get<ReviewStats>('/api/interview/review/stats'),
      get<ReviewDueResponse>('/api/interview/review/due'),
    ])
    stats.value = statsRes.data || null
    cards.value = dueRes.data?.cards || []
    dueTotal.value = Number(dueRes.data?.dueTotal ?? cards.value.length) || 0
    index.value = 0
  } catch (e: any) {
    errorMessage.value = e?.data?.message || e?.message || '复习数据加载失败，请稍后重试'
    cards.value = []
    dueTotal.value = 0
  } finally {
    loading.value = false
  }
}

/** 题干里的答案不在 ReviewCard 上，切卡时按 slug 拉详情拿 answer */
const loadAnswer = async (card: ReviewCard | null) => {
  showAnswer.value = false
  answerHtml.value = ''
  if (!card) return
  answerLoading.value = true
  try {
    const res = await get<InterviewQuestion>('/api/interview/questions/' + card.slug)
    answerHtml.value = renderMarkdown(res.data?.answer || '')
  } catch {
    answerHtml.value = ''
  } finally {
    answerLoading.value = false
  }
}

watch(
  () => current.value?.questionId,
  () => loadAnswer(current.value)
)

const stageText = (stage: number) => {
  const days = REVIEW_INTERVALS[Math.min(Math.max(Number(stage) || 0, 0), REVIEW_INTERVALS.length - 1)]
  return `第 ${(Number(stage) || 0) + 1} 档 · ${days} 天`
}

const grade = async (result: ReviewResult) => {
  const card = current.value
  if (!card || grading.value) return
  grading.value = true
  gradeError.value = ''
  try {
    await post(`/api/interview/review/${card.questionId}/grade`, { result })
    index.value += 1
  } catch (e: any) {
    gradeError.value = e?.data?.message || e?.message || '提交失败，请重试'
  } finally {
    grading.value = false
  }
}

// 键盘快捷键：1 不会 / 2 模糊 / 3 会
const onKeydown = (event: KeyboardEvent) => {
  if (!authStore.isLoggedIn || !current.value || grading.value) return
  if (event.metaKey || event.ctrlKey || event.altKey) return
  const map: Record<string, ReviewResult> = { '1': 'unknown', '2': 'fuzzy', '3': 'known' }
  const result = map[event.key]
  if (!result) return
  event.preventDefault()
  grade(result)
}

onMounted(() => {
  load()
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})

useSeoMeta({
  title: '今日复习 · 面试',
  description: '按记忆曲线复习面试题，三键反馈记录掌握程度。',
})
</script>

<template>
  <div>
    <!-- 未登录：不调接口，只显示引导 -->
    <section v-if="!authStore.isLoggedIn" class="card mx-auto max-w-xl py-10 text-center">
      <h1 class="text-lg font-bold text-slate-900">登录后开始今日复习</h1>
      <p class="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
        复习卡按 1/2/4/7/15/30 天的间隔出现。登录后即可查看今天到期的题目，并用「不会 / 模糊 / 会」三键记录掌握程度。
      </p>
      <NuxtLink
        :to="loginUrl"
        class="mt-5 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
      >去登录</NuxtLink>
    </section>

    <template v-else>
      <!-- 统计条 -->
      <section class="card mb-5">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p class="text-xl font-bold text-slate-900">{{ dueTotal }}</p>
            <p class="mt-0.5 text-[11px] text-slate-400">今日待复习</p>
          </div>
          <div>
            <p class="text-xl font-bold text-slate-900">{{ stats?.dueWeek ?? 0 }}</p>
            <p class="mt-0.5 text-[11px] text-slate-400">本周到期</p>
          </div>
          <div>
            <p class="text-xl font-bold text-slate-900">{{ stats?.cardTotal ?? 0 }}</p>
            <p class="mt-0.5 text-[11px] text-slate-400">卡片总数</p>
          </div>
          <div>
            <p class="text-xl font-bold text-slate-900">{{ stats?.mastered ?? 0 }}</p>
            <p class="mt-0.5 text-[11px] text-slate-400">已掌握</p>
          </div>
        </div>
      </section>

      <!-- 加载骨架 -->
      <div v-if="loading" class="card">
        <div class="h-3 w-24 rounded bg-slate-100" />
        <div class="mt-3 h-5 w-3/4 rounded bg-slate-100" />
        <div class="mt-4 h-3 w-full rounded bg-slate-100" />
      </div>

      <!-- 接口失败 -->
      <section v-else-if="errorMessage" class="card py-10 text-center">
        <p class="text-sm text-slate-500">{{ errorMessage }}</p>
        <button
          type="button"
          class="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:border-brand-300 hover:text-brand-600"
          @click="load"
        >重试</button>
      </section>

      <!-- 今日无到期 -->
      <section v-else-if="isEmptyToday" class="card py-10 text-center">
        <p class="text-sm text-slate-500">今天没有到期卡片</p>
        <p class="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-400">
          在题目详情点「标记掌握」或备战台加入卡片后，会按 1/2/4/7/15/30 天间隔出现。
        </p>
        <NuxtLink
          to="/interview/plan"
          class="mt-4 inline-block rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:border-brand-300 hover:text-brand-600"
        >去备战台</NuxtLink>
      </section>

      <!-- 全部完成 -->
      <section v-else-if="finished" class="card py-10 text-center">
        <p class="text-sm font-semibold text-slate-900">今日复习完成 🎉</p>
        <p class="mt-2 text-xs leading-relaxed text-slate-500">本次共复习 {{ reviewedCount }} 张卡片。</p>
        <p class="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-400">
          按反馈结果，下一次到期会落在 1/2/4/7/15/30 天的节奏里<template v-if="stats?.dueWeek">，本周还有 {{ stats.dueWeek }} 张到期</template>。
        </p>
        <NuxtLink
          to="/interview/plan"
          class="mt-4 inline-block rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:border-brand-300 hover:text-brand-600"
        >返回备战台</NuxtLink>
      </section>

      <!-- 复习卡 -->
      <section v-else-if="current" class="mx-auto max-w-2xl">
        <p class="mb-2 text-[11px] text-slate-400">
          第 {{ index + 1 }} / {{ cards.length }} 张<template v-if="dueTotal > cards.length"> · 今日共 {{ dueTotal }} 张</template>
        </p>
        <article class="card">
          <div class="flex flex-wrap items-center gap-2 text-[11px]">
            <span v-if="current.companyName" class="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">{{ current.companyName }}</span>
            <span class="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">{{ positionLabel(current.position) }}</span>
            <InterviewDifficultyBadge :level="current.difficulty" />
            <span class="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">{{ stageText(current.stage) }}</span>
            <span v-if="current.lapses" class="text-slate-400">卡壳 {{ current.lapses }} 次</span>
          </div>

          <h1 class="mt-3 text-lg font-bold leading-snug text-slate-900">{{ current.title }}</h1>

          <div v-if="showAnswer" class="mt-4 border-t border-slate-200 pt-4">
            <p v-if="answerLoading" class="text-xs text-slate-400">答案加载中…</p>
            <div v-else-if="answerHtml" class="interview-md text-sm leading-relaxed text-slate-700" v-html="answerHtml" />
            <p v-else class="text-xs text-slate-400">这道题还没有答案，先自己讲一遍再自评。</p>
          </div>

          <button
            v-if="!showAnswer"
            type="button"
            class="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:border-brand-300 hover:text-brand-600"
            @click="showAnswer = true"
          >查看答案</button>

          <p v-if="gradeError" class="mt-3 text-xs text-rose-600">{{ gradeError }}</p>

          <div class="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 transition-colors hover:border-rose-300 disabled:opacity-60"
              :disabled="grading"
              @click="grade('unknown')"
            >不会 <span class="text-[11px] text-rose-400">1</span></button>
            <button
              type="button"
              class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700 transition-colors hover:border-amber-300 disabled:opacity-60"
              :disabled="grading"
              @click="grade('fuzzy')"
            >模糊 <span class="text-[11px] text-amber-400">2</span></button>
            <button
              type="button"
              class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 transition-colors hover:border-emerald-300 disabled:opacity-60"
              :disabled="grading"
              @click="grade('known')"
            >会 <span class="text-[11px] text-emerald-400">3</span></button>
          </div>
        </article>
      </section>
    </template>
  </div>
</template>
