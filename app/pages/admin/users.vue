<script setup lang="ts">
import type { UserResponse } from '~/types'

definePageMeta({
  layout: 'admin',
})

const { get, put } = useApi()
const authStore = useAuthStore()

const users = ref<UserResponse[]>([])
const roles = ref<{ code: string; name: string; enabled: boolean }[]>([])
const loading = ref(true)
const saving = ref(false)

const loadUsers = async () => {
  loading.value = true
  try {
    const res = await get<UserResponse[]>('/api/admin/users')
    users.value = res.data
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const loadRoles = async () => {
  try {
    const res = await get<{ code: string; name: string; enabled: boolean }[]>('/api/admin/roles')
    roles.value = res.data || []
  } catch (e) {
    console.error(e)
    roles.value = []
  }
}

const isSelf = (row: UserResponse) => authStore.user?.id === row.id

const handleRoleChange = async (row: UserResponse, newRole: string) => {
  if (newRole === row.role) return
  try {
    await ElMessageBox.confirm(
      `确定将用户「${row.displayName || row.username}」的角色修改为「${roles.value.find(r => r.code === newRole)?.name || newRole}」吗？`,
      '修改角色',
      { type: 'warning' },
    )
  } catch {
    // 取消则恢复原值
    row.role = row.role
    return
  }
  saving.value = true
  try {
    await put(`/api/admin/users/${row.id}/role`, { role: newRole })
    ElMessage.success('角色已更新')
    loadUsers()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || '修改失败')
    loadUsers()
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadUsers()
  loadRoles()
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 mb-6">用户管理</h1>

    <div class="card overflow-x-auto">
      <el-skeleton v-if="loading" :rows="5" animated />
      <el-table v-else :data="users" class="min-w-[640px]">
        <el-table-column prop="id" label="ID" width="70" class="hidden sm:table-cell" />
        <el-table-column label="用户" min-width="160">
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
        <el-table-column prop="email" label="邮箱" min-width="180" class="hidden md:table-cell" />
        <el-table-column label="角色" width="140">
          <template #default="{ row }">
            <el-select
              :model-value="row.role"
              :disabled="isSelf(row) || saving"
              size="small"
              @change="(v: string) => handleRoleChange(row, v)"
            >
              <el-option
                v-for="r in roles"
                :key="r.code"
                :value="r.code"
                :label="`${r.name} (${r.code})`"
                :disabled="!r.enabled"
              />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="最后登录" width="160" class="hidden lg:table-cell">
          <template #default="{ row }">
            {{ row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString() : '未登录' }}
          </template>
        </el-table-column>
      </el-table>
      <p class="text-gray-400 text-sm mt-3">提示：不能修改自己的角色。角色可在「角色管理」中维护。</p>
    </div>
  </div>
</template>
