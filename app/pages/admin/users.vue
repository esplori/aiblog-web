<script setup lang="ts">
import type { User } from '~/types'

definePageMeta({
  layout: 'admin',
})

const { get } = useApi()

const users = ref<User[]>([])
const loading = ref(true)

const loadUsers = async () => {
  loading.value = true
  try {
    const res = await get<User[]>('/api/users')
    users.value = res.data
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(loadUsers)
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">用户管理</h1>

    <div class="card">
      <el-skeleton v-if="loading" :rows="5" animated />
      <el-table v-else :data="users">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="用户" width="200">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <el-avatar :size="32">{{ row.displayName?.charAt(0) }}</el-avatar>
              <div>
                <div class="font-medium">{{ row.displayName }}</div>
                <div class="text-xs text-gray-400">{{ row.username }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" min-width="200" />
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : 'info'" size="small">
              {{ row.role }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>
