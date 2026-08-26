<script setup lang="ts">
import type { Article, Comment } from '~/types'
import { renderMarkdown } from '~/utils/markdown'

const route = useRoute()
const { get, post } = useApi()

// 文章 UUID（对外路由标识）
const articleUuid = computed(() => String(route.params.uuid))

// 使用 useAsyncData 支持 SSR
const { data: articleData, pending: articlePending, error: articleError, refresh: refreshArticle } = useAsyncData(
  'article-detail',
  () => get<Article>(`/api/articles/uuid/${articleUuid.value}`),
  { default: () => null, watch: [articleUuid] }
)

const article = computed(() => articleData.value?.data || null)

// 评论请求依赖文章内部 id，需等文章加载完成后再请求
const { data: commentsData, pending: commentsPending, refresh: refreshComments } = useAsyncData(
  'article-comments',
  () => {
    const id = article.value?.id
    if (!id) return Promise.resolve({ data: [] } as any)
    return get<Comment[]>(`/api/comments/article/${id}`)
  },
  { default: () => [], watch: [() => article.value?.id] }
)

const comments = computed(() => commentsData.value?.data || [])
const loading = computed(() => articlePending.value || commentsPending.value)

// 将 Markdown 内容转换为 HTML
const articleContentHtml = computed(() => article.value ? renderMarkdown(article.value.content) : '')

const commentContent = ref('')

const submitComment = async () => {
  if (!commentContent.value.trim()) {
    ElMessage.warning('请输入评论内容')
    return
  }
  if (!article.value) {
    ElMessage.error('文章不存在')
    return
  }

  try {
    await post('/api/comments', {
      articleId: article.value.id,
      content: commentContent.value,
    })
    ElMessage.success('评论已提交，等待审核')
    commentContent.value = ''
    await refreshComments()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || '评论失败')
  }
}
</script>

<template>
  <div class="container py-8">
    <el-skeleton v-if="loading" :rows="10" animated />
    <template v-else-if="article">
      <div class="max-w-3xl mx-auto">
        <!-- 文章头部 -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-800 mb-4">{{ article.title }}</h1>
          <div class="flex items-center gap-4 text-sm text-gray-500">
            <span v-if="article.author">{{ article.author.displayName }}</span>
            <span>{{ new Date(article.createdAt).toLocaleDateString() }}</span>
            <span v-if="article.category">
              <NuxtLink :to="`/articles?category=${article.category.id}`" class="hover:text-blue-500">
                {{ article.category.name }}
              </NuxtLink>
            </span>
            <span>{{ article.viewCount }} 阅读</span>
          </div>
          <div v-if="article.tags?.length" class="flex gap-2 mt-3">
            <NuxtLink v-for="tag in article.tags" :key="tag.id" :to="`/articles?tag=${tag.id}`">
              <el-tag size="small" class="cursor-pointer hover:!bg-blue-50 hover:!text-blue-500 transition-colors">
                {{ tag.name }}
              </el-tag>
            </NuxtLink>
          </div>
        </div>

        <!-- 文章内容 -->
        <article class="card prose max-w-none mb-8" v-html="articleContentHtml" />

        <!-- 点赞 -->
        <div class="flex justify-center mb-12">
          <el-button type="primary" plain>
            <el-icon class="mr-1"><Icon name="ep:star" /></el-icon>
            点赞 ({{ article.likeCount }})
          </el-button>
        </div>

        <!-- 评论区 -->
        <div class="card">
          <h2 class="text-xl font-bold mb-6">评论 ({{ comments.length }})</h2>

          <!-- 评论输入 -->
          <div class="mb-8">
            <el-input
              v-model="commentContent"
              type="textarea"
              :rows="3"
              placeholder="写下你的评论..."
            />
            <div class="mt-3 text-right">
              <el-button type="primary" @click="submitComment">提交评论</el-button>
            </div>
          </div>

          <!-- 评论列表 -->
          <div class="space-y-4">
            <div v-if="comments.length === 0" class="text-center text-gray-400 py-8">
              暂无评论
            </div>
            <div v-for="comment in comments" :key="comment.id" class="border-b pb-4">
              <div class="flex items-center gap-2 mb-2">
                <el-avatar :size="28">
                  {{ comment.userInfo?.displayName?.charAt(0) || comment.nickname?.charAt(0) || '?' }}
                </el-avatar>
                <span class="font-medium text-sm">
                  {{ comment.userInfo?.displayName || comment.nickname || '匿名' }}
                </span>
                <span class="text-xs text-gray-400">
                  {{ new Date(comment.createdAt).toLocaleString() }}
                </span>
              </div>
              <p class="text-gray-700 text-sm ml-10">{{ comment.content }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
