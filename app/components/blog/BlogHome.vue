<script setup lang="ts">
import type { ArticleItem, Category, Tag, PageResult } from '~/types'

const { name, description } = useSiteConfig()

// 首页 SEO（description 跟随站点配置，实现换肤换名后自动更新）
useSeoMeta({
  description: description,
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

// 站点文章总数（用于侧栏统计）
const totalArticles = computed(() => Number((articlesData.value?.data as any)?.total) || articles.value.length)

// 第一篇作为 Hero，其余作为精选文章
const heroArticle = computed(() => articles.value[0] || null)
const featuredArticles = computed(() => articles.value.slice(1, 5))

// 右栏「最新文章」
const latestArticles = computed(() => articles.value.slice(0, 5))
</script>

<template>
  <div class="container">
    <!-- 双侧栏：左导航(190) + 中内容 + 右信息(264)，两翼粘性跟随 -->
    <div
      class="grid grid-cols-1 gap-x-8
             lg:grid-cols-[190px_minmax(0,1fr)]
             xl:grid-cols-[190px_minmax(0,1fr)_264px]"
    >
      <!-- ========== 左栏：分类导航 + 热门标签 ========== -->
      <aside class="hidden lg:block">
        <div class="sticky top-[88px] py-11">
          <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">分类</h3>
          <nav class="flex flex-col gap-0.5 mb-8">
            <NuxtLink
              to="/articles"
              class="flex items-center justify-between px-2.5 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <span>全部文章</span>
              <span class="text-xs text-gray-400">{{ totalArticles }}</span>
            </NuxtLink>
            <NuxtLink
              v-for="cat in categories"
              :key="cat.id"
              :to="`/articles?category=${cat.id}`"
              class="flex items-center justify-between px-2.5 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <span>{{ cat.name }}</span>
              <span class="text-xs text-gray-400">{{ cat.articleCount }}</span>
            </NuxtLink>
          </nav>

          <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">热门标签</h3>
          <div v-if="topTags.length > 0" class="flex flex-wrap gap-2">
            <NuxtLink
              v-for="tag in topTags"
              :key="tag.id"
              :to="`/articles?tag=${tag.id}`"
              class="inline-block px-3 py-1.5 text-xs text-gray-600 bg-gray-50 rounded-full hover:bg-brand-50 hover:text-brand-600 transition-colors"
            >
              {{ tag.name }}
            </NuxtLink>
          </div>
          <div v-else class="text-xs text-gray-400">暂无标签</div>
        </div>
      </aside>

      <!-- ========== 中栏：Hero + 精选文章 ========== -->
      <main class="min-w-0 py-11">
        <!-- Hero：最新文章大卡片 -->
        <section class="pb-10">
          <el-skeleton v-if="loading" :rows="6" animated />
          <NuxtLink
            v-else-if="heroArticle"
            :to="`/post/${heroArticle.uuid}`"
            class="block group"
          >
            <ArticleCover :article="heroArticle" variant="hero" />

            <div v-if="heroArticle.coverImage" class="mt-6">
              <!-- 分类标签 -->
              <div class="flex items-center gap-3 mb-3">
                <span
                  v-if="heroArticle.category"
                  class="inline-block px-3 py-1 text-xs font-medium text-brand-600 bg-brand-50 rounded-full"
                >
                  {{ heroArticle.category.name }}
                </span>
                <span class="text-sm text-gray-500">{{ new Date(heroArticle.createdAt).toLocaleDateString() }}</span>
                <span class="text-sm text-gray-400">·</span>
                <span class="text-sm text-gray-500">{{ heroArticle.viewCount }} 阅读</span>
              </div>

              <!-- 标题 -->
              <h1 class="text-2xl font-bold text-gray-900 group-hover:text-brand-600 transition-colors leading-tight">
                {{ heroArticle.title }}
              </h1>

              <!-- 摘要 -->
              <p class="mt-3 text-base text-gray-500 leading-relaxed line-clamp-2">
                {{ heroArticle.excerpt }}
              </p>
            </div>
          </NuxtLink>
        </section>

        <!-- 精选文章 -->
        <section>
          <div class="flex items-center justify-between mb-8 pt-8 border-t border-gray-100">
            <h2 class="text-xl font-bold text-gray-900">精选文章</h2>
            <NuxtLink
              to="/articles"
              class="text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              查看全部 →
            </NuxtLink>
          </div>

          <el-skeleton v-if="loading" :rows="4" animated />
          <div
            v-else-if="featuredArticles.length > 0"
            class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-10"
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
                <div class="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <span
                    v-if="article.category"
                    class="text-brand-600 font-medium"
                  >
                    {{ article.category.name }}
                  </span>
                  <span v-if="article.category" class="text-gray-300">·</span>
                  <span>{{ new Date(article.createdAt).toLocaleDateString() }}</span>
                </div>

                <!-- 标题 -->
                <h3 class="text-base font-semibold text-gray-900 group-hover:text-brand-600 transition-colors leading-snug">
                  {{ article.title }}
                </h3>

                <!-- 摘要 -->
                <p class="mt-2 text-sm text-gray-500 leading-relaxed line-clamp-2">
                  {{ article.excerpt }}
                </p>
              </template>
            </NuxtLink>
          </div>
        </section>
      </main>

      <!-- ========== 右栏：关于 + 统计 + 最新文章 ========== -->
      <aside class="hidden xl:block">
        <div class="sticky top-[88px] py-11">
          <!-- 关于 -->
          <div class="mb-8">
            <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">关于</h3>
            <p class="text-sm text-gray-500 leading-relaxed mb-3">{{ description }}</p>
            <NuxtLink
              to="/articles"
              class="text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              浏览全部文章 →
            </NuxtLink>
          </div>

          <!-- 统计 -->
          <div class="mb-8">
            <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">统计</h3>
            <div class="flex flex-col gap-2 text-sm">
              <div class="flex items-center justify-between">
                <span class="text-gray-500">文章</span>
                <span class="font-medium text-gray-900">{{ totalArticles }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-500">分类</span>
                <span class="font-medium text-gray-900">{{ categories.length }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-500">标签</span>
                <span class="font-medium text-gray-900">{{ topTags.length }}</span>
              </div>
            </div>
          </div>

          <!-- 最新文章 -->
          <div v-if="latestArticles.length > 0">
            <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">最新文章</h3>
            <div class="flex flex-col gap-4">
              <NuxtLink
                v-for="article in latestArticles"
                :key="article.id"
                :to="`/post/${article.uuid}`"
                class="group block"
              >
                <span class="block text-sm text-gray-600 group-hover:text-brand-600 transition-colors leading-snug line-clamp-2">
                  {{ article.title }}
                </span>
                <span class="block text-xs text-gray-400 mt-1">
                  {{ new Date(article.createdAt).toLocaleDateString() }}
                </span>
              </NuxtLink>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
