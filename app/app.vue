<script setup lang="ts">
const { name, description } = useSiteConfig()

// 全局 head：站点名与描述均跟随运行时配置（覆盖 nuxt.config 构建期静态值，
// 使 .output 服务启动时注入 env 即可生效，无需重新构建）
useHead({
  titleTemplate: (title?: string) =>
    title && title !== name ? `${title} | ${name}` : name,
  meta: [
    { name: 'description', content: description },
  ],
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
