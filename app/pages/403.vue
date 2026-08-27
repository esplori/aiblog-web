<script setup lang="ts">
definePageMeta({
  layout: false,
})

const authStore = useAuthStore()
const router = useRouter()
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50">
    <div class="text-center">
      <h1 class="text-6xl font-bold text-gray-300">403</h1>
      <p class="mt-4 text-gray-500">抱歉，您没有权限访问该页面</p>
      <div class="mt-8 flex justify-center gap-4">
        <el-button type="primary" @click="router.push('/')">返回首页</el-button>
        <el-button v-if="authStore.isLoggedIn" @click="router.push('/admin')">回到后台</el-button>
      </div>
    </div>
  </div>
</template>
