<script setup lang="ts">
/**
 * 登录 / 注册切换器(替代原先的 `el-tabs`)。
 *
 * 为什么换掉 el-tabs:
 *   - 它能表达「两个并列视图」,但不表达「二选一模式切换」的语义;
 *   - 用 role="tablist"/role="tab" + aria-selected 表达选择态,键盘可达且有可见焦点环。
 *
 * ⚠ nuxt.config.ts 里 `defineModel: false`(宏被禁用)⇒ 用标准 props + emit 实现 v-model,
 *   不能写 `defineModel`。
 */
const props = defineProps<{ modelValue: 'login' | 'register' }>()
const emit = defineEmits<{ 'update:modelValue': [value: 'login' | 'register'] }>()

const tabs = [
  { value: 'login' as const, label: '登录' },
  { value: 'register' as const, label: '注册' },
]
</script>

<template>
  <div class="auth-mode-switch" role="tablist" aria-label="登录或注册">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      type="button"
      role="tab"
      :aria-selected="props.modelValue === tab.value"
      :class="['auth-mode-switch__item', props.modelValue === tab.value && 'is-active']"
      @click="emit('update:modelValue', tab.value)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
