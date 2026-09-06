<script setup lang="ts">
// 渲染前预取后端站点设置（SSR await 阻塞渲染；客户端随 payload 复用，不重复请求），
// 使站点名/描述/品牌色等跟随后台可配置项生效。
await useSiteSettings()

const site = useSiteConfig()
const { name, description, faviconUrl } = site

// 全局 head：站点名、描述与 favicon 均跟随生效配置（后端 site_settings > .env）
useHead({
  titleTemplate: (title?: string) =>
    title && title !== name ? `${title} | ${name}` : name,
  meta: [
    { name: 'description', content: description },
  ],
  link: [{ rel: 'icon', type: 'image/x-icon', href: faviconUrl || '/favicon.ico' }],
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
