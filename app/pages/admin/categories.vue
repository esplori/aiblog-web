<script setup lang="ts">
import type { Category, PageResult } from '~/types'

definePageMeta({
  layout: 'admin',
})

const { get, post, put, del } = useApi()

const categories = ref<Category[]>([])
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
  description: '',
})

const loadCategories = async () => {
  loading.value = true
  try {
    const res = await get<PageResult<Category>>('/api/admin/categories/page', {
      page: page.value,
      size: pageSize.value,
    })
    categories.value = res.data.records
    total.value = res.data.total
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handlePageChange = (p: number) => {
  page.value = p
  loadCategories()
}

const handleSizeChange = (s: number) => {
  pageSize.value = s
  page.value = 1
  loadCategories()
}

const resetForm = () => {
  form.name = ''
  form.description = ''
  editingId.value = null
}

const handleCreate = () => {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

const handleEdit = (row: Category) => {
  isEdit.value = true
  editingId.value = row.id
  form.name = row.name
  form.description = row.description || ''
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
      await put(`/api/categories/${editingId.value}`, form)
      ElMessage.success('更新成功')
    } else {
      await post('/api/categories', form)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    await loadCategories()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || (isEdit.value ? '更新失败' : '创建失败'))
  } finally {
    submitting.value = false
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
      <h1 class="text-2xl font-bold text-gray-900">分类管理</h1>
      <el-button type="primary" @click="handleCreate">新建分类</el-button>
    </div>

    <div class="card overflow-x-auto">
      <el-skeleton v-if="loading" :rows="5" animated />
      <template v-else>
        <el-table :data="categories" class="min-w-[480px]">
          <el-table-column prop="name" label="名称" min-width="120" />
          <el-table-column prop="description" label="描述" min-width="180" show-overflow-tooltip class="hidden md:table-cell" />
          <el-table-column prop="articleCount" label="文章数" width="80" class="hidden sm:table-cell" />
          <el-table-column label="操作" width="140" fixed="right">
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
      :title="isEdit ? '编辑分类' : '新建分类'"
      width="480px"
      destroy-on-close
    >
      <el-form :model="form" label-width="80px">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" placeholder="分类名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="分类描述" />
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
