<script setup lang="ts">
import type { Tag, PageResult } from '~/types'

definePageMeta({
  layout: 'admin',
})

const { get, post, put, del } = useApi()

const tags = ref<Tag[]>([])
const loading = ref(true)

// 分页
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

// 弹窗表单
const dialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref<number | null>(null)
const submitting = ref(false)
const form = reactive({
  name: '',
  color: '#409eff',
})

// 可选颜色
const colorOptions = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399', '#9b59b6', '#00bcd4', '#ff7043']

const loadTags = async () => {
  loading.value = true
  try {
    const res = await get<PageResult<Tag>>('/api/admin/tags/page', {
      page: page.value,
      size: pageSize.value,
    })
    tags.value = res.data.records
    total.value = res.data.total
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handlePageChange = (p: number) => {
  page.value = p
  loadTags()
}

const handleSizeChange = (s: number) => {
  pageSize.value = s
  page.value = 1
  loadTags()
}

const resetForm = () => {
  form.name = ''
  form.color = '#409eff'
  editingId.value = null
}

const handleCreate = () => {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

const handleEdit = (row: Tag) => {
  isEdit.value = true
  editingId.value = row.id
  form.name = row.name
  form.color = row.color || '#409eff'
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!form.name) {
    ElMessage.warning('请填写名称')
    return
  }

  submitting.value = true
  try {
    if (isEdit.value) {
      await put(`/api/tags/${editingId.value}`, form)
      ElMessage.success('更新成功')
    } else {
      await post('/api/tags', form)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    await loadTags()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || (isEdit.value ? '更新失败' : '创建失败'))
  } finally {
    submitting.value = false
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
      <h1 class="text-2xl font-bold text-gray-900">标签管理</h1>
      <el-button type="primary" @click="handleCreate">新建标签</el-button>
    </div>

    <div class="card">
      <el-skeleton v-if="loading" :rows="5" animated />
      <template v-else>
        <el-table :data="tags">
          <el-table-column prop="name" label="名称" min-width="150" show-overflow-tooltip />
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
              <el-button size="small" text type="primary" @click="handleEdit(row)">编辑</el-button>
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

    <!-- 新建/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑标签' : '新建标签'"
      width="480px"
      destroy-on-close
    >
      <el-form :model="form" label-width="80px">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" placeholder="标签名称" />
        </el-form-item>
        <el-form-item label="颜色">
          <div class="flex items-center gap-2 flex-wrap">
            <span
              v-for="c in colorOptions"
              :key="c"
              class="inline-block w-6 h-6 rounded-full cursor-pointer border-2"
              :class="form.color === c ? 'border-gray-800' : 'border-transparent'"
              :style="{ backgroundColor: c }"
              @click="form.color = c"
            />
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ isEdit ? '保存' : '创建' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>
