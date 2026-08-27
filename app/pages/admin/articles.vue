<script setup lang="ts">
import type { ArticleItem, PageResult } from '~/types'

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

const articles = ref<ArticleItem[]>([])
const loading = ref(true)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

const loadArticles = async () => {
  if (isSubRoute.value) {
    articles.value = []
    return
  }
  loading.value = true
  try {
    const res = await get<PageResult<ArticleItem>>(`/api/admin/articles`, {
      page: page.value,
      size: pageSize.value,
    })
    articles.value = res.data.records
    total.value = res.data.total
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
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

const handleEdit = (id: number) => {
  navigateTo(`/admin/articles/edit/${id}`)
}

const handleView = (uuid: string) => {
  window.open(`/post/${uuid}`, '_blank')
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
      <h1 class="text-2xl font-bold text-gray-900">文章管理</h1>
      <el-button type="primary" @click="handleCreate">新建文章</el-button>
    </div>

    <div class="card">
      <el-skeleton v-if="loading" :rows="5" animated />
      <template v-else>
        <el-table :data="articles">
          <el-table-column prop="title" label="标题" min-width="250" show-overflow-tooltip />
          <el-table-column label="分类" width="120">
            <template #default="{ row }">
              <el-tag v-if="row.category" size="small">{{ row.category.name }}</el-tag>
              <span v-else class="text-gray-400 text-sm">-</span>
            </template>
          </el-table-column>
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
          <el-table-column label="操作" width="260" fixed="right">
            <template #default="{ row }">
              <el-button size="small" text type="primary" @click="handleView(row.uuid)">查看</el-button>
              <el-button size="small" text type="primary" @click="handleEdit(row.id)">编辑</el-button>
              <el-button size="small" text type="danger" @click="handleDelete(row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="flex justify-center mt-4" v-if="total > pageSize">
          <el-pagination
            v-model:current-page="page"
            :page-size="pageSize"
            :total="total"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next"
            @current-change="handlePageChange"
            @size-change="handleSizeChange"
          />
        </div>
      </template>
    </div>
  </div>
</template>