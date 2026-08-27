<script setup lang="ts">
import type { ArticleItem, Category, Tag, PageResult } from '~/types'

const route = useRoute()
const { get } = useApi()

// 文章列表页 SEO
const pageTitle = computed(() => {
  const k = keyword.value.trim()
  if (k) return `搜索: ${k}`
  const c = route.query.category as string
  const t = route.query.tag as string
  if (c) return `分类: ${c}`
  if (t) return `标签: ${t}`
  return '全部文章'
})

const articles = ref<ArticleItem[]>([])
const categories = ref<Category[]>([])
const topTags = ref<Tag[]>([])
const loading = ref(true)
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const keyword = ref('')

const category = computed(() => route.query.category as string)
const tag = computed(() => route.query.tag as string)

// 用名称展示当前过滤条件（id → name）
const categoryName = computed(() => categories.value.find(c => String(c.id) === category.value)?.name || category.value)
const tagName = computed(() => topTags.value.find(t => String(t.id) === tag.value)?.name || tag.value)

const listTitle = computed(() => {
  if (keyword.value.trim()) return `搜索: ${keyword.value.trim()}`
  if (categoryName.value) return `分类: ${categoryName.value}`
  if (tagName.value) return `标签: ${tagName.value}`
  return '全部文章'
})

const loadArticles = async () => {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: page.value,
      size: pageSize.value,
      status: 'published',
    }
    if (category.value) params.categoryId = category.value
    if (tag.value) params.tagId = tag.value
    if (keyword.value.trim()) params.keyword = keyword.value.trim()

    const res = await get<PageResult<ArticleItem>>('/api/articles', params)
    articles.value = res.data.records || []
    total.value = res.data.total || 0
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
      get<Tag[]>('/api/tags/hot', { size: 20 }),
    ])
    categories.value = catRes.data
    topTags.value = tagRes.data
  } catch (e) {
    console.error(e)
  }
}

const handlePageChange = (p: number) => {
  page.value = p
  loadArticles()
}

const handleSizeChange = (s: number) => {
  pageSize.value = s
  page.value = 1
  loadArticles()
}

const handleSearch = () => {
  page.value = 1
  loadArticles()
}

const handleClearSearch = () => {
  keyword.value = ''
  page.value = 1
  loadArticles()
}

useSeoMeta({
  title: pageTitle,
  description: '浏览所有文章，按分类和标签筛选',
})

onMounted(() => {
  loadArticles()
  loadFilters()
})

watch([category, tag], () => {
  page.value = 1
  loadArticles()
})
</script>

<template>
  <div class="min-h-screen">
    <div class="max-w-6xl mx-auto px-6 py-12">
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <!-- 文章列表 -->
        <div class="lg:col-span-3">
          <div class="flex items-center justify-between mb-6">
            <h1 class="text-2xl font-bold text-gray-900">
              {{ listTitle }}
            </h1>
          </div>

          <!-- 搜索框 -->
          <div class="mb-6">
            <el-input
              v-model="keyword"
              placeholder="搜索文章标题 / 内容"
              clearable
              style="max-width: 360px"
              @keyup.enter="handleSearch"
              @clear="handleClearSearch"
            >
              <template #prefix>
                <el-icon><Icon name="ep:search" /></el-icon>
              </template>
            </el-input>
            <el-button type="primary" class="ml-2" @click="handleSearch">搜索</el-button>
          </div>

          <el-skeleton v-if="loading" :rows="5" animated />
          <template v-else>
            <div v-if="articles.length === 0" class="text-center py-16 text-gray-400">
              <p class="text-base">暂无文章</p>
            </div>
            <div v-else class="space-y-6">
              <NuxtLink
                v-for="article in articles"
                :key="article.id"
                :to="`/post/${article.uuid}`"
                class="group flex gap-5 pb-6 border-b border-gray-50 last:border-0"
              >
                <div
                  v-if="article.coverImage"
                  class="w-36 h-24 rounded-xl bg-cover bg-center flex-shrink-0 overflow-hidden"
                >
                  <img :src="article.coverImage" class="w-full h-full object-cover" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 text-xs text-gray-400 mb-1.5">
                    <span v-if="article.category" class="text-blue-600 font-medium">{{ article.category.name }}</span>
                    <span v-if="article.category" class="text-gray-300">·</span>
                    <span>{{ new Date(article.createdAt).toLocaleDateString() }}</span>
                  </div>
                  <h2 class="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug mb-1.5">
                    {{ article.title }}
                  </h2>
                  <p class="text-sm text-gray-500 leading-relaxed line-clamp-2">{{ article.excerpt }}</p>
                  <div class="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span v-if="article.author">{{ article.author.displayName }}</span>
                    <span>{{ article.viewCount }} 阅读</span>
                  </div>
                </div>
              </NuxtLink>
            </div>

            <div v-if="total > pageSize" class="flex justify-center mt-10">
              <el-pagination
                v-model:current-page="page"
                :page-size="pageSize"
                :total="total"
                :page-sizes="[10, 20, 50]"
                layout="total, sizes, prev, pager, next"
                @current-change="handlePageChange"
                @size-change="handleSizeChange"
              />
            </div>
          </template>
        </div>

        <!-- 侧边栏 -->
        <aside class="space-y-8">
          <!-- 分类 -->
          <div>
            <h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">分类</h3>
            <div class="flex flex-col gap-2">
              <NuxtLink
                v-for="cat in categories"
                :key="cat.id"
                :to="`/articles?category=${cat.id}`"
                class="flex justify-between items-center text-sm text-gray-600 hover:text-blue-600 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50"
                :class="{ 'text-blue-600 bg-blue-50 font-medium': category === String(cat.id) }"
              >
                <span>{{ cat.name }}</span>
                <span class="text-xs text-gray-400">{{ cat.articleCount }}</span>
              </NuxtLink>
            </div>
          </div>

          <!-- 标签 -->
          <div>
            <h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">热门标签</h3>
            <div class="flex flex-wrap gap-2">
              <NuxtLink
                v-for="t in topTags"
                :key="t.id"
                :to="`/articles?tag=${t.id}`"
                class="px-3 py-1.5 text-sm text-gray-600 bg-gray-50 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors"
                :class="{ 'text-blue-600 bg-blue-50 font-medium': tag === String(t.id) }"
              >
                {{ t.name }}
              </NuxtLink>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>