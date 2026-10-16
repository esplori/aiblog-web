<script setup lang="ts">
import type { PageResult } from '~/types'
import type { InterviewCompany, InterviewQuestion } from '~/types/interview'
import { DIFFICULTY_LABEL, POSITION_OPTIONS, ROUND_OPTIONS, STATUS_LABEL, TYPE_LABEL, TYPE_ORDER, positionLabel } from '~/types/interview'

// 面试题库后台：题目录入与管理（菜单驱动权限，与 AI 条目录入同风格）
definePageMeta({ layout: 'admin' })

const { get, post, put, del, request } = useApi()

const items = ref<InterviewQuestion[]>([])
const companies = ref<InterviewCompany[]>([])
const loading = ref(true)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const statusFilter = ref('')
const positionFilter = ref('')
const keyword = ref('')

const loadItems = async () => {
  loading.value = true
  try {
    const res = await get<PageResult<InterviewQuestion>>('/api/admin/interview/questions', {
      page: page.value,
      size: pageSize.value,
      status: statusFilter.value || undefined,
      position: positionFilter.value || undefined,
      keyword: keyword.value || undefined,
    })
    items.value = res.data?.records || []
    total.value = Number(res.data?.total) || 0
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const loadCompanies = async () => {
  try {
    const res = await get<InterviewCompany[]>('/api/admin/interview/companies')
    companies.value = res.data || []
  } catch (e) {
    console.error(e)
  }
}

await Promise.all([loadItems(), loadCompanies()])

const handlePageChange = (target: number) => {
  page.value = target
  loadItems()
}

const onFilter = () => {
  page.value = 1
  loadItems()
}

const blankForm = () => ({
  slug: '',
  companyId: null as number | null,
  position: 'java',
  round: '一面',
  difficulty: 3,
  questionType: 'concept',
  title: '',
  body: '',
  answer: '',
  followUpsText: '',
  sourceUrl: '',
  askedYear: null as number | null,
  status: 'published',
  tagsText: '',
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

const openEdit = (row: InterviewQuestion) => {
  isEdit.value = true
  editingId.value = row.id
  form.value = {
    slug: row.slug,
    companyId: row.companyId ?? null,
    position: row.position || '',
    round: row.round || '',
    difficulty: row.difficulty ?? 3,
    questionType: row.questionType || 'concept',
    title: row.title,
    body: row.body,
    answer: row.answer || '',
    followUpsText: (row.followUps || []).join('\n'),
    sourceUrl: row.sourceUrl || '',
    askedYear: row.askedYear ?? null,
    status: row.status,
    tagsText: (row.tags || []).join(', '),
  }
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!form.value.title.trim()) {
    ElMessage.warning('请填写题目标题')
    return
  }
  if (!form.value.body.trim()) {
    ElMessage.warning('请填写题干')
    return
  }
  submitting.value = true
  const payload = {
    slug: form.value.slug.trim() || undefined,
    companyId: form.value.companyId || undefined,
    position: form.value.position || undefined,
    round: form.value.round || undefined,
    difficulty: form.value.difficulty,
    questionType: form.value.questionType,
    title: form.value.title.trim(),
    body: form.value.body,
    answer: form.value.answer || undefined,
    followUps: form.value.followUpsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    sourceUrl: form.value.sourceUrl || undefined,
    askedYear: form.value.askedYear || undefined,
    status: form.value.status,
    tags: form.value.tagsText
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
  }
  try {
    if (isEdit.value && editingId.value) {
      await put('/api/admin/interview/questions/' + editingId.value, payload)
      ElMessage.success('已保存')
    } else {
      await post('/api/admin/interview/questions', payload)
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

const changeStatus = async (row: InterviewQuestion, status: string) => {
  try {
    await request('/api/admin/interview/questions/' + row.id + '/status?status=' + encodeURIComponent(status), {
      method: 'PATCH',
    })
    ElMessage.success('状态已更新')
    loadItems()
  } catch {
    ElMessage.error('状态更新失败')
  }
}

const removeItem = async (row: InterviewQuestion) => {
  try {
    await ElMessageBox.confirm('确定删除题目「' + row.title + '」吗？', '确认', { type: 'warning' })
    await del('/api/admin/interview/questions/' + row.id)
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
        <h1 class="text-lg font-bold text-slate-900">面试题库</h1>
        <p class="mt-1 text-xs text-slate-500">题目录入与发布；前台 {{ total }} 条记录命中当前筛选</p>
      </div>
      <el-button type="primary" @click="openCreate">新增题目</el-button>
    </div>

    <div class="mb-4 flex flex-wrap items-center gap-2">
      <el-input v-model="keyword" placeholder="搜索标题 / 题干 / 答案" clearable style="width: 240px" @keyup.enter="onFilter" />
      <el-select v-model="statusFilter" placeholder="全部状态" clearable style="width: 140px" @change="onFilter">
        <el-option v-for="(label, value) in STATUS_LABEL" :key="value" :label="label" :value="value" />
      </el-select>
      <el-select v-model="positionFilter" placeholder="全部岗位" clearable style="width: 160px" @change="onFilter">
        <el-option v-for="item in POSITION_OPTIONS" :key="item" :label="positionLabel(item)" :value="item" />
      </el-select>
      <el-button @click="onFilter">查询</el-button>
    </div>

    <el-table v-loading="loading" :data="items" border stripe>
      <el-table-column prop="title" label="标题" min-width="240" show-overflow-tooltip />
      <el-table-column label="公司" width="140">
        <template #default="{ row }">{{ row.companyName || '通用题' }}</template>
      </el-table-column>
      <el-table-column label="岗位" width="110">
        <template #default="{ row }">{{ positionLabel(row.position) }}</template>
      </el-table-column>
      <el-table-column prop="round" label="轮次" width="90" />
      <el-table-column label="难度" width="90">
        <template #default="{ row }">{{ row.difficulty }}/5</template>
      </el-table-column>
      <el-table-column label="题型" width="110">
        <template #default="{ row }">{{ TYPE_LABEL[row.questionType] || row.questionType }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'published' ? 'success' : row.status === 'pending' ? 'warning' : 'info'" size="small">
            {{ STATUS_LABEL[row.status] || row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="viewCount" label="浏览" width="80" />
      <el-table-column label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button v-if="row.status !== 'published'" link type="success" @click="changeStatus(row, 'published')">发布</el-button>
          <el-button v-else link type="warning" @click="changeStatus(row, 'pending')">下架</el-button>
          <el-button link type="danger" @click="removeItem(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="mt-4 flex justify-end">
      <el-pagination
        :current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="handlePageChange"
      />
    </div>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑题目' : '新增题目'" width="760px">
      <el-form label-width="88px">
        <el-form-item label="标题">
          <el-input v-model="form.title" placeholder="例如：ConcurrentHashMap 如何保证线程安全？" />
        </el-form-item>
        <el-form-item label="题干">
          <el-input v-model="form.body" type="textarea" :rows="5" placeholder="支持 Markdown" />
        </el-form-item>
        <el-form-item label="参考答案">
          <el-input v-model="form.answer" type="textarea" :rows="5" placeholder="支持 Markdown，前台默认折叠" />
        </el-form-item>
        <el-form-item label="追问链">
          <el-input v-model="form.followUpsText" type="textarea" :rows="3" placeholder="一行一条追问，例如：那 JDK8 的扩容为什么是 2 倍？" />
        </el-form-item>
        <div class="grid grid-cols-2 gap-3">
          <el-form-item label="公司">
            <el-select v-model="form.companyId" placeholder="留空 = 通用题" clearable filterable style="width: 100%">
              <el-option v-for="item in companies" :key="item.id" :label="item.name" :value="item.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="岗位">
            <el-select v-model="form.position" filterable allow-create default-first-option style="width: 100%">
              <el-option v-for="item in POSITION_OPTIONS" :key="item" :label="positionLabel(item)" :value="item" />
            </el-select>
          </el-form-item>
          <el-form-item label="轮次">
            <el-select v-model="form.round" filterable allow-create default-first-option style="width: 100%">
              <el-option v-for="item in ROUND_OPTIONS" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>
          <el-form-item label="题型">
            <el-select v-model="form.questionType" style="width: 100%">
              <el-option v-for="item in TYPE_ORDER" :key="item" :label="TYPE_LABEL[item]" :value="item" />
            </el-select>
          </el-form-item>
          <el-form-item label="难度">
            <el-select v-model="form.difficulty" style="width: 100%">
              <el-option v-for="level in [1, 2, 3, 4, 5]" :key="level" :label="level + '/5 ' + DIFFICULTY_LABEL[level]" :value="level" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="form.status" style="width: 100%">
              <el-option v-for="(label, value) in STATUS_LABEL" :key="value" :label="label" :value="value" />
            </el-select>
          </el-form-item>
          <el-form-item label="出现年份">
            <el-input v-model.number="form.askedYear" placeholder="例如 2026" />
          </el-form-item>
          <el-form-item label="URL 短名">
            <el-input v-model="form.slug" placeholder="留空自动生成" />
          </el-form-item>
        </div>
        <el-form-item label="标签">
          <el-input v-model="form.tagsText" placeholder="逗号分隔，例如：并发, JVM, 分布式" />
        </el-form-item>
        <el-form-item label="出处链接">
          <el-input v-model="form.sourceUrl" placeholder="https://…（只存链接，不镜像正文）" />
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
