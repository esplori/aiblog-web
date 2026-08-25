<script setup lang="ts">
import type { ArticleItem } from '~/types'

definePageMeta({
  layout: 'admin',
})

const route = useRoute()
const { get, del } = useApi()

// 判断是否为子路由（新建/编辑），是则由 NuxtPage 渲染子页面，否则渲染文章列表
const isSubRoute = computed(() => {
  const path = route.path
  return path.startsWith('/admin/articles/create') || path.startsWith('/admin/articles/edit')
})

const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

const { data: articles, refresh: loadArticles, pending: loading } = await useAsyncData('articles', async () => {
  if (isSubRoute.value) return []
  const res = await get<ArticleItem[]>(`/api/admin/articles?page=${page.value}&size=${pageSize.value}`)
  total.value = res.data.length
  return res.data
}, {
  default: () => [],
})

const handleEdit = (id: number) => {
  navigateTo(`/admin/articles/edit/${id}`)
}

const handleCreate = () => {
  navigateTo('/admin/articles/create')
}

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定删除这篇文章吗？', '确认')
    await del(`/api/articles/${id}`)
    ElMessage.success('删除成功')
    await loadArticles()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

onMounted(() => {
  loadArticles()
})
</script>

<template>
  <NuxtPage v-if="isSubRoute" />
  <div v-else>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">文章管理</h1>
      <el-button type="primary" @click="handleCreate">新建文章</el-button>
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
            <el-button size="small" text type="primary" @click="handleEdit(row.id)">编辑</el-button>
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