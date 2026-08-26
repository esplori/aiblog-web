<script setup lang="ts">
import type { Article, ArticleRequest, Category, Tag, FileInfo } from '~/types'
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'

definePageMeta({
  layout: 'admin',
})

const route = useRoute()
const { get, put } = useApi()

const loading = ref(false)
const categories = ref<Category[]>([])
const tags = ref<Tag[]>([])
const selectedTagIds = ref<number[]>([])
const coverImageUrl = ref('')

const form = reactive<ArticleRequest>({
  title: '',
  content: '',
  excerpt: '',
  coverImage: '',
  status: 'draft',
  categoryId: 0,
  tagIds: [],
})

const loadCategories = async () => {
  try {
    const res = await get<Category[]>('/api/categories')
    categories.value = res.data
  } catch (e) {
    console.error(e)
  }
}

const loadTags = async () => {
  try {
    const res = await get<Tag[]>('/api/tags')
    tags.value = res.data
  } catch (e) {
    console.error(e)
  }
}

const handleCoverUpload = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  try {
    const res = await useApi().post<FileInfo>('/api/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    coverImageUrl.value = res.data.fileUrl
    form.coverImage = res.data.fileUrl
    ElMessage.success('封面上传成功')
  } catch (e: any) {
    ElMessage.error(e?.data?.message || '封面上传失败')
  }
}

const loadArticle = async () => {
  loading.value = true
  try {
    const res = await get<Article>(`/api/articles/${route.params.id}`)
    const article = res.data
    form.title = article.title
    form.content = article.content
    form.excerpt = article.excerpt || ''
    form.status = article.status
    form.categoryId = article.categoryId || 0
    form.tagIds = (article.tags || []).map((t: any) => t.id) || []
    selectedTagIds.value = (article.tags || []).map((t: any) => t.id) || []
    coverImageUrl.value = article.coverImage || ''
    form.coverImage = article.coverImage || ''
  } catch (e) {
    ElMessage.error('加载文章失败')
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  if (!form.title || !form.content) {
    ElMessage.warning('请填写必填字段')
    return
  }

  // 同步选中的标签到 form.tagIds
  form.tagIds = selectedTagIds.value

  loading.value = true
  try {
    await put(`/api/articles/${route.params.id}`, form)
    ElMessage.success('更新成功')
    navigateTo('/admin/articles')
  } catch (e: any) {
    ElMessage.error(e?.data?.message || '更新失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadCategories()
  loadTags()
  loadArticle()
})
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">编辑文章</h1>
      <NuxtLink to="/admin/articles">
        <el-button>返回</el-button>
      </NuxtLink>
    </div>

    <div class="card">
      <el-form :model="form" label-width="100px">
        <el-form-item label="标题" required>
          <el-input v-model="form.title" placeholder="文章标题" />
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

        <el-form-item label="封面图">
          <div class="flex items-center gap-4">
            <el-upload
              action="/api/files/upload"
              :show-file-list="false"
              :on-success="(res: any) => { coverImageUrl = res.data.fileUrl; form.coverImage = res.data.fileUrl }"
              :headers="{ 'Content-Type': 'multipart/form-data' }"
              accept="image/*"
            >
              <el-button type="primary">上传封面</el-button>
            </el-upload>
            <el-input v-model="coverImageUrl" placeholder="或手动输入图片 URL" />
            <img v-if="coverImageUrl" :src="coverImageUrl" class="w-24 h-24 object-cover rounded" />
          </div>
        </el-form-item>

        <el-form-item label="标签">
          <el-select
            v-model="selectedTagIds"
            multiple
            filterable
            placeholder="选择标签"
            style="width: 100%"
          >
            <el-option
              v-for="tag in tags"
              :key="tag.id"
              :label="tag.name"
              :value="tag.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="内容" required>
          <ClientOnly>
            <MdEditor v-model="form.content" style="height: 520px" :toolbars-exclude="['github']" />
            <template #fallback>
              <el-input v-model="form.content" type="textarea" :rows="15" placeholder="加载 Markdown 编辑器中..." />
            </template>
          </ClientOnly>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSubmit">
            更新
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>
