<script setup lang="ts">
import type { ArticleItem } from '~/types'

// 文章卡片（首页门户与全部文章列表共用，保证两处样式一致）
defineProps<{ article: ArticleItem }>()
</script>

<template>
  <NuxtLink
    :to="'/post/' + article.uuid"
    class="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-colors hover:border-brand-300"
  >
    <div v-if="article.coverImage" class="aspect-[16/9] overflow-hidden bg-slate-100">
      <img :src="article.coverImage" :alt="article.title" class="h-full w-full object-cover" loading="lazy" />
    </div>
    <div class="flex flex-1 flex-col p-4">
      <div class="mb-1.5 flex items-center gap-2 text-[11px] text-slate-400">
        <span v-if="article.category" class="font-medium text-brand-600">{{ article.category.name }}</span>
        <span>{{ (article.createdAt || '').slice(0, 10) }}</span>
      </div>
      <h3 class="line-clamp-2 text-[15px] font-semibold leading-snug text-slate-900 group-hover:text-brand-600">
        {{ article.title }}
      </h3>
      <p class="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-slate-500">{{ article.excerpt }}</p>
      <div class="mt-auto flex items-center gap-3 pt-2 text-[11px] text-slate-400">
        <span v-if="article.author">{{ article.author.displayName }}</span>
        <span>{{ article.viewCount }} 阅读</span>
      </div>
    </div>
  </NuxtLink>
</template>

