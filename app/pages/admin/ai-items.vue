<script setup lang="ts">
import type { PageResult } from '~/types'
import type { AiItem } from '~/types/ai'
import { RISK_LABEL, STATUS_LABEL, TYPE_LABEL, TYPE_ORDER } from '~/types/ai'

// AI 广场后台：条目录入与管理（菜单驱动权限，与标签管理同风格）
definePageMeta({ layout: 'admin' })

const { get, post, put, del } = useApi()

const items = ref<AiItem[]>([])
const loading = ref(true)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const statusFilter = ref('')
const typeFilter = ref('')
const keyword = ref('')

const loadItems = async () => {
  loading.value = true
  try {
    const res = await get<PageResult<AiItem>>('/api/admin/ai/items', {
      page: page.value,
      size: pageSize.value,
      status: statusFilter.value || undefined,
      type: typeFilter.value || undefined,
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

const handlePageChange = (p: number) => {
  page.value = p
  loadItems()
}

const onFilter = () => {
  page.value = 1
  loadItems()
}

interface TargetRow {
  platform: string
  transport: string
  installCommand: string
  configJson: string
  minVersion: string
  verified: boolean
}

const blankForm = () => ({
  slug: '',
  type: 'mcp',
  name: '',
  tagline: '',
  description: '',
  repoUrl: '',
  homepageUrl: '',
  installSnippet: '',
  authorName: '',
  license: '',
  risks: ['read'] as string[],
  status: 'published',
  featured: false,
  tagsText: '',
  targets: [] as TargetRow[],
})
const form = reactive(blankForm())

const dialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref<number | null>(null)
const submitting = ref(false)
const RISK_OPTIONS = ['read', 'write', 'net', 'exec']
const PLATFORM_OPTIONS = ['Claude Code', 'Cursor', 'VS Code', 'pi', 'Codex CLI', 'Ollama', '终端']

const resetForm = () => {
  Object.assign(form, blankForm())
}

const openCreate = () => {
  isEdit.value = false
  editingId.value = null
  resetForm()
  form.targets.push({ platform: 'Claude Code', transport: 'stdio', installCommand: '', configJson: '', minVersion: '', verified: false })
  dialogVisible.value = true
}

const openEdit = (row: AiItem) => {
  isEdit.value = true
  editingId.value = row.id
  resetForm()
  form.slug = row.slug
  form.type = row.type
  form.name = row.name
  form.tagline = row.tagline || ''
  form.description = row.description || ''
  form.repoUrl = row.repoUrl || ''
  form.homepageUrl = row.homepageUrl || ''
  form.installSnippet = row.installSnippet || ''
  form.authorName = row.authorName || ''
  form.license = row.license || ''
  form.risks = [...(row.risks || ['read'])]
  form.status = row.status
  form.featured = !!row.featured
  form.tagsText = (row.tags || []).join(', ')
  form.targets = (row.targets || []).map((t) => ({
    platform: t.platform,
    transport: t.transport || '',
    installCommand: t.installCommand || '',
    configJson: t.configJson || '',
    minVersion: t.minVersion || '',
    verified: !!t.verified,
  }))
  dialogVisible.value = true
}

const addTarget = () => {
  form.targets.push({ platform: '', transport: 'stdio', installCommand: '', configJson: '', minVersion: '', verified: false })
}

const submitForm = async () => {
  if (!form.name.trim()) {
    ElMessage.warning('请填写名称')
    return
  }
  submitting.value = true
  const payload = {
    slug: form.slug.trim() || undefined,
    type: form.type,
    name: form.name.trim(),
    tagline: form.tagline,
    description: form.description,
    repoUrl: form.repoUrl,
    homepageUrl: form.homepageUrl,
    installSnippet: form.installSnippet,
    authorName: form.authorName,
    license: form.license,
    risks: form.risks,
    status: form.status,
    featured: form.featured,
    tags: form.tagsText.split(',').map((s) => s.trim()).filter(Boolean),
    targets: form.targets
      .filter((t) => t.platform.trim())
      .map((t) => ({
        platform: t.platform.trim(),
        transport: t.transport || undefined,
        installCommand: t.installCommand || undefined,
        configJson: t.configJson || undefined,
        minVersion: t.minVersion || undefined,
        verified: t.verified,
      })),
  }
  try {
    if (isEdit.value && editingId.value) {
      await put('/api/admin/ai/items/' + editingId.value, payload)
      ElMessage.success('已保存')
    } else {
      await post('/api/admin/ai/items', payload)
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

const changeStatus = async (row: AiItem, status: string) => {
  try {
    await post('/api/admin/ai/items/' + row.id + '/status?status=' + encodeURIComponent(status))
    ElMessage.success('状态已更新')
    loadItems()
  } catch {
    ElMessage.error('状态更新失败')
  }
}

const toggleFeatured = async (row: AiItem) => {
  try {
    await post('/api/admin/ai/items/' + row.id + '/featured?featured=' + (!row.featured))
    ElMessage.success(row.featured ? '已取消精选' : '已设为精选')
    loadItems()
  } catch {
    ElMessage.error('操作失败')
  }
}

const removeItem = async (row: AiItem) => {
  try {
    await ElMessageBox.confirm('确定删除条目「' + row.name + '」吗？', '确认')
    await del('/api/admin/ai/items/' + row.id)
    ElMessage.success('已删除')
    loadItems()
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error('删除失败')
  }
}

onMounted(loadItems)
</script>

<template>
  <div>
    <div class="flex flex-wrap justify-between items-center gap-3 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">AI 广场管理</h1>
        <p class="mt-1 text-sm text-gray-500">录入条目、登记客户端兼容行、发布或下架</p>
      </div>
      <el-button type="primary" @click="openCreate">新建条目</el-button>
    </div>

    <div class="card mb-4 flex flex-wrap items-center gap-2">
      <el-select v-model="typeFilter" placeholder="全部类型" clearable style="width: 130px" @change="onFilter">
        <el-option v-for="t in TYPE_ORDER" :key="t" :label="TYPE_LABEL[t]" :value="t" />
      </el-select>
      <el-select v-model="statusFilter" placeholder="全部状态" clearable style="width: 130px" @change="onFilter">
        <el-option label="已发布" value="published" />
        <el-option label="待审核" value="pending" />
        <el-option label="已驳回" value="rejected" />
      </el-select>
      <el-input v-model="keyword" placeholder="搜索名称" clearable style="width: 200px" @keyup.enter="onFilter" />
      <el-button @click="onFilter">筛选</el-button>
    </div>

    <div class="card overflow-x-auto">
      <el-skeleton v-if="loading" :rows="5" animated />
      <template v-else>
        <el-table :data="items" class="min-w-[880px]">
          <el-table-column label="名称" min-width="200">
            <template #default="{ row }">
              <div class="flex items-center gap-2">
                <span class="font-medium text-gray-900">{{ row.name }}</span>
                <span v-if="row.featured" class="text-[11px] font-semibold text-amber-600">精选</span>
              </div>
              <p class="text-xs text-gray-400">{{ row.slug }}</p>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="90">
            <template #default="{ row }">{{ TYPE_LABEL[row.type] || row.type }}</template>
          </el-table-column>
          <el-table-column label="风险" width="150">
            <template #default="{ row }">
              <span v-for="r in row.risks" :key="r" class="ai-risk mr-1" :class="'ai-risk--' + r">{{ RISK_LABEL[r] || r }}</span>
            </template>
          </el-table-column>
          <el-table-column label="客户端" width="80">
            <template #default="{ row }">{{ (row.targets || []).length }}</template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">{{ STATUS_LABEL[row.status] || row.status }}</template>
          </el-table-column>
          <el-table-column label="操作" width="300" fixed="right">
            <template #default="{ row }">
              <el-button size="small" text type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button size="small" text type="primary" @click="toggleFeatured(row)">{{ row.featured ? '取消精选' : '精选' }}</el-button>
              <el-button v-if="row.status !== 'published'" size="small" text type="success" @click="changeStatus(row, 'published')">发布</el-button>
              <el-button v-else size="small" text type="warning" @click="changeStatus(row, 'pending')">下架</el-button>
              <el-button size="small" text type="danger" @click="removeItem(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div v-if="total > pageSize" class="flex justify-center mt-4">
          <el-pagination
            v-model:current-page="page"
            :page-size="pageSize"
            :total="total"
            layout="total, prev, pager, next"
            @current-change="handlePageChange"
          />
        </div>
      </template>
    </div>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑条目' : '新建条目'" width="720px" destroy-on-close>
      <el-form :model="form" label-width="90px">
        <div class="grid sm:grid-cols-2 gap-x-4">
          <el-form-item label="名称" required>
            <el-input v-model="form.name" placeholder="如 Playwright MCP" />
          </el-form-item>
          <el-form-item label="类型" required>
            <el-select v-model="form.type" style="width: 100%">
              <el-option v-for="t in TYPE_ORDER" :key="t" :label="TYPE_LABEL[t]" :value="t" />
            </el-select>
          </el-form-item>
          <el-form-item label="slug">
            <el-input v-model="form.slug" placeholder="留空自动按名称生成" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="form.status" style="width: 100%">
              <el-option label="已发布" value="published" />
              <el-option label="待审核" value="pending" />
              <el-option label="已驳回" value="rejected" />
            </el-select>
          </el-form-item>
        </div>

        <el-form-item label="一句话">
          <el-input v-model="form.tagline" placeholder="列表页显示的副标题" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="它做什么、适合什么场景" />
        </el-form-item>

        <div class="grid sm:grid-cols-2 gap-x-4">
          <el-form-item label="仓库">
            <el-input v-model="form.repoUrl" placeholder="https://github.com/..." />
          </el-form-item>
          <el-form-item label="主页">
            <el-input v-model="form.homepageUrl" placeholder="https://..." />
          </el-form-item>
          <el-form-item label="作者">
            <el-input v-model="form.authorName" />
          </el-form-item>
          <el-form-item label="许可">
            <el-input v-model="form.license" placeholder="MIT / Apache-2.0" />
          </el-form-item>
        </div>

        <el-form-item label="风险档位" required>
          <el-checkbox-group v-model="form.risks">
            <el-checkbox v-for="r in RISK_OPTIONS" :key="r" :value="r">{{ RISK_LABEL[r] }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="标签">
          <el-input v-model="form.tagsText" placeholder="英文逗号分隔，如 MCP, 浏览器" />
        </el-form-item>

        <el-form-item label="安装命令">
          <el-input v-model="form.installSnippet" type="textarea" :rows="2" placeholder="npx -y ..." />
        </el-form-item>

        <el-form-item label="精选">
          <el-switch v-model="form.featured" />
        </el-form-item>

        <el-form-item label="客户端">
          <div class="w-full space-y-2">
            <div v-for="(target, index) in form.targets" :key="index" class="rounded-lg border border-gray-200 p-3">
              <div class="flex flex-wrap items-center gap-2">
                <el-select v-model="target.platform" filterable allow-create placeholder="客户端" style="width: 150px">
                  <el-option v-for="p in PLATFORM_OPTIONS" :key="p" :label="p" :value="p" />
                </el-select>
                <el-select v-model="target.transport" clearable placeholder="传输" style="width: 110px">
                  <el-option label="stdio" value="stdio" />
                  <el-option label="sse" value="sse" />
                  <el-option label="http" value="http" />
                  <el-option label="skill" value="skill" />
                  <el-option label="cli" value="cli" />
                </el-select>
                <el-input v-model="target.minVersion" placeholder="最低版本" style="width: 110px" />
                <el-checkbox v-model="target.verified">已验证</el-checkbox>
                <el-button text type="danger" size="small" @click="form.targets.splice(index, 1)">移除</el-button>
              </div>
              <el-input v-model="target.installCommand" class="mt-2" placeholder="安装命令" />
              <el-input v-model="target.configJson" class="mt-2" type="textarea" :rows="2" placeholder="配置 JSON（可选）" />
            </div>
            <el-button size="small" @click="addTarget">添加客户端</el-button>
          </div>
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

