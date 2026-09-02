<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

interface MenuItem {
  id: number
  name: string
  path: string
  icon: string
  sortOrder: number
  enabled: boolean
  roles: string[]
}

const { get, put } = useApi()

const menus = ref<MenuItem[]>([])
const loading = ref(true)
const saving = ref(false)
const roleOptions = ref<{ code: string; name: string }[]>([])

const loadRoles = async () => {
  try {
    const res = await get<{ code: string; name: string }[]>('/api/admin/roles')
    roleOptions.value = res.data || []
  } catch (e) {
    console.error(e)
    roleOptions.value = []
  }
}

const loadMenus = async () => {
  loading.value = true
  try {
    const res = await get<MenuItem[]>('/api/admin/menus')
    menus.value = res.data || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleSave = async (row: MenuItem) => {
  saving.value = true
  try {
    await put(`/api/admin/menus/${row.id}/roles`, { roles: row.roles })
    ElMessage.success(`「${row.name}」角色配置已保存`)
  } catch (e: any) {
    ElMessage.error(e?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadMenus()
  loadRoles()
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 mb-6">菜单管理</h1>

    <div class="card overflow-x-auto">
      <el-skeleton v-if="loading" :rows="6" animated />
      <template v-else>
        <el-table :data="menus" class="min-w-[640px]">
          <el-table-column prop="name" label="菜单名称" min-width="120" />
          <el-table-column prop="path" label="路由路径" min-width="160" class="hidden md:table-cell" />
          <el-table-column label="图标" width="100" class="hidden sm:table-cell">
            <template #default="{ row }">
              <span class="inline-flex items-center gap-2">
                <el-icon><Icon :name="row.icon" /></el-icon>
                <span class="text-gray-500 text-xs">{{ row.icon }}</span>
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="sortOrder" label="排序" width="70" class="hidden sm:table-cell" />
          <el-table-column label="可见角色" min-width="200">
            <template #default="{ row }">
              <el-checkbox-group v-model="row.roles">
                <el-checkbox v-for="r in roleOptions" :key="r.code" :value="r.code" :label="r.code" class="!mr-0 !mb-1">{{ r.name }}</el-checkbox>
              </el-checkbox-group>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button size="small" type="primary" text :loading="saving" @click="handleSave(row)">保存</el-button>
            </template>
          </el-table-column>
        </el-table>
        <p class="text-gray-400 text-sm mt-3">
          提示：勾选角色后点击「保存」，该菜单将只对勾选的角色显示。角色列表来自「角色管理」。
        </p>
      </template>
    </div>
  </div>
</template>
