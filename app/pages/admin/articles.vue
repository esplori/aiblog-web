<script setup lang="ts">
import type { ArticleListResponse } from '~/types'

definePageMeta({
  layout: 'admin',
})

const { get, del } = useApi()

const articles = ref<ArticleListResponse[]>([])
const loading = ref(true)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

const loadArticles = async () => {
  loading.value = true
  try {
    const res = await get<ArticleListResponse[]>(`/api/admin/articles?page=${page.value}&size=${pageSize.value}`)
    articles.value = res.data
    // 这里简化处理，实际应该从响应头或分页对象获取总数
    total.value = articles.value.length
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
      <el-button type="primary">新建文章</el-button>
    </div>

    <div class="card">
      <el-skeleton v-if="loading" :rows="5" animated />
      <el-table v-else :data="articles">
        <el-table-column prop="title" label="标题" min-width="250" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'published' ? 'success' : 'warning'" size="small">
              {{ row.status === 'published' ? '已发布' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="viewCount" label="阅读" width="80" />
        <el-table-column prop="commentCount" label="评论" width="80" />
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" text type="primary">编辑</el-button>
            <el-button size="small" text type="danger" @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-if="!loading"
        class="mt-4"
        :page-size="pageSize"
        :current-page="page"
        :total="total"
        layout="prev, pager, next"
        @current-change="page => { page.value = page; loadArticles() }"
      />
    </div>
  </div>
</template>