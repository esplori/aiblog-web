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

// 动态设置 SEO 元信息（SSR 时生效，爬虫可见）
useServerSeoMeta({
  title: () => article.value?.title || '文章详情',
  description: () => article.value?.excerpt || article.value?.content?.slice(0, 200)?.replace(/<[^>]*>/g, ''),
})

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
  <div class="min-h-screen">
    <el-skeleton v-if="loading" :rows="12" animated class="max-w-3xl mx-auto py-16 px-6" />
    <template v-else-if="article">
      <!-- ========== Hero 封面图 ========== -->
      <div
        v-if="article.coverImage"
        class="w-full h-[480px] bg-cover bg-center"
        :style="{ backgroundImage: `url(${article.coverImage})` }"
      />

      <!-- ========== 文章主体 ========== -->
      <div class="max-w-[720px] mx-auto px-6 pb-20">
        <!-- 返回链接 -->
        <div class="pt-12 pb-2">
          <NuxtLink to="/" class="text-sm text-gray-400 hover:text-blue-600 transition-colors">
            ← 返回首页
          </NuxtLink>
        </div>

        <!-- 文章头部 -->
        <header class="pt-6 pb-10">
          <!-- 分类标签 -->
          <div v-if="article.category" class="mb-4">
            <NuxtLink
              :to="`/articles?category=${article.category.id}`"
              class="inline-block px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
            >
              {{ article.category.name }}
            </NuxtLink>
          </div>

          <!-- 标题 -->
          <h1 class="text-4xl font-bold text-gray-900 leading-tight tracking-tight">
            {{ article.title }}
          </h1>

          <!-- 元信息 -->
          <div class="flex items-center gap-4 mt-6 text-sm text-gray-500">
            <div class="flex items-center gap-2">
              <el-avatar :size="32" class="bg-blue-50">
                {{ article.author?.displayName?.charAt(0) || '?' }}
              </el-avatar>
              <span class="font-medium text-gray-700">{{ article.author?.displayName || '匿名' }}</span>
            </div>
            <span class="text-gray-300">·</span>
            <span>{{ new Date(article.createdAt).toLocaleDateString() }}</span>
            <span class="text-gray-300">·</span>
            <span>{{ article.viewCount }} 阅读</span>
          </div>

          <!-- 标签 -->
          <div v-if="article.tags?.length" class="flex gap-2 mt-5">
            <NuxtLink
              v-for="tag in article.tags"
              :key="tag.id"
              :to="`/articles?tag=${tag.id}`"
              class="inline-block px-3 py-1 text-xs text-gray-500 bg-gray-50 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              {{ tag.name }}
            </NuxtLink>
          </div>
        </header>

        <!-- 分隔线 -->
        <div class="border-t border-gray-100" />

        <!-- 文章内容 -->
        <article
          class="article-content pt-10"
          v-html="articleContentHtml"
        />

        <!-- 点赞 -->
        <div class="flex justify-center pt-16 pb-12">
          <el-button round plain class="!px-8">
            <el-icon class="mr-1.5"><Icon name="ep:star" /></el-icon>
            点赞 ({{ article.likeCount }})
          </el-button>
        </div>

        <!-- 分隔线 -->
        <div class="border-t border-gray-100" />

        <!-- 评论区 -->
        <section class="pt-10">
          <h2 class="text-lg font-semibold text-gray-900 mb-8">
            评论 <span class="text-gray-400 font-normal">({{ comments.length }})</span>
          </h2>

          <!-- 评论输入 -->
          <div class="mb-10">
            <el-input
              v-model="commentContent"
              type="textarea"
              :rows="3"
              placeholder="写下你的评论..."
              class="comment-input"
            />
            <div class="mt-3 text-right">
              <el-button type="primary" round @click="submitComment">提交评论</el-button>
            </div>
          </div>

          <!-- 评论列表 -->
          <div class="space-y-8">
            <div v-if="comments.length === 0" class="text-center text-gray-400 py-12 text-sm">
              暂无评论，来写第一条吧
            </div>
            <div v-for="comment in comments" :key="comment.id" class="pb-6 border-b border-gray-50 last:border-0">
              <div class="flex items-start gap-3">
                <el-avatar :size="36" class="bg-gray-100 flex-shrink-0">
                  {{ comment.userInfo?.displayName?.charAt(0) || comment.nickname?.charAt(0) || '?' }}
                </el-avatar>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="font-medium text-sm text-gray-800">
                      {{ comment.userInfo?.displayName || comment.nickname || '匿名' }}
                    </span>
                    <span class="text-xs text-gray-400">
                      {{ new Date(comment.createdAt).toLocaleString() }}
                    </span>
                  </div>
                  <p class="text-sm text-gray-600 leading-relaxed">{{ comment.content }}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </template>

    <!-- 404 -->
    <div v-else-if="!articlePending" class="text-center py-32 text-gray-400">
      <p class="text-lg">文章不存在</p>
      <NuxtLink to="/" class="text-blue-600 text-sm mt-2 inline-block">返回首页</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
/* ========== Google 风格文章内容排版 ========== */
.article-content {
  font-size: 1.0625rem;
  line-height: 1.8;
  color: #1f1f1f;
}

/* 注意：内容由 v-html 动态插入，子元素不带 scoped 属性，必须用 :deep() 穿透 */
.article-content :deep(h1),
.article-content :deep(h2),
.article-content :deep(h3),
.article-content :deep(h4) {
  color: #111;
  font-weight: 700;
  line-height: 1.3;
  margin-top: 2.5em;
  margin-bottom: 0.8em;
}

.article-content :deep(h2) {
  font-size: 1.5rem;
  letter-spacing: -0.01em;
}

.article-content :deep(h3) {
  font-size: 1.25rem;
}

.article-content :deep(p) {
  margin-bottom: 1.5em;
}

.article-content :deep(a) {
  color: #1a73e8;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.article-content :deep(a:hover) {
  color: #1557b0;
}

.article-content :deep(strong) {
  font-weight: 600;
  color: #111;
}

.article-content :deep(blockquote) {
  margin: 1.5em 0;
  padding: 0.5em 1em 0.5em 1.5em;
  border-left: 3px solid #1a73e8;
  background: #f8f9fa;
  border-radius: 0 8px 8px 0;
  color: #5f6368;
}

.article-content :deep(blockquote p) {
  margin-bottom: 0;
}

.article-content :deep(ul),
.article-content :deep(ol) {
  margin: 1em 0;
  padding-left: 1.5em;
}

.article-content :deep(li) {
  margin-bottom: 0.4em;
}

.article-content :deep(code) {
  font-size: 0.875em;
  background: #f1f3f4;
  padding: 0.15em 0.4em;
  border-radius: 4px;
  color: #1f1f1f;
  font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono', monospace;
}

.article-content :deep(pre) {
  margin: 1.5em 0;
  padding: 1.25em;
  background: #1f1f1f;
  border-radius: 12px;
  overflow-x: auto;
  font-size: 0.875rem;
  line-height: 1.6;
}

.article-content :deep(pre code) {
  background: none;
  padding: 0;
  color: #e8eaed;
  font-size: inherit;
}

.article-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 12px;
  margin: 2em auto;
  display: block;
}

.article-content :deep(hr) {
  margin: 2.5em 0;
  border: none;
  border-top: 1px solid #e8eaed;
}

.article-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5em 0;
  font-size: 0.9375rem;
}

.article-content :deep(th),
.article-content :deep(td) {
  padding: 0.75em 1em;
  border: 1px solid #e8eaed;
  text-align: left;
}

.article-content :deep(th) {
  background: #f8f9fa;
  font-weight: 600;
  color: #1f1f1f;
}

/* 评论输入框统一样式 */
.comment-input :deep(.el-textarea__inner) {
  border-radius: 12px;
  border-color: #e8eaed;
  resize: none;
  font-size: 0.9375rem;
  line-height: 1.6;
}

.comment-input :deep(.el-textarea__inner:focus) {
  border-color: #1a73e8;
  box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.1);
}
</style>