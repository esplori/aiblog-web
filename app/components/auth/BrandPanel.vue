<script setup lang="ts">
/**
 * 品牌侧面板(仅 ≥lg 显示)。
 *
 * 白标口径(方案 G2):
 *   - `logoUrl` 配了就显示;没配**不留空白块**,而是靠下面的站名文字承担品牌识别;
 *   - 站名**恒显示**(这就是 logo 为空时的「回落」);
 *   - `tagline` 为空则不渲染该行。
 *
 * 对比度(§4.3):文字区底色由 `--auth-panel-base` + `.auth-brand__scrim` 压回近黑,
 * 品牌色只在 `.auth-brand__glow` 里做装饰 ⇒ 换任何品牌色,白字对比度都约 17:1。
 */
const { name, tagline, logoUrl } = useSiteConfig()
</script>

<template>
  <div class="auth-brand flex">
    <!-- 装饰层:aria-hidden,避免读屏读出无意义的空元素 -->
    <div class="auth-brand__glow" aria-hidden="true" />
    <div class="auth-brand__grid" aria-hidden="true" />
    <div class="auth-brand__scrim" aria-hidden="true" />

    <div class="relative z-10 flex w-full flex-col justify-center px-10 py-16 xl:px-16">
      <!-- 站名用 <p> 而非标题:页面唯一的 <h1> 留给表单卡标题,避免标题层级打架 -->
      <img
        v-if="logoUrl"
        :src="logoUrl"
        :alt="name"
        class="mb-8 h-10 max-w-[200px] object-contain"
      />
      <p class="text-3xl font-bold leading-tight text-white xl:text-4xl">{{ name }}</p>
      <p v-if="tagline" class="mt-4 max-w-sm text-base leading-relaxed text-white/70">
        {{ tagline }}
      </p>
    </div>
  </div>
</template>
