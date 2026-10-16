<script setup lang="ts">
import type { PageResult } from '~/types'
import type { InterviewCompany, InterviewQuestion } from '~/types/interview'
import { DIFFICULTY_LABEL, ROUND_OPTIONS, TYPE_LABEL, TYPE_ORDER, positionLabel } from '~/types/interview'

definePageMeta({ layout: 'workbench' })

const route = useRoute()
const router = useRouter()
const { get } = useApi()
const slug = computed(() => String(route.params.slug))

const { data, pending } = await useAsyncData(
  () => 'interview-company-' + slug.value,
  () => get<InterviewCompany>('/api/interview/companies/' + slug.value),
  { default: () => null, watch: [slug] }
)
const company = computed(() => data.value?.data || null)

if (!pending.value && !company.value) {
  throw createError({ statusCode: 404, statusMessage: '公司不存在', fatal: true })
}

const filters = computed(() => ({
  round: String(route.query.round || ''),
  difficulty: String(route.query.difficulty || ''),
  type: String(route.query.type || ''),
  page: Number(route.query.page || 1) || 1,
}))

const setQuery = (patch: Record<string, string | number>) => {
  const query: Record<string, string | number> = { ...route.query, ...patch }
  Object.keys(query).forEach((key) => {
    const value = query[key]
    if (value === '' || value === undefined || value === null || (key === 'page' && Number(value) === 1)) {
      delete query[key]
    }
  })
  router.push({ path: '/interview/companies/' + slug.value, query })
}

const onSelect = (event: Event, key: string) => {
  setQuery({ [key]: (event.target as HTMLSelectElement).value, page: 1 })
}

const pageSize = 10

const { data: questionData, pending: questionPending } = await useAsyncData(
  () => 'interview-company-questions|' + slug.value + '|' + JSON.stringify(filters.value),
  () =>
    get<PageResult<InterviewQuestion>>('/api/interview/questions', {
      companyId: company.value?.id,
      round: filters.value.round || undefined,
      difficulty: filters.value.difficulty || undefined,
      questionType: filters.value.type || undefined,
      page: filters.value.page,
      size: pageSize,
      sort: 'hot',
    }),
  { default: () => null, watch: [filters, slug] }
)

const questions = computed(() => questionData.value?.data?.records || [])
const total = computed(() => Number(questionData.value?.data?.total) || 0)
const totalPages = computed(() => Math.max(Math.ceil(total.value / pageSize), 1))

const pageLink = (target: number) => {
  const query: Record<string, string | number> = { ...route.query }
  if (target <= 1) {
    delete query.page
  } else {
    query.page = target
  }
  return { path: '/interview/companies/' + slug.value, query }
}

const meta = computed(() => {
  if (!company.value) return ''
  return [company.value.industry, company.value.scale].filter(Boolean).join(' · ')
})

useSeoMeta({
  title: () => (company.value ? company.value.name + ' · 面试题库' : '公司题库'),
  description: () => company.value?.intro || '按公司整理的面试题目聚合。',
})
</script>

<template>
  <div v-if="company">
    <NuxtLink to="/interview/companies" class="text-xs text-slate-400 hover:text-brand-600">← 返回公司库</NuxtLink>

    <div class="mt-3 mb-5 flex items-start gap-3">
      <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-base font-semibold text-slate-500">
        {{ company.name.slice(0, 1) }}
      </span>
      <div class="min-w-0">
        <h1 class="text-lg font-bold text-slate-900">{{ company.name }}</h1>
        <p class="mt-0.5 text-xs text-slate-400">{{ meta || '未填写行业信息' }} · 已发布 {{ company.questionCount || 0 }} 题</p>
        <p v-if="company.intro" class="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">{{ company.intro }}</p>
      </div>
    </div>

    <div class="card mb-5 flex flex-wrap items-center gap-2">
      <span class="text-xs text-slate-400">筛选</span>
      <select class="interview-select" :value="filters.round" @change="onSelect($event, 'round')">
        <option value="">全部轮次</option>
        <option v-for="item in ROUND_OPTIONS" :key="item" :value="item">{{ item }}</option>
      </select>
      <select class="interview-select" :value="filters.difficulty" @change="onSelect($event, 'difficulty')">
        <option value="">全部难度</option>
        <option v-for="level in [1, 2, 3, 4, 5]" :key="level" :value="String(level)">{{ level }}/5 {{ DIFFICULTY_LABEL[level] }}</option>
      </select>
      <select class="interview-select" :value="filters.type" @change="onSelect($event, 'type')">
        <option value="">全部题型</option>
        <option v-for="item in TYPE_ORDER" :key="item" :value="item">{{ TYPE_LABEL[item] }}</option>
      </select>
      <span class="ml-auto text-xs text-slate-400">命中 {{ total }} 题</span>
    </div>

    <div v-if="questionPending" class="space-y-3">
      <div v-for="i in 3" :key="i" class="card animate-pulse">
        <div class="h-3.5 w-2/3 rounded bg-slate-100" />
        <div class="mt-2 h-3 w-1/2 rounded bg-slate-100" />
      </div>
    </div>

    <div v-else-if="!questions.length" class="card py-10 text-center">
      <p class="text-sm text-slate-500">这家公司在当前条件下还没有题目</p>
      <p class="mt-1 text-xs text-slate-400">换个轮次或难度试试</p>
    </div>

    <div v-else class="space-y-3">
      <QuestionCard v-for="item in questions" :key="item.id" :question="item" />
    </div>

    <div v-if="totalPages > 1" class="mt-5 flex items-center justify-center gap-3">
      <NuxtLink
        v-if="filters.page > 1"
        :to="pageLink(filters.page - 1)"
        class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:border-brand-300 hover:text-brand-600"
      >上一页</NuxtLink>
      <span class="text-xs text-slate-400">{{ filters.page }} / {{ totalPages }}</span>
      <NuxtLink
        v-if="filters.page < totalPages"
        :to="pageLink(filters.page + 1)"
        class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:border-brand-300 hover:text-brand-600"
      >下一页</NuxtLink>
    </div>
  </div>
</template>
