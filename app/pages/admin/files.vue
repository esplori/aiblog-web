<script setup lang="ts">
import type { FileInfo } from '~/types'

definePageMeta({
  layout: 'admin',
})

const { get, del } = useApi()

const files = ref<FileInfo[]>([])
const loading = ref(true)

const loadFiles = async () => {
  loading.value = true
  try {
    const res = await get<FileInfo[]>('/api/files/user/1')
    files.value = res.data
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定删除这个文件吗？', '确认')
    await del(`/api/files/${id}`)
    ElMessage.success('删除成功')
    loadFiles()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

onMounted(loadFiles)
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">文件管理</h1>
      <el-upload action="/api/files/upload" :show-file-list="false">
        <el-button type="primary">上传文件</el-button>
      </el-upload>
    </div>

    <div class="card">
      <el-skeleton v-if="loading" :rows="5" animated />
      <el-table v-else :data="files">
        <el-table-column prop="originalFilename" label="文件名" min-width="200" show-overflow-tooltip />
        <el-table-column prop="fileType" label="类型" width="100" />
        <el-table-column label="大小" width="100">
          <template #default="{ row }">
            {{ formatSize(row.fileSize) }}
          </template>
        </el-table-column>
        <el-table-column prop="mimeType" label="MIME" width="150" />
        <el-table-column label="上传时间" width="160">
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <a :href="row.fileUrl" target="_blank">
              <el-button size="small" text type="primary">查看</el-button>
            </a>
            <el-button size="small" text type="danger" @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>
