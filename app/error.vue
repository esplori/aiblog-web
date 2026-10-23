<script setup lang="ts">
/**
 * 全局错误页：404 / 500 都在这里收口。
 * 之前没有这个文件，Nuxt 会掉回内置的英文默认页，观感和品牌完全不搭。
 *
 * 约束：error.vue 里不能再用 useAsyncData / 依赖 Pinia store 的数据，
 * 否则错误状态下可能再次报错（Nuxt 会在没有 app 实例的上下文里渲染它）。
 */
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const status = computed(() => Number(props.error?.statusCode) || 500)
const isNotFound = computed(() => status.value === 404)

const title = computed(() => (isNotFound.value ? '页面走丢了' : '服务出了点问题'))
const detail = computed(() => {
  if (isNotFound.value) return '链接可能已失效，或者文章被作者撤回了。'
  return props.error?.message || '后端暂时没有响应，稍后再试试。'
})

const goHome = () => clearError({ redirect: '/' })
const goBack = () => {
  if (import.meta.client && window.history.length > 1) window.history.back()
  else clearError({ redirect: '/' })
}

useHead({ title: `${status.value} · ${title.value}` })
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-white px-6">
    <div class="w-full max-w-lg text-center">
      <p class="text-[72px] font-black leading-none text-[var(--color-brand)] opacity-90">
        {{ status }}
      </p>
      <h1 class="mt-4 text-xl font-semibold text-[#1f1f1f]">{{ title }}</h1>
      <p class="mt-3 text-sm leading-relaxed text-gray-500">{{ detail }}</p>
      <div class="mt-8 flex items-center justify-center gap-3">
        <button
          class="rounded-lg bg-[var(--color-brand)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          @click="goHome"
        >
          回到首页
        </button>
        <button
          class="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-[#1f1f1f] transition hover:bg-gray-50"
          @click="goBack"
        >
          返回上一页
        </button>
      </div>
      <p class="mt-10 text-xs text-gray-400">
        如果这个页面本该存在，可以联系站点管理员。
      </p>
    </div>
  </div>
</template>
