<script setup lang="ts">
import type { Tag } from '~/types'

definePageMeta({
  layout: 'admin',
})

const { get, del } = useApi()

const tags = ref<Tag[]>([])
const loading = ref(true)

const loadTags = async () => {
  loading.value = true
  try {
    const res = await get<Tag[]>('/api/tags')
    tags.value = res.data
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定删除这个标签吗？', '确认')
    await del(`/api/tags/${id}`)
    ElMessage.success('删除成功')
    loadTags()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

onMounted(loadTags)
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">标签管理</h1>
      <el-button type="primary">新建标签</el-button>
    </div>

    <div class="card">
      <el-skeleton v-if="loading" :rows="5" animated />
      <el-table v-else :data="tags">
        <el-table-column prop="name" label="名称" width="150" />
        <el-table-column prop="slug" label="Slug" width="150" />
        <el-table-column label="颜色" width="100">
          <template #default="{ row }">
            <span
              class="inline-block w-4 h-4 rounded-full"
              :style="{ backgroundColor: row.color || '#409eff' }"
            />
          </template>
        </el-table-column>
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
