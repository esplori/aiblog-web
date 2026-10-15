<script setup lang="ts">
import { RISK_HINT, RISK_LABEL } from '~/types/ai'

const props = defineProps<{ risks: string[] }>()

// 固定顺序：只读 < 可写 < 联网 < 执行，让眼睛能靠位置判断风险递增
const ORDER = ['read', 'write', 'net', 'exec']
const sorted = computed(() => ORDER.filter(r => (props.risks || []).includes(r)))
</script>

<template>
  <span class="inline-flex flex-wrap gap-1">
    <span
      v-for="risk in sorted"
      :key="risk"
      class="ai-risk"
      :class="'ai-risk--' + risk"
      :title="RISK_HINT[risk]"
    >
      {{ RISK_LABEL[risk] || risk }}
    </span>
  </span>
</template>

