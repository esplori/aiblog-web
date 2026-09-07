<script setup lang="ts">
// 前台首页按站点模板分派：blog -> BlogHome（编辑部/内容站），corporate -> CorporateHome（企业官网）
const site = useSiteConfig()
const isCorporate = computed(() => site.template === 'corporate')

useSeoMeta({
  description: site.description,
})
</script>

<template>
  <div>
    <BlogHome v-if="!isCorporate" />
    <CorporateHome v-else />
  </div>
</template>
