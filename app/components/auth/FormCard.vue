<script setup lang="ts">
/**
 * 表单卡片容器:白底 + 全站统一的圆角/阴影 + 标题。
 *
 * 标题用页面**唯一**的 <h1>(品牌侧站名刻意用 <p>,避免标题层级打架 —— 验收 A-14)。
 */
defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <div class="auth-card">
    <div class="mb-6 text-center">
      <h1 class="text-2xl font-bold text-gray-800">{{ title }}</h1>
      <p v-if="subtitle" class="mt-2 text-sm text-gray-500">{{ subtitle }}</p>
    </div>
    <slot />
  </div>
</template>
