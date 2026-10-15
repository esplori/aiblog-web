<script setup lang="ts">
import { TYPE_LABEL } from '~/types/ai'

defineProps<{ type: string }>()
</script>

<template>
  <span class="ai-type" :class="'ai-type--' + type">{{ TYPE_LABEL[type] || type }}</span>
</template>

