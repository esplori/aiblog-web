<script setup lang="ts">
import type { CommentResponse } from '~/types'

definePageMeta({
  layout: 'admin',
})

const { get, put, del } = useApi()

const comments = ref<CommentResponse[]>([])
const loading = ref(true)

const loadComments = async () => {
  loading.value = true
  try {
    const res = await get<CommentResponse[]>('/api/admin/comments')
    comments.value = res.data
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleApprove = async (id: number) => {
  try {
    await put(`/api/comments/${id}/status`, { status: 'approved' })
    ElMessage.success('审核通过')
    loadComments()
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定删除这条评论吗？', '确认')
    await del(`/api/comments/${id}`)
    ElMessage.success('删除成功')
    loadComments()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

onMounted(loadComments)
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 mb-6">评论管理</h1>

    <div class="card">
      <el-skeleton v-if="loading" :rows="5" animated />
      <el-table v-else :data="comments">
        <el-table-column prop="content" label="内容" min-width="300" show-overflow-tooltip />
        <el-table-column label="用户" width="120">
          <template #default="{ row }">
            {{ row.userInfo?.username || '匿名' }}
          </template>
        </el-table-column>
        <el-table-column label="文章" width="200">
          <template #default="{ row }">
            文章 ID: {{ row.articleId }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'approved' ? 'success' : 'warning'" size="small">
              {{ row.status === 'approved' ? '已审核' : '待审核' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status !== 'approved'"
              size="small"
              text
              type="success"
              @click="handleApprove(row.id)"
            >
              通过
            </el-button>
            <el-button size="small" text type="danger" @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>