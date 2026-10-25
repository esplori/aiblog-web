<script setup lang="ts">
/**
 * 登录页外壳:深色玻璃 + 分栏布局 + 响应式折叠 + 溢出兜底。
 *
 * 布局口径:
 *   ≥1024px(lg)  两栏:左品牌侧(整片低调玻璃)/ 右表单侧(居中玻璃卡)
 *   <1024px      单栏:顶部紧凑品牌条(logo + 站名)+ 居中卡片
 *
 * 背景(深底 + 品牌色光斑)是**整屏一层**,两栏共享 —— 玻璃卡的磨砂要「背后有东西」
 * 才成立;光斑带一次 mousemove 视差,只改 CSS 变量,不碰布局。
 *
 * ⚠ 品牌条也要显示站名/logo —— 否则窄屏(品牌侧被折叠)时白标信息就丢了。
 */
const props = withDefaults(defineProps<{ showBrandPanel?: boolean }>(), { showBrandPanel: true })

const { name, logoUrl } = useSiteConfig()
/** 首字母方块:窄屏品牌条也要有识别物,不能只有一行站名 */
const mark = (name || '').trim().charAt(0).toUpperCase() || '·'

/** 光斑视差:rAF 节流、passive 监听;「减少动态效果」下不挂 */
let raf = 0
const onMove = (e: MouseEvent) => {
  if (raf) return
  raf = requestAnimationFrame(() => {
    raf = 0
    const x = (e.clientX / window.innerWidth - 0.5) * 22
    const y = (e.clientY / window.innerHeight - 0.5) * 18
    const el = document.documentElement
    el.style.setProperty('--auth-mx', `${x.toFixed(2)}px`)
    el.style.setProperty('--auth-my', `${y.toFixed(2)}px`)
  })
}

onMounted(() => {
  if (!props.showBrandPanel) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  window.addEventListener('mousemove', onMove, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMove)
  if (raf) cancelAnimationFrame(raf)
})
</script>

<template>
  <div class="auth-shell flex flex-col">
    <!-- 背景:纯装饰,读屏跳过 -->
    <div class="auth-bg" aria-hidden="true">
      <i class="auth-bg__g auth-bg__g--1" />
      <i class="auth-bg__g auth-bg__g--2" />
      <i class="auth-bg__g auth-bg__g--3" />
    </div>

    <!-- <lg:品牌侧折叠为顶部紧凑品牌条。
         ⚠ 它也归品牌侧管:brandPanel=false 时顶部品牌条一并去掉,才是真正的
         「退化为单卡片居中」(方案 §7.6 / 验收 M-12) -->
    <header v-if="showBrandPanel" class="auth-topbar">
      <div class="auth-topbar__inner">
        <img
          v-if="logoUrl"
          :src="logoUrl"
          :alt="name"
          class="h-7 max-w-[140px] object-contain"
        />
        <span v-else class="auth-brand__mark" aria-hidden="true">{{ mark }}</span>
        <span class="auth-topbar__name">{{ name }}</span>
      </div>
    </header>

    <div class="auth-scroll auth-layer flex flex-1 flex-col lg:flex-row">
      <!-- 品牌侧:仅 lg 且开关打开时显示 -->
      <section v-if="showBrandPanel" class="auth-brand-wrap hidden lg:flex">
        <slot name="brand" />
      </section>

      <main class="auth-main flex flex-1 items-center justify-center">
        <div class="auth-col">
          <slot />
          <slot name="footer" />
        </div>
      </main>
    </div>
  </div>
</template>
