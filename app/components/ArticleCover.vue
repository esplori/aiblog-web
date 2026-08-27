<script setup lang="ts">
import type { ArticleItem } from '~/types'
import {
  formatArticleNumber,
  formatCompactCount,
  getArticleCoverTheme,
  reportCoverImageFailure,
} from '~/utils/articleCover.mjs'

const props = withDefaults(defineProps<{
  article: ArticleItem
  variant?: 'hero' | 'card'
}>(), {
  variant: 'card',
})

const imageFailed = ref(false)
const hasImage = computed(() => Boolean(props.article.coverImage) && !imageFailed.value)
const theme = computed(() => getArticleCoverTheme(props.article.category?.name, props.article.id))
const articleNumber = computed(() => formatArticleNumber(props.article.id))
const readingCount = computed(() => formatCompactCount(props.article.viewCount))
const publishedDate = computed(() => {
  const date = new Date(props.article.createdAt)
  if (Number.isNaN(date.getTime())) return 'PYLOX EDITION'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
  }).format(date)
})

const posterStyle = computed(() => ({
  '--cover-bg': theme.value.background,
  '--cover-surface': theme.value.surface,
  '--cover-fg': theme.value.foreground,
  '--cover-muted': theme.value.muted,
  '--cover-accent': theme.value.accent,
  '--cover-grid': theme.value.grid,
}))

function handleImageError() {
  imageFailed.value = true
  reportCoverImageFailure(console, props.article)
}
</script>

<template>
  <div
    class="article-cover"
    :class="[`article-cover--${variant}`, { 'article-cover--image': hasImage }]"
    :style="posterStyle"
  >
    <img
      v-if="hasImage"
      :src="article.coverImage"
      :alt="`${article.title}封面`"
      class="article-cover__image"
      :loading="variant === 'hero' ? 'eager' : 'lazy'"
      :fetchpriority="variant === 'hero' ? 'high' : 'auto'"
      decoding="async"
      @error="handleImageError"
    />

    <div v-else class="article-cover__poster">
      <div class="article-cover__grid" aria-hidden="true" />
      <div class="article-cover__accent" aria-hidden="true" />

      <header class="article-cover__header">
        <div class="article-cover__section">
          <span class="article-cover__icon" aria-hidden="true">
            <Icon :name="theme.icon" />
          </span>
          <span>{{ article.category?.name || '精选' }}</span>
          <span class="article-cover__slash">/</span>
          <span>{{ theme.label }}</span>
        </div>
        <span class="article-cover__number">{{ articleNumber }}</span>
      </header>

      <div class="article-cover__body">
        <p v-if="variant === 'hero'" class="article-cover__eyebrow">
          PYLOX EDITORIAL · {{ publishedDate }}
        </p>
        <h2 class="article-cover__title">{{ article.title }}</h2>
        <p v-if="variant === 'hero' && article.excerpt" class="article-cover__excerpt">
          {{ article.excerpt }}
        </p>
      </div>

      <footer class="article-cover__footer">
        <div class="article-cover__meta">
          <span>{{ article.author?.displayName || 'Pylox' }}</span>
          <span aria-hidden="true">·</span>
          <span>{{ readingCount }} READS</span>
        </div>
        <strong>PYLOX</strong>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.article-cover {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 8px;
  background: var(--cover-bg);
  isolation: isolate;
}

.article-cover--hero {
  aspect-ratio: 16 / 8.6;
}

.article-cover--card {
  aspect-ratio: 16 / 10;
}

.article-cover__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 400ms ease;
}

.group:hover .article-cover__image {
  transform: scale(1.025);
}

.article-cover__poster {
  position: relative;
  display: flex;
  height: 100%;
  flex-direction: column;
  justify-content: space-between;
  padding: clamp(16px, 3.2vw, 44px);
  color: var(--cover-fg);
  background: var(--cover-bg);
}

.article-cover--card .article-cover__poster {
  padding: clamp(16px, 2.1vw, 24px);
}

.article-cover__grid {
  position: absolute;
  inset: 0;
  z-index: -2;
  background-image:
    linear-gradient(var(--cover-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--cover-grid) 1px, transparent 1px);
  background-size: 36px 36px;
  mask-image: linear-gradient(to right, transparent 12%, black 52%, black 100%);
}

.article-cover__accent {
  position: absolute;
  top: 0;
  right: 0;
  z-index: -1;
  width: 31%;
  height: 100%;
  border-left: 1px solid var(--cover-grid);
  background: var(--cover-surface);
}

.article-cover__accent::before,
.article-cover__accent::after {
  position: absolute;
  content: '';
  background: var(--cover-accent);
}

.article-cover__accent::before {
  top: 12%;
  right: 18%;
  width: min(14vw, 160px);
  height: 8px;
}

.article-cover__accent::after {
  right: 18%;
  bottom: 17%;
  width: 42px;
  height: 42px;
  border: 8px solid var(--cover-accent);
  background: transparent;
}

.article-cover__header,
.article-cover__footer {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  font-size: clamp(10px, 1.1vw, 13px);
  line-height: 1;
  color: var(--cover-muted);
}

.article-cover__section,
.article-cover__meta {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  white-space: nowrap;
}

.article-cover__icon {
  display: inline-flex;
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--cover-accent);
  color: var(--cover-accent);
}

.article-cover__slash {
  color: var(--cover-accent);
}

.article-cover__number {
  flex: 0 0 auto;
  font-variant-numeric: tabular-nums;
}

.article-cover__body {
  position: relative;
  z-index: 1;
  width: min(71%, 760px);
  padding: 20px 0;
}

.article-cover__eyebrow {
  margin: 0 0 14px;
  font-size: clamp(10px, 1.1vw, 13px);
  font-weight: 700;
  color: var(--cover-accent);
}

.article-cover__title {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  font-size: clamp(28px, 5.2vw, 66px);
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: 0;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.article-cover--card .article-cover__title {
  font-size: clamp(22px, 3vw, 34px);
  line-height: 1.18;
}

.article-cover__excerpt {
  display: -webkit-box;
  overflow: hidden;
  max-width: 620px;
  margin: 18px 0 0;
  color: var(--cover-muted);
  font-size: clamp(13px, 1.45vw, 17px);
  line-height: 1.65;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.article-cover__footer strong {
  flex: 0 0 auto;
  color: var(--cover-accent);
  font-size: clamp(12px, 1.4vw, 16px);
  letter-spacing: 0;
}

@media (max-width: 640px) {
  .article-cover--hero {
    aspect-ratio: 4 / 3;
  }

  .article-cover__poster,
  .article-cover--card .article-cover__poster {
    padding: 16px;
  }

  .article-cover__accent {
    width: 25%;
  }

  .article-cover__body {
    width: 82%;
    padding: 12px 0;
  }

  .article-cover__title,
  .article-cover--card .article-cover__title {
    font-size: clamp(21px, 7vw, 30px);
  }

  .article-cover__excerpt {
    margin-top: 10px;
    font-size: 12px;
    line-height: 1.5;
  }

  .article-cover__section span:nth-last-child(-n + 2),
  .article-cover__meta span:nth-last-child(-n + 2) {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .article-cover__image {
    transition: none;
  }
}
</style>
