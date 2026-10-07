<script setup lang="ts">
/**
 * 登录页外壳:分栏布局 + 响应式折叠 + 溢出兜底。
 *
 * 布局口径来自 docs/login-redesign-plan.md §3.2:
 *   ≥1024px(lg)  两栏:左品牌侧 / 右表单侧
 *   <1024px      单栏:顶部紧凑品牌条(logo + 站名)+ 居中卡片
 *
 * ⚠ 品牌条也要显示站名/logo —— 否则窄屏(品牌侧被折叠)时白标信息就丢了。
 */
withDefaults(defineProps<{ showBrandPanel?: boolean }>(), { showBrandPanel: true })

const { name, logoUrl } = useSiteConfig()
</script>

<template>
  <div class="auth-shell flex flex-col bg-slate-50">
    <!-- <lg:品牌侧折叠为顶部紧凑品牌条。
         ⚠ 它也归品牌侧管:brandPanel=false 时顶部品牌条一并去掉,才是真正的
         「退化为单卡片居中」(方案 §7.6 / 验收 M-12) -->
    <header
      v-if="showBrandPanel"
      class="border-b border-slate-200 bg-white/90 backdrop-blur lg:hidden"
    >
      <div class="flex h-14 items-center gap-3 px-4">
        <img
          v-if="logoUrl"
          :src="logoUrl"
          :alt="name"
          class="h-7 max-w-[140px] object-contain"
        />
        <span class="font-semibold text-gray-800">{{ name }}</span>
      </div>
    </header>

    <div class="auth-scroll flex flex-1 flex-col lg:flex-row">
      <!-- 品牌侧:仅 lg 且开关打开时显示 -->
      <section v-if="showBrandPanel" class="hidden lg:flex lg:w-[46%] xl:w-[48%]">
        <slot name="brand" />
      </section>

      <main class="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
        <div class="w-full max-w-md">
          <slot />
          <slot name="footer" />
        </div>
      </main>
    </div>
  </div>
</template>
