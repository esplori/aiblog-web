<script setup lang="ts">
import type { PageResult } from '~/types'
import type { AiItem } from '~/types/ai'
import { RISK_HINT, RISK_LABEL, STATUS_LABEL, TYPE_LABEL } from '~/types/ai'

definePageMeta({ layout: 'workbench' })

const route = useRoute()
const { get } = useApi()
const slug = computed(() => String(route.params.slug))

const { data, pending } = await useAsyncData(
  () => 'ai-item-' + slug.value,
  () => get<AiItem>('/api/ai/items/' + slug.value),
  { default: () => null, watch: [slug] }
)
const item = computed(() => data.value?.data || null)

if (!pending.value && !item.value) {
  throw createError({ statusCode: 404, statusMessage: '条目不存在', fatal: true })
}

const { data: relatedData } = await useAsyncData(
  () => 'ai-related-' + slug.value,
  () => get<PageResult<AiItem>>('/api/ai/items', { type: item.value?.type, size: 4, sort: 'stars' }),
  { default: () => null, watch: [slug] }
)
const related = computed(() =>
  (((relatedData.value?.data as PageResult<AiItem>)?.records) || [])
    .filter((i) => i.slug !== slug.value)
    .slice(0, 3)
)

useSeoMeta({
  title: () => (item.value ? item.value.name + ' · AI 广场' : 'AI 条目'),
  description: () => item.value?.tagline || 'AI 广场条目详情',
})

// 执行级条目常驻警示（安全底线，不因为版面紧张而省略）
const hasExec = computed(() => (item.value?.risks || []).includes('exec'))

const copyKey = ref('')
const copy = async (text: string | null | undefined, key: string) => {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    copyKey.value = key
    setTimeout(() => {
      copyKey.value = ''
    }, 1500)
  } catch {
    /* 忽略剪贴板不可用（非 https / 老浏览器） */
  }
}

watch(
  item,
  (v) => {
    if (v) useRecentReading().remember({ path: '/ai/' + v.slug, title: v.name, kind: 'ai' })
  },
  { immediate: true }
)
</script>

<template>
  <div v-if="item">
    <NuxtLink to="/ai" class="text-xs text-slate-400 hover:text-brand-600">← 返回 AI 广场</NuxtLink>

    <!-- 头部 -->
    <div class="mt-3 mb-4 flex flex-wrap items-center gap-2">
      <TypeTag :type="item.type" />
      <span v-if="item.featured" class="text-[11px] font-semibold text-amber-600">编辑精选</span>
      <span v-if="item.status !== 'published'" class="text-[11px] text-slate-400">{{ STATUS_LABEL[item.status] || item.status }}</span>
      <span class="ml-auto text-xs text-slate-400">
        ★ {{ item.starCount }} · 实测 {{ item.reportCount }} 条 · 浏览 {{ item.viewCount }}
      </span>
    </div>

    <h1 class="text-xl font-bold text-slate-900">{{ item.name }}</h1>
    <p class="mt-1.5 text-sm text-slate-500">{{ item.tagline }}</p>

    <div class="mt-3 flex flex-wrap items-center gap-2">
      <RiskBadges :risks="item.risks" />
      <a
        v-if="item.repoUrl"
        :href="item.repoUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600"
      >
        <AppIcon name="external" class="w-[14px] h-[14px]" />仓库
      </a>
      <a
        v-if="item.homepageUrl"
        :href="item.homepageUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600"
      >
        <AppIcon name="external" class="w-[14px] h-[14px]" />主页
      </a>
    </div>

    <div v-if="hasExec" class="ai-warn mt-4">
      <AppIcon name="shield" />
      <div>
        <p class="font-semibold">这个条目会执行命令（执行级）</p>
        <p>
          安装或运行前请先看清安装命令与配置内容；{{ RISK_HINT.exec }}。不确定时先在测试环境试一遍。
        </p>
      </div>
    </div>

    <div class="grid lg:grid-cols-[minmax(0,1fr)_260px] gap-6 mt-5">
      <div class="space-y-4">
        <!-- 说明 -->
        <section class="bg-white rounded-xl border border-slate-200 p-5">
          <h2 class="text-sm font-semibold text-slate-900 mb-2">它做什么</h2>
          <p class="text-sm leading-relaxed text-slate-600">{{ item.description || item.tagline }}</p>
        </section>

        <!-- 安装 -->
        <section v-if="item.installSnippet" class="bg-white rounded-xl border border-slate-200 p-5">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-sm font-semibold text-slate-900">快速安装</h2>
            <button type="button" class="text-xs text-slate-400 hover:text-brand-600" @click="copy(item.installSnippet, 'snippet')">
              {{ copyKey === 'snippet' ? '已复制' : '复制' }}
            </button>
          </div>
          <pre class="ai-code">{{ item.installSnippet }}</pre>
        </section>

        <!-- 客户端兼容 -->
        <section class="bg-white rounded-xl border border-slate-200 p-5">
          <h2 class="text-sm font-semibold text-slate-900 mb-1">能不能跑（客户端兼容）</h2>
          <p class="text-xs text-slate-400 mb-3">「已验证」表示编辑在对应客户端实际装过并跑通</p>
          <div v-if="item.targets?.length" class="space-y-2">
            <div
              v-for="target in item.targets"
              :key="target.platform"
              class="rounded-lg border border-slate-200 p-3"
            >
              <div class="flex flex-wrap items-center gap-2 text-sm">
                <span class="font-medium text-slate-800">{{ target.platform }}</span>
                <span v-if="target.transport" class="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">{{ target.transport }}</span>
                <span v-if="target.minVersion" class="text-[11px] text-slate-400">≥ {{ target.minVersion }}</span>
                <span
                  class="ml-auto text-[11px] font-semibold"
                  :class="target.verified ? 'text-emerald-600' : 'text-amber-600'"
                >
                  {{ target.verified ? '已验证' : '待验证' }}
                </span>
              </div>
              <div v-if="target.installCommand" class="mt-2 flex items-start gap-2">
                <pre class="ai-code flex-1">{{ target.installCommand }}</pre>
                <button type="button" class="text-xs text-slate-400 hover:text-brand-600 shrink-0" @click="copy(target.installCommand, target.platform)">
                  {{ copyKey === target.platform ? '已复制' : '复制' }}
                </button>
              </div>
              <pre v-if="target.configJson" class="ai-code mt-2">{{ target.configJson }}</pre>
            </div>
          </div>
          <p v-else class="text-sm text-slate-400">还没有登记客户端兼容信息。</p>
        </section>

        <!-- 相关 -->
        <section v-if="related.length" class="bg-white rounded-xl border border-slate-200 p-5">
          <h2 class="text-sm font-semibold text-slate-900 mb-3">同类条目</h2>
          <ul class="space-y-2">
            <li v-for="r in related" :key="r.slug" class="flex items-center gap-2">
              <TypeTag :type="r.type" />
              <NuxtLink :to="'/ai/' + r.slug" class="text-sm text-slate-700 hover:text-brand-600 truncate">{{ r.name }}</NuxtLink>
              <span class="ml-auto text-[11px] text-slate-400">★ {{ r.starCount }}</span>
            </li>
          </ul>
        </section>
      </div>

      <!-- 侧栏 -->
      <aside class="space-y-4">
        <section class="bg-white rounded-xl border border-slate-200 p-4 text-sm">
          <h2 class="text-sm font-semibold text-slate-900 mb-3">基本信息</h2>
          <dl class="space-y-2 text-[13px]">
            <div class="flex"><dt class="text-slate-400 w-16 shrink-0">类型</dt><dd class="text-slate-700">{{ TYPE_LABEL[item.type] || item.type }}</dd></div>
            <div class="flex"><dt class="text-slate-400 w-16 shrink-0">作者</dt><dd class="text-slate-700 truncate">{{ item.authorName || '—' }}</dd></div>
            <div class="flex"><dt class="text-slate-400 w-16 shrink-0">许可</dt><dd class="text-slate-700">{{ item.license || '—' }}</dd></div>
            <div class="flex"><dt class="text-slate-400 w-16 shrink-0">字号</dt><dd class="text-slate-700 font-mono">{{ item.slug }}</dd></div>
            <div class="flex"><dt class="text-slate-400 w-16 shrink-0">上线</dt><dd class="text-slate-700">{{ (item.publishedAt || item.createdAt || '').slice(0, 10) }}</dd></div>
          </dl>
        </section>

        <section v-if="item.tags?.length" class="bg-white rounded-xl border border-slate-200 p-4">
          <h2 class="text-sm font-semibold text-slate-900 mb-3">标签</h2>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="tag in item.tags" :key="tag" class="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{{ tag }}</span>
          </div>
        </section>

        <section class="bg-white rounded-xl border border-slate-200 p-4 text-xs leading-relaxed text-slate-500">
          <h2 class="text-sm font-semibold text-slate-900 mb-2">权限风险说明</h2>
          <p v-for="risk in item.risks" :key="risk" class="mt-1">
            <span class="ai-risk" :class="'ai-risk--' + risk">{{ RISK_LABEL[risk] || risk }}</span>
            <span class="ml-1">{{ RISK_HINT[risk] }}</span>
          </p>
        </section>
      </aside>
    </div>
  </div>
</template>

