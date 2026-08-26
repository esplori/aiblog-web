<script setup lang="ts">
import type { ArticleItem, Category, Tag } from '~/types'

const { get } = useApi()

// 使用 useAsyncData 进行服务端数据获取，支持 SSR
const { data: articlesData, pending: articlesPending, error: articlesError } = useAsyncData(
  'articles-home',
  () => get<ArticleItem[]>('/api/articles', { page: 1, size: 6, status: 'published' }),
  { default: () => [] }
)

const { data: categoriesData, pending: categoriesPending } = useAsyncData(
  'categories-home',
  () => get<Category[]>('/api/categories'),
  { default: () => [] }
)

const { data: tagsData, pending: tagsPending } = useAsyncData(
  'tags-home',
  () => get<Tag[]>('/api/tags'),
  { default: () => [] }
)

const loading = computed(() => articlesPending.value || categoriesPending.value || tagsPending.value)

const articles = computed(() => articlesData.value?.data || [])
const categories = computed(() => categoriesData.value?.data || [])
const tags = computed(() => tagsData.value?.data || [])
</script>

<template>
  <div>
    <!-- Banner -->
    <section class="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-20">
      <div class="container text-center">
        <h1 class="text-4xl font-bold mb-4">AI Blog</h1>
        <p class="text-xl opacity-90 mb-8">AI 驱动的现代化博客系统</p>
        <NuxtLink to="/articles">
          <el-button size="large" type="primary" plain>浏览文章</el-button>
        </NuxtLink>
      </div>
    </section>

    <!-- 最新文章 -->
    <section class="py-12">
      <div class="container">
        <h2 class="text-2xl font-bold mb-6">最新文章</h2>
        <el-skeleton v-if="loading" :rows="3" animated />
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <NuxtLink
            v-for="article in articles"
            :key="article.id"
            :to="`/post/${article.uuid}`"
            class="card hover:shadow-md transition-shadow"
          >
            <h3 class="text-lg font-semibold mb-2 text-gray-800">{{ article.title }}</h3>
            <p class="text-gray-500 text-sm mb-4 line-clamp-2">{{ article.excerpt }}</p>
            <div class="flex items-center justify-between text-xs text-gray-400">
              <span>{{ article.author?.displayName }}</span>
              <span>{{ new Date(article.createdAt).toLocaleDateString() }}</span>
            </div>
          </NuxtLink>
        </div>
        <div v-if="!loading && articles.length > 0" class="text-center mt-8">
          <NuxtLink to="/articles">
            <el-button>查看更多文章</el-button>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- 分类与标签 -->
    <section class="py-12 bg-white">
      <div class="container grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- 分类 -->
        <div>
          <h2 class="text-2xl font-bold mb-4">文章分类</h2>
          <div class="flex flex-wrap gap-3">
            <NuxtLink
              v-for="cat in categories"
              :key="cat.id"
              :to="`/articles?category=${cat.id}`"
              class="px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-500"
            >
              {{ cat.name }} ({{ cat.articleCount }})
            </NuxtLink>
          </div>
        </div>

        <!-- 标签 -->
        <div>
          <h2 class="text-2xl font-bold mb-4">热门标签</h2>
          <div class="flex flex-wrap gap-2">
            <NuxtLink
              v-for="tag in tags"
              :key="tag.id"
              :to="`/articles?tag=${tag.id}`"
              class="px-3 py-1 border rounded-full text-sm hover:bg-blue-50 hover:text-blue-500 hover:border-blue-300"
              :style="{ borderColor: tag.color || '#d1d5db', color: tag.color || '#6b7280' }"
            >
              {{ tag.name }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
