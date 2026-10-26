<script setup lang="ts">
import type { PageResult } from '~/types'
import type { InterviewQuestion } from '~/types/interview'
import { DIFFICULTY_LABEL, TYPE_LABEL, positionLabel } from '~/types/interview'
import { renderMarkdown } from '~/utils/markdown'

definePageMeta({ layout: 'workbench' })

const route = useRoute()
const authStore = useAuthStore()
const { get, post } = useApi()
const slug = computed(() => String(route.params.slug))

const { data, pending } = await useAsyncData(
  () => 'interview-question-' + slug.value,
  () => get<InterviewQuestion>('/api/interview/questions/' + slug.value),
  { default: () => null, watch: [slug] }
)
const question = computed(() => data.value?.data || null)

if (!pending.value && !question.value) {
  throw createError({ statusCode: 404, statusMessage: '题目不存在', fatal: true })
}

// 同岗位的其他题目（右栏「换一题」）
const { data: relatedData } = await useAsyncData(
  () => 'interview-related-' + slug.value,
  () =>
    get<PageResult<InterviewQuestion>>('/api/interview/questions', {
      position: question.value?.position || undefined,
      size: 6,
      sort: 'hot',
    }),
  { default: () => null, watch: [slug] }
)
const related = computed(() =>
  ((relatedData.value?.data as PageResult<InterviewQuestion>)?.records || [])
    .filter((item) => item.slug !== slug.value)
    .slice(0, 4)
)

const bodyHtml = computed(() => (question.value ? renderMarkdown(question.value.body || '') : ''))
const answerHtml = computed(() => (question.value ? renderMarkdown(question.value.answer || '') : ''))

const showAnswer = ref(false)
const markLevel = ref('')
const marking = ref(false)

watch(
  question,
  (value) => {
    markLevel.value = value?.markLevel || ''
    showAnswer.value = false
  },
  { immediate: true }
)

const mark = async (level: string) => {
  if (!question.value || marking.value) return
  marking.value = true
  try {
    const res = await post<InterviewQuestion>('/api/interview/questions/' + question.value.id + '/mark?level=' + level)
    markLevel.value = res.data?.markLevel || level
  } catch (e) {
    console.error(e)
  } finally {
    marking.value = false
  }
}

const typeLabel = computed(() => (question.value ? TYPE_LABEL[question.value.questionType] || question.value.questionType : ''))
const difficultyLabel = computed(() =>
  question.value?.difficulty ? DIFFICULTY_LABEL[question.value.difficulty] || '' : ''
)

useSeoMeta({
  title: () => (question.value ? question.value.title + ' · 面试题库' : '面试题'),
  description: () => (question.value?.body || '').slice(0, 120),
})
</script>

<template>
  <div v-if="question">
    <NuxtLink to="/interview" class="text-xs text-slate-400 hover:text-brand-600">← 返回题库</NuxtLink>

    <div class="mt-3 mb-4 flex flex-wrap items-center gap-2 text-[11px]">
      <span class="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">{{ typeLabel }}</span>
      <InterviewDifficultyBadge :level="question.difficulty" />
      <span class="text-slate-400">{{ positionLabel(question.position) }}<template v-if="question.round"> · {{ question.round }}</template></span>
      <span class="ml-auto text-slate-400">
        ★ {{ question.starCount }} · 浏览 {{ question.viewCount }}
        <template v-if="question.askedYear"> · {{ question.askedYear }} 年</template>
      </span>
    </div>

    <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div class="space-y-4">
        <article class="card">
          <h1 class="text-lg font-bold leading-snug text-slate-900">{{ question.title }}</h1>
          <div class="interview-md mt-3 text-sm leading-relaxed text-slate-700" v-html="bodyHtml" />
          <div v-if="question.tags?.length" class="mt-4 flex flex-wrap gap-1">
            <span v-for="tag in question.tags" :key="tag" class="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">{{ tag }}</span>
          </div>
        </article>

        <section class="card">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-sm font-semibold text-slate-900">参考答案</h2>
            <button
              v-if="question.answer"
              type="button"
              class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:border-brand-300 hover:text-brand-600"
              @click="showAnswer = !showAnswer"
            >{{ showAnswer ? '收起答案' : '显示答案' }}</button>
          </div>

          <template v-if="question.answer">
            <div v-if="showAnswer" class="interview-md mt-3 text-sm leading-relaxed text-slate-700" v-html="answerHtml" />
            <p v-else class="mt-2 text-xs text-slate-400">先自己想 30 秒再看答案，比直接读一遍有用得多。</p>
          </template>
          <p v-else class="mt-2 text-xs text-slate-400">这道题还没有参考答案，欢迎补充。</p>

          <div v-if="question.followUps?.length" class="mt-4 border-t border-slate-100 pt-3">
            <h3 class="text-xs font-semibold text-slate-900">追问链</h3>
            <ol class="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-500">
              <li v-for="(item, index) in question.followUps" :key="index">{{ index + 1 }}. {{ item }}</li>
            </ol>
          </div>

          <a
            v-if="question.sourceUrl"
            :href="question.sourceUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-4 inline-block text-[11px] text-slate-400 hover:text-brand-600"
          >出处：{{ question.sourceUrl }}</a>
        </section>
      </div>

      <aside class="space-y-4">
        <section class="bg-white rounded-xl border border-slate-200 p-4">
          <h2 class="text-sm font-semibold text-slate-900">掌握程度</h2>
          <template v-if="authStore.isLoggedIn">
            <p class="mt-1 text-[11px] text-slate-400">标记后用于个人复习（P2 上线复习计划）</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                class="interview-mark"
                :class="markLevel === 'mastered' ? 'interview-mark--on' : ''"
                :disabled="marking"
                @click="mark('mastered')"
              >已掌握</button>
              <button
                type="button"
                class="interview-mark"
                :class="markLevel === 'fuzzy' ? 'interview-mark--on' : ''"
                :disabled="marking"
                @click="mark('fuzzy')"
              >模糊</button>
              <button
                type="button"
                class="interview-mark"
                :class="markLevel === 'marked' ? 'interview-mark--on' : ''"
                :disabled="marking"
                @click="mark('marked')"
              >收藏</button>
            </div>
          </template>
          <p v-else class="mt-2 text-xs text-slate-400">
            <NuxtLink :to="'/login?redirect=' + encodeURIComponent(route.fullPath)" class="text-brand-600">登录</NuxtLink>
            后可标记掌握程度
          </p>
        </section>

        <section class="bg-white rounded-xl border border-slate-200 p-4 text-xs leading-relaxed text-slate-500">
          <h2 class="text-sm font-semibold text-slate-900 mb-2">这道题在考什么</h2>
          <p>{{ typeLabel }} · 难度 {{ question.difficulty }}/5 {{ difficultyLabel }}</p>
          <p class="mt-1">{{ positionLabel(question.position) }}<template v-if="question.round"> · {{ question.round }}</template></p>
        </section>

        <section class="bg-white rounded-xl border border-slate-200 p-4">
          <h2 class="text-sm font-semibold text-slate-900">换一题</h2>
          <ul class="mt-2 space-y-2">
            <li v-for="item in related" :key="item.id">
              <NuxtLink :to="'/interview/' + item.slug" class="block text-xs leading-relaxed text-slate-500 hover:text-brand-600">
                {{ item.title }}
              </NuxtLink>
            </li>
            <li v-if="!related.length" class="text-xs text-slate-400">同岗位暂无其他题目</li>
          </ul>
        </section>
      </aside>
    </div>
  </div>
</template>
