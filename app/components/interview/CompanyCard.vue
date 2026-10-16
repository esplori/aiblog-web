<template>
  <NuxtLink
    :to="'/interview/companies/' + company.slug"
    class="card block transition-colors hover:border-brand-300"
  >
    <div class="flex items-center gap-3">
      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-500">
        {{ initial }}
      </span>
      <div class="min-w-0">
        <h3 class="truncate text-sm font-semibold text-slate-900">{{ company.name }}</h3>
        <p class="truncate text-[11px] text-slate-400">{{ meta }}</p>
      </div>
      <span class="ml-auto shrink-0 text-xs text-slate-400">{{ company.questionCount || 0 }} 题</span>
    </div>
    <p v-if="company.intro" class="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">{{ company.intro }}</p>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { InterviewCompany } from '~/types/interview'

const props = defineProps<{ company: InterviewCompany }>()

const initial = computed(() => (props.company.name || '?').trim().slice(0, 1))

const meta = computed(() => {
  const parts = [props.company.industry, props.company.scale].filter(Boolean)
  return parts.length ? parts.join(' · ') : '未填写行业信息'
})
</script>
