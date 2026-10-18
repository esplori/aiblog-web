<script setup lang="ts">
/**
 * 主题刷题（P1）：给定一个方向就能练 —— Java / 前端 / 驾校科目一 / 一年级数学 …
 * 数据来自 /api/interview/topics（主题树，含题量与客观题数量）
 */
definePageMeta({ layout: 'workbench' })

interface TopicNode {
  id: number
  slug: string
  name: string
  description?: string | null
  icon?: string | null
  kind: string
  questionCount: number
  objectiveCount: number
  children: TopicNode[]
}

const { get } = useApi()

const { data, pending } = await useAsyncData('interview-topics', () => get<TopicNode[]>('/api/interview/topics'))
const topics = computed<TopicNode[]>(() => data.value?.data || [])

useHead({ title: '主题刷题 · 给定方向练与考' })
</script>

<template>
  <div>
    <header class="mb-5">
      <p class="text-xs text-slate-400">刷题 · 考试</p>
      <h1 class="mt-1 text-2xl font-semibold text-slate-900">主题刷题</h1>
      <p class="mt-1.5 text-sm text-slate-500">
        选一个方向就能练：技术方向、驾校科目一、一年级数学都可以。客观题自动判分，答错自动进复习卡。
      </p>
    </header>

    <el-skeleton v-if="pending && !topics.length" :rows="5" animated />

    <div v-else-if="topics.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="t in topics"
        :key="t.id"
        :to="'/interview/topics/' + t.slug"
        class="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-sm"
      >
        <div class="flex items-start justify-between gap-3">
          <h2 class="text-base font-semibold text-slate-900 group-hover:text-brand-600">{{ t.name }}</h2>
          <span class="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
            {{ t.questionCount }} 题
          </span>
        </div>
        <p class="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-500">
          {{ t.description || '按主题练习与考试' }}
        </p>
        <div class="mt-3 flex items-center gap-3 text-xs text-slate-400">
          <span>客观题 {{ t.objectiveCount }}</span>
          <span v-if="t.children.length">{{ t.children.length }} 个章节</span>
          <span class="ml-auto text-brand-600 group-hover:underline">开始练习 →</span>
        </div>
      </NuxtLink>
    </div>

    <p v-else class="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
      还没有主题，先去后台录入题目。
    </p>
  </div>
</template>

