<script setup lang="ts">
import type { Category } from '~/types'

definePageMeta({
  layout: 'admin',
})

const { get, del } = useApi()

const categories = ref<Category[]>([])
const loading = ref(true)

const loadCategories = async () => {
  loading.value = true
  try {
    const res = await get<Category[]>('/api/categories')
    categories.value = res.data
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定删除这个分类吗？', '确认')
    await del(`/api/categories/${id}`)
    ElMessage.success('删除成功')
    loadCategories()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

onMounted(loadCategories)
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">分类管理</h1>
      <el-button type="primary">新建分类</el-button>
    </div>

    <div class="card">
      <el-skeleton v-if="loading" :rows="5" animated />
      <el-table v-else :data="categories">
        <el-table-column prop="name" label="名称" width="150" />
        <el-table-column prop="slug" label="Slug" width="150" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="articleCount" label="文章数" width="100" />
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button size="small" text type="primary">编辑</el-button>
            <el-button size="small" text type="danger" @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>
