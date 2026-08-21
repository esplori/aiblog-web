<script setup lang="ts">
import type { Article, ArticleRequest, Category } from '~/types'

definePageMeta({
  layout: 'admin',
})

const route = useRoute()
const { get, post, put } = useApi()

const isEdit = computed(() => !!route.params.id)
const loading = ref(false)
const categories = ref<Category[]>([])

const form = reactive<ArticleRequest>({
  title: '',
  content: '',
  excerpt: '',
  slug: '',
  status: 'draft',
  categoryId: 0,
})

const loadCategories = async () => {
  try {
    const res = await get<Category[]>('/api/categories')
    categories.value = res.data
  } catch (e) {
    console.error(e)
  }
}

const loadArticle = async () => {
  if (!isEdit.value) return
  loading.value = true
  try {
    const res = await get<Article>(`/api/articles/${route.params.id}`)
    const article = res.data
    form.title = article.title
    form.content = article.content
    form.excerpt = article.excerpt || ''
    form.slug = article.slug
    form.status = article.status
    form.categoryId = article.categoryId || 0
  } catch (e) {
    ElMessage.error('加载文章失败')
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  if (!form.title || !form.content || !form.slug) {
    ElMessage.warning('请填写必填字段')
    return
  }

  loading.value = true
  try {
    if (isEdit.value) {
      await put(`/api/articles/${route.params.id}`, form)
      ElMessage.success('更新成功')
    } else {
      await post('/api/articles', form)
      ElMessage.success('创建成功')
    }
    navigateTo('/admin/articles')
  } catch (e: any) {
    ElMessage.error(e?.data?.message || '操作失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadCategories()
  loadArticle()
})
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">{{ isEdit ? '编辑文章' : '新建文章' }}</h1>
      <NuxtLink to="/admin/articles">
        <el-button>返回</el-button>
      </NuxtLink>
    </div>

    <div class="card">
      <el-form :model="form" label-width="100px">
        <el-form-item label="标题" required>
          <el-input v-model="form.title" placeholder="文章标题" />
        </el-form-item>

        <el-form-item label="URL别名" required>
          <el-input v-model="form.slug" placeholder="url-slug" />
        </el-form-item>

        <el-form-item label="摘要">
          <el-input v-model="form.excerpt" type="textarea" :rows="2" placeholder="文章摘要" />
        </el-form-item>

        <el-form-item label="分类" required>
          <el-select v-model="form.categoryId" placeholder="选择分类">
            <el-option
              v-for="cat in categories"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="draft">草稿</el-radio>
            <el-radio value="published">发布</el-radio>
            <el-radio value="archived">归档</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="内容" required>
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="15"
            placeholder="Markdown 格式内容"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSubmit">
            {{ isEdit ? '更新' : '发布' }}
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>
