<script setup lang="ts">
/**
 * 品牌侧面板(仅 ≥lg 显示)。
 *
 * 白标口径(方案 G2):
 *   - `logoUrl` 配了就显示;没配**不留空白块** —— 顶部回落到「首字母方块 + 站名」;
 *   - 站名**恒显示**(大标题就是站名),`logoUrl` 有值时也不丢文字品牌;
 *   - `tagline` 为空则不渲染该行。
 *
 * 对比度(§4.3):文字区底色由固定的 `--auth-bg` 与左栏玻璃层压住,品牌色只在
 * `.auth-brand__glow` 与整屏光斑里做装饰 ⇒ 换任何品牌色,白字对比度都约 17:1。
 */
const { name, logoUrl } = useSiteConfig()

/**
 * 登录页口号(双语)。刻意不走 site.tagline:那句是给 SEO/首页用的长描述,
 * 放在门面上太长太空。白标站点要换语气,改这两个常量即可。
 */
const SLOGAN_EN = ['Ideas in,', 'work out.'] as const
const SLOGAN_CN = '想法进来，成品出去'

/** 首字母方块:站名为空时退到 '·',不留空格子 */
const mark = computed(() => (name || '').trim().charAt(0).toUpperCase() || '·')
</script>

<template>
  <div class="auth-brand">
    <!-- 装饰层:aria-hidden,避免读屏读出无意义的空元素 -->
    <div class="auth-brand__glow" aria-hidden="true" />

    <div class="auth-brand__inner">
      <div class="auth-brand__top">
        <img v-if="logoUrl" :src="logoUrl" :alt="name" class="auth-brand__logo" />
        <template v-else>
          <span class="auth-brand__mark" aria-hidden="true">{{ mark }}</span>
          <b class="auth-brand__name">{{ name }}</b>
        </template>
      </div>

      <div class="auth-brand__mid">
        <div class="auth-brand__eyebrow">Blog × Agent</div>
        <!-- 口号用 <p> 而非标题:页面唯一的 <h1> 留给表单卡标题,避免标题层级打架。
             站名在上方品牌条里恒显示,这里不再重复 -->
        <p class="auth-brand__title">
          {{ SLOGAN_EN[0] }}<br />{{ SLOGAN_EN[1] }}
        </p>
        <div class="auth-brand__rule" aria-hidden="true" />
        <p class="auth-brand__tagline">{{ SLOGAN_CN }}</p>
      </div>

      <!-- 底部留空锚点:版权/备案号统一在卡片页脚出现,避免同一页重复两次 -->
      <div class="auth-brand__bot" aria-hidden="true" />
    </div>
  </div>
</template>
