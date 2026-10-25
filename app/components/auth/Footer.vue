<script setup lang="ts">
/**
 * 页脚(版权 / footerText / ICP 备案号)。
 *
 * 为什么需要:`/login` 是 `layout: false`,不套 `layouts/default.vue` ⇒
 * 整站页脚(**含 ICP 备案号**)在登录页曾经完全缺失,属合规回归(审计 V6)。
 */
const { name, copyright, footerText, icp } = useSiteConfig()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="auth-footer">
    <p>{{ copyright || `© ${year} ${name}` }}</p>
    <p v-if="footerText">{{ footerText }}</p>
    <a v-if="icp" href="https://beian.miit.gov.cn/" target="_blank" rel="noopener">{{ icp }}</a>
  </footer>
</template>
