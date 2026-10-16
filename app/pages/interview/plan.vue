<script setup lang="ts">
import type { PageResult } from '~/types'
import type {
  InterviewCompany,
  InterviewPlanResponse,
  InterviewProgress,
  InterviewQuestion,
} from '~/types/interview'
import { POSITION_OPTIONS, positionLabel } from '~/types/interview'

// 个人备战台（P2）：目标公司 + 倒计时 + 进度 + 该公司最新题目
definePageMeta({ layout: 'workbench' })

const authStore = useAuthStore()
const { get, put, del } = useApi()

const loginUrl = computed(() => '/login?redirect=' + encodeURIComponent('/interview/plan'))

const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const actionError = ref('')

const planData = ref<InterviewPlanResponse | null>(null)
const plan = computed(() => planData.value?.plan || null)
const progress = computed<InterviewProgress | null>(() => planData.value?.progress || null)

const companies = ref<InterviewCompany[]>([])
const companyQuestions = ref<InterviewQuestion[]>([])

const form = reactive({
  targetCompanyId: '',
  position: '',
  interviewDate: '',
  note: '',
})

const syncForm = () => {
  form.targetCompanyId = plan.value?.targetCompanyId ? String(plan.value.targetCompanyId) : ''
  form.position = plan.value?.position || ''
  form.interviewDate = (plan.value?.interviewDate || '').slice(0, 10)
  form.note = plan.value?.note || ''
}

/** 计划里的 daysLeft 优先；后端没给时按 interviewDate 本地算，保证倒计时不空 */
const daysLeft = computed<number | null>(() => {
  if (plan.value?.daysLeft !== undefined && plan.value?.daysLeft !== null) return Number(plan.value.daysLeft)
  const raw = plan.value?.interviewDate
  if (!raw) return null
  const target = new Date(String(raw).slice(0, 10) + 'T00:00:00')
  if (Number.isNaN(target.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
})

const countdownText = computed(() => {
  const left = daysLeft.value
  if (left === null) return '未设置面试日期'
  if (left > 0) return `还有 ${left} 天`
  if (left === 0) return '就是今天'
  return `已过 ${Math.abs(left)} 天`
})

const countdownTone = computed(() => {
  const left = daysLeft.value
  if (left === null) return 'text-slate-400'
  if (left < 0) return 'text-slate-400'
  if (left === 0) return 'text-brand-600'
  if (left <= 7) return 'text-brand-600'
  return 'text-slate-900'
})

const loadCompanyQuestions = async (companyId: number) => {
  try {
    const res = await get<PageResult<InterviewQuestion>>('/api/interview/questions', {
      companyId,
      size: 6,
      sort: 'latest',
    })
    companyQuestions.value = res.data?.records || []
  } catch {
    companyQuestions.value = []
  }
}

const load = async () => {
  if (!authStore.isLoggedIn) return
  loading.value = true
  errorMessage.value = ''
  try {
    const [planRes, companyRes] = await Promise.all([
      get<InterviewPlanResponse>('/api/interview/plan'),
      get<InterviewCompany[]>('/api/interview/companies').catch(() => null),
    ])
    planData.value = planRes.data || null
    companies.value = companyRes?.data || []
    syncForm()
    if (plan.value?.targetCompanyId) {
      await loadCompanyQuestions(Number(plan.value.targetCompanyId))
    } else {
      companyQuestions.value = []
    }
  } catch (e: any) {
    errorMessage.value = e?.data?.message || e?.message || '备战台数据加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

const save = async () => {
  if (saving.value) return
  saving.value = true
  actionError.value = ''
  try {
    await put<InterviewPlanResponse>('/api/interview/plan', {
      targetCompanyId: form.targetCompanyId ? Number(form.targetCompanyId) : null,
      position: form.position || null,
      interviewDate: form.interviewDate || null,
      note: form.note || null,
    })
    await load()
  } catch (e: any) {
    actionError.value = e?.data?.message || e?.message || '保存失败，请稍后重试'
  } finally {
    saving.value = false
  }
}

const clearPlan = async () => {
  if (saving.value) return
  saving.value = true
  actionError.value = ''
  try {
    await del<null>('/api/interview/plan')
    form.targetCompanyId = ''
    form.position = ''
    form.interviewDate = ''
    form.note = ''
    await load()
  } catch (e: any) {
    actionError.value = e?.data?.message || e?.message || '清除失败，请稍后重试'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  load()
})

useSeoMeta({
  title: '备战台 · 面试',
  description: '设置目标公司与面试倒计时，跟踪个人面试准备进度。',
})
</script>

<template>
  <div>
    <!-- 未登录：不调接口，只显示引导 -->
    <section v-if="!authStore.isLoggedIn" class="card mx-auto max-w-xl py-10 text-center">
      <h1 class="text-lg font-bold text-slate-900">登录后设置目标公司与面试倒计时</h1>
      <p class="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
        备战台会记录你的目标公司、岗位与面试日期，并按天倒计时提醒；绑定公司后还能直接看到该公司的最新题目。
      </p>
      <NuxtLink
        :to="loginUrl"
        class="mt-5 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
      >去登录</NuxtLink>
    </section>

    <template v-else>
      <!-- 加载骨架 -->
      <div v-if="loading && !planData" class="space-y-4">
        <div class="card">
          <div class="h-4 w-24 rounded bg-slate-100" />
          <div class="mt-3 h-8 w-40 rounded bg-slate-100" />
        </div>
        <div class="card">
          <div class="h-3 w-full rounded bg-slate-100" />
          <div class="mt-3 h-3 w-2/3 rounded bg-slate-100" />
        </div>
      </div>

      <!-- 接口失败：友好提示，不白屏 -->
      <section v-else-if="errorMessage" class="card py-10 text-center">
        <p class="text-sm text-slate-500">{{ errorMessage }}</p>
        <button
          type="button"
          class="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:border-brand-300 hover:text-brand-600"
          @click="load"
        >重试</button>
      </section>

      <div v-else class="space-y-5">
        <!-- 倒计时大卡 -->
        <section class="card">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="text-[11px] text-slate-400">面试倒计时</p>
              <h1 class="mt-1 text-lg font-bold text-slate-900">
                {{ plan?.targetCompanyName || '还未设置目标公司' }}
              </h1>
              <p class="mt-1 text-xs text-slate-500">
                <template v-if="plan">
                  {{ positionLabel(plan.position) }}
                  <template v-if="plan.interviewDate">
                    · 面试日期 {{ String(plan.interviewDate).slice(0, 10) }}
                  </template>
                </template>
                <template v-else>在下方选择目标公司、岗位与面试日期</template>
              </p>
              <p v-if="plan?.note" class="mt-2 max-w-xl text-xs leading-relaxed text-slate-500">{{ plan.note }}</p>
            </div>
            <div class="text-right">
              <p class="text-2xl font-bold leading-tight" :class="countdownTone">{{ countdownText }}</p>
              <p v-if="!plan" class="mt-1 text-[11px] text-slate-400">设置后自动计算</p>
            </div>
          </div>
        </section>

        <!-- 进度卡 -->
        <section class="card">
          <h2 class="text-sm font-semibold text-slate-900">我的进度</h2>
          <div class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p class="text-xl font-bold text-slate-900">{{ progress?.markedCount ?? 0 }}</p>
              <p class="mt-0.5 text-[11px] text-slate-400">已标记</p>
            </div>
            <div>
              <p class="text-xl font-bold text-slate-900">{{ progress?.masteredCount ?? 0 }}</p>
              <p class="mt-0.5 text-[11px] text-slate-400">已掌握</p>
            </div>
            <div>
              <p class="text-xl font-bold text-slate-900">{{ progress?.cardTotal ?? 0 }}</p>
              <p class="mt-0.5 text-[11px] text-slate-400">卡片总数</p>
            </div>
            <div>
              <p class="text-xl font-bold text-slate-900">{{ progress?.dueToday ?? 0 }}</p>
              <p class="mt-0.5 text-[11px] text-slate-400">今日待复习</p>
            </div>
          </div>
          <NuxtLink
            to="/interview/review"
            class="mt-4 inline-block text-xs text-slate-500 hover:text-brand-600"
          >去今日复习 →</NuxtLink>
        </section>

        <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <!-- 目标公司最新题目 -->
          <div class="space-y-4">
            <section v-if="plan?.targetCompanyId">
              <div class="mb-3 flex items-center justify-between">
                <h2 class="text-sm font-semibold text-slate-900">
                  {{ plan.targetCompanyName }} 最新题目
                </h2>
                <NuxtLink to="/interview/review" class="text-xs text-slate-500 hover:text-brand-600">去复习 →</NuxtLink>
              </div>
              <div v-if="companyQuestions.length" class="grid gap-3 sm:grid-cols-2">
                <QuestionCard v-for="item in companyQuestions" :key="item.id" :question="item" />
              </div>
              <div v-else class="card text-xs text-slate-400">该公司暂无题目</div>
            </section>
          </div>

          <!-- 设置目标表单 -->
          <aside>
            <form class="card" @submit.prevent="save">
              <h2 class="text-sm font-semibold text-slate-900">设置目标</h2>

              <label class="mt-3 block text-[11px] text-slate-400" for="plan-company">目标公司</label>
              <select id="plan-company" v-model="form.targetCompanyId" class="interview-select mt-1 w-full">
                <option value="">不绑定</option>
                <option v-for="company in companies" :key="company.id" :value="String(company.id)">{{ company.name }}</option>
              </select>

              <label class="mt-3 block text-[11px] text-slate-400" for="plan-position">岗位</label>
              <select id="plan-position" v-model="form.position" class="interview-select mt-1 w-full">
                <option value="">未指定</option>
                <option v-for="item in POSITION_OPTIONS" :key="item" :value="item">{{ positionLabel(item) }}</option>
              </select>

              <label class="mt-3 block text-[11px] text-slate-400" for="plan-date">面试日期</label>
              <input id="plan-date" v-model="form.interviewDate" type="date" class="interview-select mt-1 w-full" />

              <label class="mt-3 block text-[11px] text-slate-400" for="plan-note">备注</label>
              <textarea
                id="plan-note"
                v-model="form.note"
                rows="3"
                placeholder="面试轮次、地点、要重点补的点…"
                class="interview-select mt-1 w-full resize-y"
              />

              <p v-if="actionError" class="mt-3 text-xs text-rose-600">{{ actionError }}</p>

              <div class="mt-4 flex items-center gap-2">
                <button
                  type="submit"
                  class="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-60"
                  :disabled="saving"
                >{{ saving ? '保存中…' : '保存' }}</button>
                <button
                  type="button"
                  class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:border-brand-300 hover:text-brand-600 disabled:opacity-60"
                  :disabled="saving || !plan"
                  @click="clearPlan"
                >清除</button>
              </div>
            </form>
          </aside>
        </div>
      </div>
    </template>
  </div>
</template>
