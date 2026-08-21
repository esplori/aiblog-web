<script setup lang="ts">
import type { Article, Comment } from '~/types'

const route = useRoute()
const { get, post } = useApi()

const article = ref<Article | null>(null)
const comments = ref<Comment[]>([])
const loading = ref(true)
const commentContent = ref('')

const articleId = computed(() => Number(route.params.id))

const loadArticle = async () => {
  loading.value = true
  try {
    const res = await get<Article>(`/api/articles/${articleId.value}`)
    article.value = res.data
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const loadComments = async () => {
  try {
    const res = await get<Comment[]>(`/api/comments/article/${articleId.value}`)
    comments.value = res.data
  } catch (e) {
    console.error(e)
  }
}

const submitComment = async () => {
  if (!commentContent.value.trim()) {
    ElMessage.warning('请输入评论内容')
    return
  }

  try {
    await post('/api/comments', {
      articleId: articleId.value,
      content: commentContent.value,
    })
    ElMessage.success('评论已提交，等待审核')
    commentContent.value = ''
    loadComments()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || '评论失败')
  }
}

onMounted(() => {
  loadArticle()
  loadComments()
})
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
              <NuxtLink :to="`/articles?category=${article.category.slug}`" class="hover:text-blue-500">
                {{ article.category.name }}
              </NuxtLink>
            </span>
            <span>{{ article.viewCount }} 阅读</span>
          </div>
          <div v-if="article.tags?.length" class="flex gap-2 mt-3">
            <el-tag v-for="tag in article.tags" :key="tag" size="small">{{ tag }}</el-tag>
          </div>
        </div>

        <!-- 文章内容 -->
        <article class="card prose max-w-none mb-8" v-html="article.content" />

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
