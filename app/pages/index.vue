<script setup lang="ts">
// 前台首页:博客主页(内容站)
const site = useSiteConfig()

useSeoMeta({
  description: site.description,
})
</script>

<template>
  <div>
    <BlogHome />
  </div>
</template>
