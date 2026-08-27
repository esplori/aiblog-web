<script setup lang="ts">
import type { ArticleItem, Category, Tag, PageResult } from '~/types'

// 首页 SEO（title 由 nuxt.config 的 titleTemplate 统一生成，避免 "Pylox | Pylox" 重复）
useSeoMeta({
  description: 'Pylox — AI 驱动的现代化博客系统，分享技术、生活与思考',
})

const { get } = useApi()

// 使用 useAsyncData 进行服务端数据获取，支持 SSR
const { data: articlesData, pending: articlesPending } = useAsyncData(
  'articles-home',
  () => get<PageResult<ArticleItem>>('/api/articles', { page: 1, size: 6, status: 'published' }),
  { default: () => ({ records: [] }) }
)

const { data: categoriesData, pending: categoriesPending } = useAsyncData(
  'categories-home',
  () => get<Category[]>('/api/categories'),
  { default: () => [] }
)

const { data: tagsData, pending: tagsPending } = useAsyncData(
  'tags-home',
  () => get<Tag[]>('/api/tags/hot', { size: 6 }),
  { default: () => [] }
)

const loading = computed(() => articlesPending.value || categoriesPending.value || tagsPending.value)

const articles = computed(() => (articlesData.value?.data as any)?.records || [])
const categories = computed(() => categoriesData.value?.data || [])
const topTags = computed(() => tagsData.value?.data || [])

// 第一篇作为 Hero，其余作为精选文章
const heroArticle = computed(() => articles.value[0] || null)
const featuredArticles = computed(() => articles.value.slice(1, 5))
</script>

<template>
  <div>
    <!-- ========== Hero：最新文章大卡片 ========== -->
    <section class="pt-12 pb-16">
      <div class="container">
        <el-skeleton v-if="loading" :rows="6" animated />
        <NuxtLink
          v-else-if="heroArticle"
          :to="`/post/${heroArticle.uuid}`"
          class="block group"
        >
          <ArticleCover :article="heroArticle" variant="hero" />

          <div v-if="heroArticle.coverImage" class="mt-6 max-w-3xl">
            <!-- 分类标签 -->
            <div class="flex items-center gap-3 mb-3">
              <span
                v-if="heroArticle.category"
                class="inline-block px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-full"
              >
                {{ heroArticle.category.name }}
              </span>
              <span class="text-sm text-gray-500">{{ new Date(heroArticle.createdAt).toLocaleDateString() }}</span>
              <span class="text-sm text-gray-400">·</span>
              <span class="text-sm text-gray-500">{{ heroArticle.viewCount }} 阅读</span>
            </div>

            <!-- 标题 -->
            <h1 class="text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-tight">
              {{ heroArticle.title }}
            </h1>

            <!-- 摘要 -->
            <p class="mt-3 text-base text-gray-500 leading-relaxed line-clamp-2">
              {{ heroArticle.excerpt }}
            </p>
          </div>
        </NuxtLink>
      </div>
    </section>

    <!-- ========== 精选文章 ========== -->
    <section class="pb-16">
      <div class="container">
        <div class="flex items-center justify-between mb-8">
          <h2 class="text-2xl font-bold text-gray-900">精选文章</h2>
          <NuxtLink
            to="/articles"
            class="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            查看全部 →
          </NuxtLink>
        </div>

        <el-skeleton v-if="loading" :rows="4" animated />
        <div
          v-else-if="featuredArticles.length > 0"
          class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10"
        >
          <NuxtLink
            v-for="article in featuredArticles"
            :key="article.id"
            :to="`/post/${article.uuid}`"
            class="group"
          >
            <!-- 封面图 -->
            <div class="mb-4">
              <ArticleCover :article="article" variant="card" />
            </div>

            <template v-if="article.coverImage">
              <!-- 元信息 -->
              <div class="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <span
                  v-if="article.category"
                  class="text-blue-600 font-medium"
                >
                  {{ article.category.name }}
                </span>
                <span v-if="article.category" class="text-gray-300">·</span>
                <span>{{ new Date(article.createdAt).toLocaleDateString() }}</span>
                <span v-if="article.author" class="text-gray-300">·</span>
                <span v-if="article.author" class="text-gray-500">{{ article.author.displayName }}</span>
              </div>

              <!-- 标题 -->
              <h3 class="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug">
                {{ article.title }}
              </h3>

              <!-- 摘要 -->
              <p class="mt-2 text-sm text-gray-500 leading-relaxed line-clamp-2">
                {{ article.excerpt }}
              </p>
            </template>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ========== 底部三栏：分类 + 热门标签 + 关于 ========== -->
    <section class="border-t border-gray-100 py-16">
      <div class="container">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
          <!-- 分类 -->
          <div>
            <h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-5">分类</h3>
            <div class="flex flex-col gap-3">
              <NuxtLink
                v-for="cat in categories"
                :key="cat.id"
                :to="`/articles?category=${cat.id}`"
                class="flex items-center justify-between group"
              >
                <span class="text-sm text-gray-600 group-hover:text-blue-600 transition-colors">{{ cat.name }}</span>
                <span class="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{{ cat.articleCount }}</span>
              </NuxtLink>
              <div v-if="categories.length === 0" class="text-sm text-gray-400">暂无分类</div>
            </div>
          </div>

          <!-- 热门标签 -->
          <div>
            <h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-5">热门标签</h3>
            <div class="flex flex-wrap gap-2">
              <NuxtLink
                v-for="tag in topTags"
                :key="tag.id"
                :to="`/articles?tag=${tag.id}`"
                class="inline-block px-3 py-1.5 text-sm text-gray-600 bg-gray-50 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                {{ tag.name }}
              </NuxtLink>
              <div v-if="topTags.length === 0" class="text-sm text-gray-400">暂无标签</div>
            </div>
          </div>

          <!-- 关于 -->
          <div>
            <h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-5">关于</h3>
            <p class="text-sm text-gray-500 leading-relaxed mb-4">
              Pylox 是一个 AI 驱动的现代化博客平台，分享技术、生活与思考。探索 AI 前沿技术，记录成长点滴。
            </p>
            <NuxtLink
              to="/articles"
              class="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              浏览全部文章 →
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>