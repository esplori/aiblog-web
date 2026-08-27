<script setup lang="ts">
// 全局 title 规则：有子标题时拼接 "xxx | Pylox"，首页等无子标题时显示 "Pylox"
useHead({
  titleTemplate: (title?: string) =>
    title && title !== 'Pylox' ? `${title} | Pylox` : 'Pylox',
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
