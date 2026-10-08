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

const { get, put, del } = useApi()

// 与后端 MenuServiceImpl.PROTECTED_PATHS 保持一致：这三条删掉后管理员会失去入口，
// 且 menus.path 带 UNIQUE 约束、菜单无新增端点，无法经 UI 恢复。
const PROTECTED_PATHS = ['/admin', '/admin/menus', '/admin/roles']
const isProtected = (row: MenuItem) => PROTECTED_PATHS.includes(row.path)

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

const handleDelete = async (row: MenuItem) => {
  if (isProtected(row)) {
    ElMessage.warning('内置菜单不可删除')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确定要删除菜单「${row.name}」（${row.path}）吗？删除后它将从后台侧边栏消失，其在「角色管理」中的授权也会一并清除；非管理员角色再访问该路径会被拦成 403。菜单没有新增入口，此操作不可恢复。`,
      '删除菜单',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  saving.value = true
  try {
    await del(`/api/admin/menus/${row.id}`)
    ElMessage.success(`菜单「${row.name}」已删除`)
    await loadMenus()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || '删除失败')
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
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button size="small" type="primary" text :loading="saving" @click="handleSave(row)">保存</el-button>
              <el-button
                size="small"
                type="danger"
                text
                :disabled="isProtected(row) || saving"
                @click="handleDelete(row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <p class="text-gray-400 text-sm mt-3">
          提示：勾选角色后点击「保存」，该菜单将只对勾选的角色显示。角色列表来自「角色管理」。
          删除菜单会连带清除它在所有角色下的授权，且不可恢复；「仪表盘 / 菜单管理 / 角色管理」为内置项，不可删除。
        </p>
      </template>
    </div>
  </div>
</template>
