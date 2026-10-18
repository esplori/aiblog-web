<script setup lang="ts">
import type { InterviewApplication, InterviewCompany } from '~/types/interview'
import { APPLICATION_STAGES, positionLabel, POSITION_OPTIONS } from '~/types/interview'

// 投递看板（P2）：五档阶段纵向并列，卡片可直接改阶段 / 删除
definePageMeta({ layout: 'workbench' })

const authStore = useAuthStore()
const { get, post, put, del, request } = useApi()

const loginUrl = computed(() => '/login?redirect=' + encodeURIComponent('/interview/applications'))

const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const items = ref<InterviewApplication[]>([])
const companies = ref<InterviewCompany[]>([])

const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({
  companyId: '',
  position: '',
  stage: 'applied',
  appliedAt: '',
  note: '',
})

const today = () => new Date().toISOString().slice(0, 10)

/** 按阶段分组，保证五列始终存在（空列也显示，避免看板塌陷） */
const columns = computed(() =>
  APPLICATION_STAGES.map((stage) => ({
    ...stage,
    items: items.value.filter((item) => (item.stage || 'applied') === stage.key),
  })),
)

const stats = computed(() => ({
  total: items.value.length,
  active: items.value.filter((item) => ['screening', 'interview'].includes(item.stage)).length,
  offer: items.value.filter((item) => item.stage === 'offer').length,
  rejected: items.value.filter((item) => item.stage === 'rejected').length,
}))

const load = async () => {
  if (!authStore.isLoggedIn) return
  loading.value = true
  errorMessage.value = ''
  try {
    const [listRes, companyRes] = await Promise.all([
      get<InterviewApplication[]>('/api/interview/applications'),
      get<InterviewCompany[]>('/api/interview/companies').catch(() => null),
    ])
    items.value = listRes?.data || []
    companies.value = companyRes?.data || []
  } catch (error: any) {
    errorMessage.value = error?.data?.message || '加载投递记录失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  editingId.value = null
  form.companyId = ''
  form.position = ''
  form.stage = 'applied'
  form.appliedAt = today()
  form.note = ''
  errorMessage.value = ''
  dialogVisible.value = true
}

const openEdit = (item: InterviewApplication) => {
  editingId.value = item.id
  form.companyId = item.companyId ? String(item.companyId) : ''
  form.position = item.position || ''
  form.stage = item.stage || 'applied'
  form.appliedAt = (item.appliedAt || '').slice(0, 10)
  form.note = item.note || ''
  errorMessage.value = ''
  dialogVisible.value = true
}

const submit = async () => {
  if (!form.position.trim()) {
    errorMessage.value = '请填写岗位'
    return
  }
  saving.value = true
  errorMessage.value = ''
  try {
    const payload = {
      companyId: form.companyId ? Number(form.companyId) : null,
      position: form.position.trim(),
      stage: form.stage,
      appliedAt: form.appliedAt || null,
      note: form.note.trim() || null,
    }
    if (editingId.value) {
      await put(`/api/interview/applications/${editingId.value}`, payload)
    } else {
      await post('/api/interview/applications', payload)
    }
    dialogVisible.value = false
    await load()
  } catch (error: any) {
    errorMessage.value = error?.data?.message || '保存失败，请稍后重试'
  } finally {
    saving.value = false
  }
}

/** 改阶段：先本地乐观更新，失败回滚重拉，保证看板手感 */
const changeStage = async (item: InterviewApplication, stage: string) => {
  const previous = item.stage
  item.stage = stage
  try {
    await request(`/api/interview/applications/${item.id}/stage`, {
      method: 'PATCH',
      body: { stage },
    })
  } catch {
    item.stage = previous
    await load()
  }
}

const remove = async (item: InterviewApplication) => {
  try {
    await del(`/api/interview/applications/${item.id}`)
    items.value = items.value.filter((row) => row.id !== item.id)
  } catch (error: any) {
    errorMessage.value = error?.data?.message || '删除失败，请稍后重试'
  }
}

onMounted(load)
watch(() => authStore.isLoggedIn, load)
</script>

<template>
  <div class="mx-auto max-w-6xl">
    <div v-if="!authStore.isLoggedIn" class="card mx-auto max-w-xl py-10 text-center">
      <p class="text-sm text-slate-500">投递看板属于个人数据，登录后使用</p>
      <NuxtLink :to="loginUrl" class="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700">去登录</NuxtLink>
    </div>

    <template v-else>
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-[11px] text-slate-400">求职闭环</p>
          <h1 class="mt-1 text-lg font-bold text-slate-900">投递看板</h1>
          <p class="mt-1 text-xs text-slate-500">
            共 {{ stats.total }} 条 · 进行中 {{ stats.active }} · Offer {{ stats.offer }} · 已结束 {{ stats.rejected }}
          </p>
        </div>
        <button class="rounded-lg bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700" @click="openCreate">+ 记一条投递</button>
      </header>

      <p v-if="errorMessage" class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{{ errorMessage }}</p>

      <div v-if="loading" class="mt-6 text-sm text-slate-400">加载中…</div>

      <div v-else class="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <section v-for="column in columns" :key="column.key" class="card flex flex-col p-3">
          <header class="mb-2 flex items-center justify-between px-1">
            <span class="rounded px-2 py-0.5 text-xs font-medium" :class="column.tone">{{ column.label }}</span>
            <span class="text-xs text-slate-400">{{ column.items.length }}</span>
          </header>

          <ul class="space-y-2">
            <li v-for="item in column.items" :key="item.id" class="rounded-lg border border-slate-200 bg-white p-3">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-slate-900">{{ item.companyName || '未指定公司' }}</p>
                  <p class="mt-0.5 truncate text-xs text-slate-500">
                    {{ item.position }}<span v-if="item.appliedAt"> · {{ item.appliedAt }}</span>
                  </p>
                </div>
              </div>
              <p v-if="item.note" class="mt-2 line-clamp-2 text-xs text-slate-500">{{ item.note }}</p>

              <div class="mt-2 flex items-center justify-between gap-1">
                <select
                  class="rounded border border-slate-200 bg-white px-1 py-0.5 text-[11px] text-slate-600"
                  :value="item.stage"
                  @change="changeStage(item, ($event.target as HTMLSelectElement).value)"
                >
                  <option v-for="stage in APPLICATION_STAGES" :key="stage.key" :value="stage.key">{{ stage.label }}</option>
                </select>
                <div class="flex items-center gap-1">
                  <button class="text-[11px] text-slate-400 hover:text-brand-600" @click="openEdit(item)">编辑</button>
                  <button class="text-[11px] text-slate-400 hover:text-red-500" @click="remove(item)">删除</button>
                </div>
              </div>
            </li>
            <li v-if="!column.items.length" class="rounded-lg border border-dashed border-slate-200 py-6 text-center text-[11px] text-slate-300">
              暂无记录
            </li>
          </ul>
        </section>
      </div>
    </template>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑投递' : '新建投递'" width="440px">
      <div class="space-y-3">
        <div>
          <label class="mb-1 block text-xs text-slate-500">公司（可留空）</label>
          <select v-model="form.companyId" class="w-full rounded border border-slate-200 px-2 py-1.5 text-sm">
            <option value="">不指定</option>
            <option v-for="company in companies" :key="company.id" :value="String(company.id)">{{ company.name }}</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-xs text-slate-500">岗位</label>
          <input v-model="form.position" class="w-full rounded border border-slate-200 px-2 py-1.5 text-sm" placeholder="如：Java 后端" />
          <p class="mt-1 text-[11px] text-slate-400">
            常见岗位：
            <button
              v-for="position in POSITION_OPTIONS"
              :key="position"
              class="mr-1 text-brand-600 hover:underline"
              @click="form.position = positionLabel(position)"
            >{{ positionLabel(position) }}</button>
          </p>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1 block text-xs text-slate-500">阶段</label>
            <select v-model="form.stage" class="w-full rounded border border-slate-200 px-2 py-1.5 text-sm">
              <option v-for="stage in APPLICATION_STAGES" :key="stage.key" :value="stage.key">{{ stage.label }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs text-slate-500">投递日期</label>
            <input v-model="form.appliedAt" type="date" class="w-full rounded border border-slate-200 px-2 py-1.5 text-sm" />
          </div>
        </div>
        <div>
          <label class="mb-1 block text-xs text-slate-500">备注</label>
          <textarea v-model="form.note" rows="3" class="w-full rounded border border-slate-200 px-2 py-1.5 text-sm" placeholder="内推人、JD 要点、面试反馈…" />
        </div>
      </div>
      <template #footer>
        <button class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:border-brand-300" @click="dialogVisible = false">取消</button>
        <button class="ml-2 rounded-lg bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700 disabled:opacity-60" :disabled="saving" @click="submit">{{ saving ? '保存中…' : '保存' }}</button>
      </template>
    </el-dialog>
  </div>
</template>
