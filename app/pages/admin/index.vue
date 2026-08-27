<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

const authStore = useAuthStore()
const { get } = useApi()

const isAdmin = computed(() => authStore.user?.role === 'admin')

const stats = ref({
  articleCount: 0,
  commentCount: 0,
  categoryCount: 0,
  tagCount: 0,
  totalViewCount: 0,
})

const loading = ref(true)

const loadStats = async () => {
  loading.value = true
  try {
    // 管理员看全局统计，普通用户看个人统计
    const url = isAdmin.value ? '/api/admin/stats' : '/api/users/me/stats'
    const res = await get<Record<string, number>>(url)
    stats.value = { ...stats.value, ...res.data }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  // 确保用户信息已加载（角色决定统计口径）
  if (!authStore.user) {
    await authStore.fetchUser()
  }
  loadStats()
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 mb-6">
      {{ isAdmin ? '仪表盘' : '我的数据' }}
    </h1>

    <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
      <div class="card text-center">
        <div class="text-3xl font-bold text-blue-500" v-text="stats.articleCount" />
        <div class="text-gray-500 text-sm mt-1">文章总数</div>
      </div>
      <div v-if="isAdmin" class="card text-center">
        <div class="text-3xl font-bold text-green-500" v-text="stats.commentCount" />
        <div class="text-gray-500 text-sm mt-1">评论总数</div>
      </div>
      <div class="card text-center">
        <div class="text-3xl font-bold text-red-500" v-text="stats.totalViewCount" />
        <div class="text-gray-500 text-sm mt-1">总访问量</div>
      </div>
      <div v-if="isAdmin" class="card text-center">
        <div class="text-3xl font-bold text-orange-500" v-text="stats.categoryCount" />
        <div class="text-gray-500 text-sm mt-1">分类数量</div>
      </div>
      <div v-if="isAdmin" class="card text-center">
        <div class="text-3xl font-bold text-purple-500" v-text="stats.tagCount" />
        <div class="text-gray-500 text-sm mt-1">标签数量</div>
      </div>
    </div>

    <div class="card">
      <h2 class="text-lg font-semibold mb-4">快速操作</h2>
      <div class="flex gap-4">
        <NuxtLink to="/admin/articles">
          <el-button type="primary">{{ isAdmin ? '管理文章' : '我的文章' }}</el-button>
        </NuxtLink>
        <NuxtLink to="/admin/articles/create">
          <el-button>写文章</el-button>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
