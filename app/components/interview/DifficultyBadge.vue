<template>
  <span class="iq-diff" :class="'iq-diff--' + level" :title="'难度 ' + level + '/5 · ' + label">
    {{ level }}/5 {{ label }}
  </span>
</template>

<script setup lang="ts">
import { DIFFICULTY_LABEL } from '~/types/interview'

const props = defineProps<{ level?: number | null }>()

const level = computed(() => Math.min(Math.max(Number(props.level) || 3, 1), 5))
const label = computed(() => DIFFICULTY_LABEL[level.value] || '')
</script>
