<script setup lang="ts">
import type { InterviewCompany, InterviewStats } from '~/types/interview'

definePageMeta({ layout: 'workbench' })

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { get } = useApi()

const keyword = computed(() => String(route.query.keyword || ''))
const keywordInput = ref(keyword.value)
watch(keyword, (value) => {
  keywordInput.value = value
})

const { data, pending } = await useAsyncData(
  () => 'interview-companies|' + keyword.value,
  () => get<InterviewCompany[]>('/api/interview/companies', { keyword: keyword.value || undefined }),
  { default: () => null, watch: [keyword] }
)
const { data: statsData } = await useAsyncData('interview-company-stats', () => get<InterviewStats>('/api/interview/stats'), {
  default: () => null,
})

const companies = computed(() => data.value?.data || [])
const stats = computed(() => statsData.value?.data || null)
const totalQuestions = computed(() => companies.value.reduce((sum, item) => sum + Number(item.questionCount || 0), 0))

const search = () => {
  const query: Record<string, string> = {}
  if (keywordInput.value) query.keyword = keywordInput.value
  router.push({ path: '/interview/companies', query })
}

const classify = (event: Event) => {
  keywordInput.value = (event.target as HTMLInputElement).value
}

useSeoMeta({
  title: '公司题库 · 面试',
  description: '按公司整理的面试题目聚合：各轮次题目、难度分布与面经入口。',
})
</script>

<template>
  <div>
    <NuxtLink to="/interview" class="text-xs text-slate-400 hover:text-brand-600">← 返回题库</NuxtLink>

    <div class="mt-3 mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-lg font-bold text-slate-900">公司题库</h1>
        <p class="mt-1 text-xs text-slate-500">
          {{ companies.length }} 家公司 · {{ totalQuestions }} 道已发布题目 · 共 {{ stats?.companyCount || 0 }} 家
        </p>
      </div>
      <form class="flex items-center gap-2" @submit.prevent="search">
        <input
          :value="keywordInput"
          type="search"
          placeholder="搜索公司名…"
          class="w-52 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
          @input="classify"
        />
        <button type="submit" class="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700">搜索</button>
      </form>
    </div>

    <div v-if="pending" class="grid gap-3 sm:grid-cols-2">
      <div v-for="i in 6" :key="i" class="card animate-pulse">
        <div class="h-3.5 w-1/2 rounded bg-slate-100" />
        <div class="mt-2 h-3 w-1/3 rounded bg-slate-100" />
      </div>
    </div>

    <div v-else-if="!companies.length" class="card py-10 text-center">
      <p class="text-sm text-slate-500">还没有公司数据</p>
      <NuxtLink
        v-if="authStore.isLoggedIn"
        to="/admin/interview-companies"
        class="mt-3 inline-block rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:border-brand-300 hover:text-brand-600"
      >去添加公司</NuxtLink>
    </div>

    <div v-else class="grid gap-3 sm:grid-cols-2">
      <InterviewCompanyCard v-for="company in companies" :key="company.id" :company="company" />
    </div>
  </div>
</template>
