<script setup lang="ts">
import type { PageResult } from '~/types'
import type { InterviewCompany, InterviewQuestion, InterviewStats } from '~/types/interview'
import { DIFFICULTY_LABEL, KIND_FILTER_OPTIONS, questionKindLabel } from '~/types/interview'

// 面试题库：公开可读（未登录也能看），沿用工作台外壳
definePageMeta({ layout: 'workbench' })

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { get } = useApi()

const filters = computed(() => ({
  // 主题化后：主题（topicId）+ 题型（客观/主观）+ 难度 + 排序 + 关键词
  topic: String(route.query.topic || ''),
  kind: String(route.query.kind || ''),
  difficulty: String(route.query.difficulty || ''),
  sort: String(route.query.sort || 'hot'),
  keyword: String(route.query.keyword || ''),
  page: Number(route.query.page || 1) || 1,
}))

const keywordInput = ref(filters.value.keyword)
watch(
  () => filters.value.keyword,
  (v) => {
    keywordInput.value = v
  }
)

const hasFilter = computed(
  () => !!(filters.value.topic || filters.value.kind || filters.value.difficulty || filters.value.keyword)
)

/** 筛选一律走 query，保证 SSR / 分享链接 / 后退都一致 */
const setQuery = (patch: Record<string, string | number>) => {
  const query: Record<string, string | number> = { ...route.query, ...patch }
  Object.keys(query).forEach((key) => {
    const value = query[key]
    if (value === '' || value === undefined || value === null || (key === 'page' && Number(value) === 1)) {
      delete query[key]
    }
  })
  router.push({ path: '/interview', query })
}

const onSelect = (event: Event, key: string) => {
  const value = (event.target as HTMLSelectElement).value
  setQuery({ [key]: value, page: 1 })
}

const pageSize = 12

const { data, pending } = await useAsyncData(
  () => 'interview-list|' + JSON.stringify(filters.value),
  () =>
    get<PageResult<InterviewQuestion>>('/api/interview/questions', {
      page: filters.value.page,
      size: pageSize,
      topicId: filters.value.topic || undefined,
      questionKind: filters.value.kind || undefined,
      difficulty: filters.value.difficulty || undefined,
      keyword: filters.value.keyword || undefined,
      sort: filters.value.sort,
    }),
  { default: () => null, watch: [filters] }
)

const { data: statsData } = await useAsyncData('interview-public-stats', () => get<InterviewStats>('/api/interview/stats'), {
  default: () => null,
})
const { data: hotData } = await useAsyncData('interview-public-hot', () => get<InterviewQuestion[]>('/api/interview/hot', { size: 5 }), {
  default: () => null,
})
const { data: companyData } = await useAsyncData('interview-public-companies', () => get<InterviewCompany[]>('/api/interview/companies'), {
  default: () => null,
})

const questions = computed(() => data.value?.data?.records || [])
const total = computed(() => Number(data.value?.data?.total) || 0)
const stats = computed(() => statsData.value?.data || null)
const hot = computed(() => hotData.value?.data || [])
const companies = computed(() => (companyData.value?.data || []).filter((c) => Number(c.questionCount) > 0).slice(0, 8))
const totalPages = computed(() => Math.max(Math.ceil(total.value / pageSize), 1))

/** 主题下拉：11 个主题全量列出（含章节） */
const { data: topicData } = await useAsyncData('interview-topics-filter', () => get<{ id: number; name: string; children?: { id: number; name: string }[] }[]>('/api/interview/topics'), {
  default: () => null,
})
const topicOptions = computed(() => {
  const out: { id: number; name: string }[] = []
  for (const t of topicData.value?.data || []) {
    out.push({ id: t.id, name: t.name })
    for (const c of t.children || []) out.push({ id: c.id, name: '　' + c.name })
  }
  return out
})

const difficultyOptions = computed(() =>
  [1, 2, 3, 4, 5].map((level) => ({ level, label: DIFFICULTY_LABEL[level] }))
)

const pageLink = (target: number) => {
  const query: Record<string, string | number> = { ...route.query }
  if (target <= 1) {
    delete query.page
  } else {
    query.page = target
  }
  return { path: '/interview', query }
}

const classify = (event: Event) => {
  keywordInput.value = (event.target as HTMLInputElement).value
}

useSeoMeta({
  title: '面试题库 · 岗位 × 公司双维度',
  description: '按岗位与公司整理的面试题库：八股概念、系统设计、算法推导、项目深挖，附参考答案与追问链。',
})
</script>

<template>
  <div>
    <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-lg font-bold text-slate-900">面试题库</h1>
        <p class="mt-1 text-xs text-slate-500">
          共 {{ total }} 道题 · {{ stats?.companyCount || 0 }} 家公司 · 按「岗位 × 公司」双维度整理
        </p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink
          to="/interview/companies"
          class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:border-brand-300 hover:text-brand-600"
        >公司库</NuxtLink>
        <NuxtLink
          v-if="authStore.isLoggedIn"
          to="/admin/interview-questions"
          class="rounded-lg bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700"
        >录入题目</NuxtLink>
      </div>
    </div>

    <form class="card mb-5" @submit.prevent="setQuery({ keyword: keywordInput, page: 1 })">
      <div class="flex flex-wrap items-center gap-2">
        <input
          :value="keywordInput"
          type="search"
          placeholder="搜索题目 / 答案关键字…"
          class="min-w-[200px] flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
          @input="classify"
        />
        <select class="interview-select" :value="filters.topic" @change="onSelect($event, 'topic')">
          <option value="">全部主题</option>
          <option v-for="item in topicOptions" :key="item.id" :value="String(item.id)">{{ item.name }}</option>
        </select>
        <select class="interview-select" :value="filters.difficulty" @change="onSelect($event, 'difficulty')">
          <option value="">全部难度</option>
          <option v-for="item in difficultyOptions" :key="item.level" :value="String(item.level)">
            {{ item.level }}/5 {{ item.label }}
          </option>
        </select>
        <select class="interview-select" :value="filters.kind" @change="onSelect($event, 'kind')">
          <option value="">全部题型</option>
          <option v-for="item in KIND_FILTER_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
        <select class="interview-select" :value="filters.sort" @change="onSelect($event, 'sort')">
          <option value="hot">按热度</option>
          <option value="latest">按最新</option>
          <option value="difficulty">按难度</option>
        </select>
        <button type="submit" class="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700">搜索</button>
      </div>
      <div v-if="hasFilter" class="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
        <span>已筛选</span>
        <button type="button" class="text-brand-600 hover:text-brand-700" @click="setQuery({ topic: '', kind: '', difficulty: '', keyword: '', page: 1 })">
          清空条件
        </button>
      </div>
    </form>

    <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div>
        <div v-if="pending" class="space-y-3">
          <div v-for="i in 4" :key="i" class="card animate-pulse">
            <div class="h-3.5 w-2/3 rounded bg-slate-100" />
            <div class="mt-2 h-3 w-full rounded bg-slate-100" />
            <div class="mt-2 h-3 w-1/2 rounded bg-slate-100" />
          </div>
        </div>

        <div v-else-if="!questions.length" class="card py-10 text-center">
          <p class="text-sm text-slate-500">这个条件下还没有题目</p>
          <p class="mt-1 text-xs text-slate-400">换个岗位或难度试试，或者</p>
          <NuxtLink
            v-if="authStore.isLoggedIn"
            to="/admin/interview-questions"
            class="mt-3 inline-block rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:border-brand-300 hover:text-brand-600"
          >去录入第一道题</NuxtLink>
        </div>

        <div v-else class="space-y-3">
          <InterviewQuestionCard v-for="item in questions" :key="item.id" :question="item" />
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

      <aside class="space-y-4">
        <section class="bg-white rounded-xl border border-slate-200 p-4">
          <h2 class="text-sm font-semibold text-slate-900">热门公司</h2>
          <ul class="mt-2 space-y-1.5">
            <li v-for="company in companies" :key="company.id">
              <NuxtLink
                :to="'/interview/companies/' + company.slug"
                class="flex items-center justify-between text-xs text-slate-500 hover:text-brand-600"
              >
                <span class="truncate">{{ company.name }}</span>
                <span class="ml-2 text-slate-400">{{ company.questionCount }} 题</span>
              </NuxtLink>
            </li>
            <li v-if="!companies.length" class="text-xs text-slate-400">暂无公司数据</li>
          </ul>
        </section>

        <section class="bg-white rounded-xl border border-slate-200 p-4">
          <h2 class="text-sm font-semibold text-slate-900">热门题目</h2>
          <ul class="mt-2 space-y-2">
            <li v-for="item in hot" :key="item.id">
              <NuxtLink :to="'/interview/' + item.slug" class="block text-xs leading-relaxed text-slate-500 hover:text-brand-600">
                {{ item.title }}
              </NuxtLink>
            </li>
            <li v-if="!hot.length" class="text-xs text-slate-400">暂无数据</li>
          </ul>
        </section>

        <section class="bg-white rounded-xl border border-slate-200 p-4 text-xs leading-relaxed text-slate-500">
          <h2 class="text-sm font-semibold text-slate-900 mb-2">难度档位</h2>
          <p><span class="iq-diff iq-diff--1">1/5 入门</span> 基础概念，答不出要补课</p>
          <p class="mt-1"><span class="iq-diff iq-diff--3">3/5 中等</span> 常见面试门槛</p>
          <p class="mt-1"><span class="iq-diff iq-diff--5">5/5 困难</span> 深水区，区分度高</p>
        </section>
      </aside>
    </div>
  </div>
</template>
