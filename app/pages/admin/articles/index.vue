<script setup lang="ts">
import type { ArticleItem } from '~/types'

definePageMeta({
  layout: 'admin',
})

const { get, del } = useApi()

const articles = ref<ArticleItem[]>([])
const loading = ref(true)
const total = ref(0)
const currentPage = ref(1)

const loadArticles = async () => {
  loading.value = true
  try {
    const res = await get<{ records: ArticleItem[]; total: number }>('/api/articles', {
      page: currentPage.value,
      size: 10,
    })
    articles.value = res.data.records
    total.value = res.data.total
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定删除这篇文章吗？', '确认')
    await del(`/api/articles/${id}`)
    ElMessage.success('删除成功')
    loadArticles()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

onMounted(loadArticles)
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">文章管理</h1>
      <NuxtLink to="/admin/articles/create">
        <el-button type="primary">新建文章</el-button>
      </NuxtLink>
    </div>

    <div class="card">
      <el-skeleton v-if="loading" :rows="5" animated />
      <el-table v-else :data="articles">
        <el-table-column prop="title" label="标题" min-width="200" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'published' ? 'success' : 'info'" size="small">
              {{ row.status === 'published' ? '已发布' : row.status === 'draft' ? '草稿' : '归档' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="viewCount" label="阅读" width="80" />
        <el-table-column prop="commentCount" label="评论" width="80" />
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <NuxtLink :to="`/admin/articles/edit/${row.id}`">
              <el-button size="small" text type="primary">编辑</el-button>
            </NuxtLink>
            <el-button size="small" text type="danger" @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="total > 10" class="mt-4 flex justify-end">
        <el-pagination
          :current-page="currentPage"
          :page-size="10"
          :total="total"
          layout="prev, pager, next"
          @current-change="(p: number) => { currentPage = p; loadArticles() }"
        />
      </div>
    </div>
  </div>
</template>
