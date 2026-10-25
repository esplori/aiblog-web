<script setup lang="ts">
/**
 * 表单卡片容器:玻璃卡 + 标题。
 *
 * 标题用页面**唯一**的 <h1>(品牌侧站名刻意用 <p>,避免标题层级打架 —— 验收 A-14)。
 */
defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <div class="auth-card">
    <div class="auth-card__head">
      <h1 class="auth-card__title">{{ title }}</h1>
      <p v-if="subtitle" class="auth-card__sub">{{ subtitle }}</p>
    </div>
    <slot />
    <!-- 页脚放在卡内:卡外的页脚会留下一条游离的分割线(视觉断裂) -->
    <div v-if="$slots.foot" class="auth-card__foot">
      <slot name="foot" />
    </div>
  </div>
</template>
