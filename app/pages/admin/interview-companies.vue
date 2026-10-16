<script setup lang="ts">
import type { InterviewCompany } from '~/types/interview'

// 面试公司库维护（题库的公司维度）
definePageMeta({ layout: 'admin' })

const { get, post, put, del } = useApi()

const items = ref<InterviewCompany[]>([])
const loading = ref(true)
const keyword = ref('')

const loadItems = async () => {
  loading.value = true
  try {
    const res = await get<InterviewCompany[]>('/api/admin/interview/companies', { keyword: keyword.value || undefined })
    items.value = res.data || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

await loadItems()

const blankForm = () => ({
  slug: '',
  name: '',
  industry: '',
  scale: '',
  logoUrl: '',
  intro: '',
})

const dialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref<number | null>(null)
const submitting = ref(false)
const form = ref(blankForm())

const openCreate = () => {
  isEdit.value = false
  editingId.value = null
  form.value = blankForm()
  dialogVisible.value = true
}

const openEdit = (row: InterviewCompany) => {
  isEdit.value = true
  editingId.value = row.id
  form.value = {
    slug: row.slug,
    name: row.name,
    industry: row.industry || '',
    scale: row.scale || '',
    logoUrl: row.logoUrl || '',
    intro: row.intro || '',
  }
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!form.value.name.trim()) {
    ElMessage.warning('请填写公司名称')
    return
  }
  submitting.value = true
  const payload = {
    slug: form.value.slug.trim() || undefined,
    name: form.value.name.trim(),
    industry: form.value.industry || undefined,
    scale: form.value.scale || undefined,
    logoUrl: form.value.logoUrl || undefined,
    intro: form.value.intro || undefined,
  }
  try {
    if (isEdit.value && editingId.value) {
      await put('/api/admin/interview/companies/' + editingId.value, payload)
      ElMessage.success('已保存')
    } else {
      await post('/api/admin/interview/companies', payload)
      ElMessage.success('已创建')
    }
    dialogVisible.value = false
    await loadItems()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

const removeItem = async (row: InterviewCompany) => {
  try {
    await ElMessageBox.confirm(
      '确定删除「' + row.name + '」吗？该公司下的题目会保留，但不再关联公司。',
      '确认',
      { type: 'warning' }
    )
    await del('/api/admin/interview/companies/' + row.id)
    ElMessage.success('已删除')
    loadItems()
  } catch {
    /* 取消或失败都不打断列表 */
  }
}
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-bold text-slate-900">面试公司库</h1>
        <p class="mt-1 text-xs text-slate-500">题库的公司维度；公司名可空（题目即为通用题）</p>
      </div>
      <el-button type="primary" @click="openCreate">新增公司</el-button>
    </div>

    <div class="mb-4 flex flex-wrap items-center gap-2">
      <el-input v-model="keyword" placeholder="搜索公司名" clearable style="width: 240px" @keyup.enter="loadItems" />
      <el-button @click="loadItems">查询</el-button>
    </div>

    <el-table v-loading="loading" :data="items" border stripe>
      <el-table-column prop="name" label="公司" min-width="180" />
      <el-table-column prop="slug" label="短名" width="160" />
      <el-table-column prop="industry" label="行业" width="140" />
      <el-table-column prop="scale" label="规模" width="150" />
      <el-table-column prop="questionCount" label="已发布题目" width="120" />
      <el-table-column prop="createdAt" label="创建时间" width="180" />
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="removeItem(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑公司' : '新增公司'" width="560px">
      <el-form label-width="88px">
        <el-form-item label="公司名称">
          <el-input v-model="form.name" placeholder="例如：字节跳动" />
        </el-form-item>
        <el-form-item label="URL 短名">
          <el-input v-model="form.slug" placeholder="留空自动生成，例如 bytedance" />
        </el-form-item>
        <el-form-item label="行业">
          <el-input v-model="form.industry" placeholder="例如：互联网 / 电商" />
        </el-form-item>
        <el-form-item label="规模">
          <el-input v-model="form.scale" placeholder="例如：10000 人以上" />
        </el-form-item>
        <el-form-item label="Logo 链接">
          <el-input v-model="form.logoUrl" placeholder="https://…" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="form.intro" type="textarea" :rows="3" placeholder="面试风格、流程轮次等" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">
          {{ isEdit ? '保存' : '创建' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>
