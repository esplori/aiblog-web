<script setup lang="ts">
const { name } = useSiteConfig()

// 全局 title 规则：有子标题时拼接 "xxx | {站点名}"，首页等无子标题时显示 "{站点名}"
useHead({
  titleTemplate: (title?: string) =>
    title && title !== name ? `${title} | ${name}` : name,
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
