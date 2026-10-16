<template>
  <NuxtLink
    :to="'/interview/' + question.slug"
    class="card block transition-colors hover:border-brand-300"
  >
    <div class="flex items-start justify-between gap-3">
      <h3 class="text-sm font-semibold leading-snug text-slate-900">{{ question.title }}</h3>
      <DifficultyBadge :level="question.difficulty" class="shrink-0" />
    </div>

    <p v-if="excerpt" class="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">{{ excerpt }}</p>

    <div class="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
      <NuxtLink
        v-if="question.companySlug"
        :to="'/interview/companies/' + question.companySlug"
        class="text-slate-500 hover:text-brand-600"
        @click.stop
      >
        {{ question.companyName }}
      </NuxtLink>
      <span v-else class="text-slate-500">{{ question.companyName || '通用题' }}</span>
      <span>· {{ positionLabel(question.position) }}</span>
      <span v-if="question.round">· {{ question.round }}</span>
      <span class="ml-auto">★ {{ question.starCount }} · 浏览 {{ question.viewCount }}</span>
    </div>

    <div v-if="question.tags?.length" class="mt-2 flex flex-wrap gap-1">
      <span
        v-for="tag in question.tags.slice(0, 4)"
        :key="tag"
        class="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500"
      >{{ tag }}</span>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { InterviewQuestion } from '~/types/interview'
import { positionLabel } from '~/types/interview'

const props = defineProps<{ question: InterviewQuestion }>()

// 卡片摘要：题干去掉 markdown 标记后截断，避免长题干把卡片撑高
const excerpt = computed(() => {
  const raw = (props.question.body || '').replace(/[#*`>\-]/g, '').replace(/\s+/g, ' ').trim()
  return raw.length > 72 ? raw.slice(0, 72) + '…' : raw
})
</script>
