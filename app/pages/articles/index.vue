<script setup lang="ts">
import type { ArticleItem, Category, Tag } from '~/types'

const route = useRoute()
const { get } = useApi()

// 文章列表页 SEO
const pageTitle = computed(() => {
  const c = route.query.category as string
  const t = route.query.tag as string
  if (c) return `分类: ${c}`
  if (t) return `标签: ${t}`
  return '全部文章'
})
useSeoMeta({
  title: pageTitle,
  description: '浏览所有文章，按分类和标签筛选',
})

const articles = ref<ArticleItem[]>([])
const categories = ref<Category[]>([])
const tags = ref<Tag[]>([])
const loading = ref(true)
const total = ref(0)
const currentPage = ref(1)

const category = computed(() => route.query.category as string)
const tag = computed(() => route.query.tag as string)

// 用名称展示当前过滤条件（id → name）
const categoryName = computed(() => categories.value.find(c => String(c.id) === category.value)?.name || category.value)
const tagName = computed(() => tags.value.find(t => String(t.id) === tag.value)?.name || tag.value)

const loadArticles = async () => {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: currentPage.value,
      size: 10,
      status: 'published',
    }
    if (category.value) params.categoryId = category.value
    if (tag.value) params.tagId = tag.value

    const res = await get<{ records: ArticleItem[]; total: number } | ArticleItem[]>('/api/articles', params)
    // 兼容两种返回格式：分页对象 { records, total } 或直接数组
    const data = res.data
    if (Array.isArray(data)) {
      articles.value = data
      total.value = data.length
    } else {
      articles.value = data.records || []
      total.value = data.total || 0
    }
  } catch (e) {
    console.error(e)
    articles.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const loadFilters = async () => {
  try {
    const [catRes, tagRes] = await Promise.all([
      get<Category[]>('/api/categories'),
      get<Tag[]>('/api/tags'),
    ])
    categories.value = catRes.data
    tags.value = tagRes.data
  } catch (e) {
    console.error(e)
  }
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  loadArticles()
}

onMounted(() => {
  loadArticles()
  loadFilters()
})

watch([category, tag], () => {
  currentPage.value = 1
  loadArticles()
})
</script>

<template>
  <div class="container py-8">
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <!-- 文章列表 -->
      <div class="lg:col-span-3">
        <h1 class="text-2xl font-bold mb-6">
          {{ categoryName ? `分类: ${categoryName}` : tagName ? `标签: ${tagName}` : '全部文章' }}
        </h1>

        <el-skeleton v-if="loading" :rows="5" animated />
        <template v-else>
          <div v-if="articles.length === 0" class="text-center py-12 text-gray-400">
            暂无文章
          </div>
          <div v-else class="space-y-6">
            <NuxtLink
              v-for="article in articles"
              :key="article.id"
              :to="`/post/${article.uuid}`"
              class="card hover:shadow-md transition-shadow block"
            >
              <div class="flex gap-4">
                <div v-if="article.coverImage" class="w-32 h-24 rounded overflow-hidden flex-shrink-0">
                  <img :src="article.coverImage" class="w-full h-full object-cover" />
                </div>
                <div class="flex-1">
                  <h2 class="text-lg font-semibold text-gray-800 mb-1">{{ article.title }}</h2>
                  <p class="text-gray-500 text-sm mb-3 line-clamp-2">{{ article.excerpt }}</p>
                  <div class="flex items-center gap-4 text-xs text-gray-400">
                    <span v-if="article.author">{{ article.author.displayName }}</span>
                    <span v-if="article.category">{{ article.category.name }}</span>
                    <span>{{ new Date(article.createdAt).toLocaleDateString() }}</span>
                    <span>{{ article.viewCount }} 阅读</span>
                  </div>
                </div>
              </div>
            </NuxtLink>
          </div>

          <div v-if="total > 10" class="mt-8 flex justify-center">
            <el-pagination
              :current-page="currentPage"
              :page-size="10"
              :total="total"
              layout="prev, pager, next"
              @current-change="handlePageChange"
            />
          </div>
        </template>
      </div>

      <!-- 侧边栏 -->
      <aside class="space-y-6">
        <!-- 分类 -->
        <div class="card">
          <h3 class="font-semibold mb-3">文章分类</h3>
          <div class="space-y-2">
            <NuxtLink
              v-for="cat in categories"
              :key="cat.id"
              :to="`/articles?category=${cat.id}`"
              class="flex justify-between items-center text-sm text-gray-600 hover:text-blue-500"
            >
              <span>{{ cat.name }}</span>
              <span class="text-gray-400">{{ cat.articleCount }}</span>
            </NuxtLink>
          </div>
        </div>

        <!-- 标签 -->
        <div class="card">
          <h3 class="font-semibold mb-3">热门标签</h3>
          <div class="flex flex-wrap gap-2">
            <NuxtLink
              v-for="t in tags"
              :key="t.id"
              :to="`/articles?tag=${t.id}`"
              class="px-2 py-1 border rounded text-xs hover:bg-blue-50 hover:text-blue-500"
            >
              {{ t.name }}
            </NuxtLink>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
