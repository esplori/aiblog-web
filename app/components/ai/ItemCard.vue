<script setup lang="ts">
import type { AiItem } from '~/types/ai'

const props = defineProps<{ item: AiItem }>()

const platforms = computed(() => (props.item.targets || []).map(t => t.platform))
</script>

<template>
  <article class="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-2.5 transition-colors hover:border-brand-300">
    <div class="flex items-center gap-2">
      <AiTypeTag :type="item.type" />
      <span v-if="item.featured" class="text-[11px] font-semibold text-amber-600">精选</span>
      <span class="ml-auto text-[11px] text-slate-400">★ {{ item.starCount }}</span>
    </div>

    <div>
      <NuxtLink :to="'/ai/' + item.slug" class="text-[15px] font-semibold text-slate-900 hover:text-brand-600">
        {{ item.name }}
      </NuxtLink>
      <p class="mt-1 text-[13px] leading-relaxed text-slate-500 line-clamp-2">{{ item.tagline }}</p>
    </div>

    <AiRiskBadges :risks="item.risks" />

    <div class="mt-auto flex items-center gap-2 flex-wrap text-[11px] text-slate-400">
      <span v-for="tag in item.tags.slice(0, 3)" :key="tag" class="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">{{ tag }}</span>
      <span v-if="platforms.length" class="ml-auto">{{ platforms.slice(0, 2).join(' / ') }}<span v-if="platforms.length > 2"> +{{ platforms.length - 2 }}</span></span>
    </div>
  </article>
</template>

