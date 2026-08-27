<script setup lang="ts">
import type { Role } from '~/types'

definePageMeta({
  layout: 'admin',
})

interface MenuItem {
  id: number
  name: string
  path: string
}

const { get, post, put, del } = useApi()

const roles = ref<Role[]>([])
const menus = ref<MenuItem[]>([])
const loading = ref(true)
const saving = ref(false)

// 新增/编辑弹窗
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({
  code: '',
  name: '',
  description: '',
  enabled: true,
})

// 菜单授权弹窗
const menuDialogVisible = ref(false)
const menuRoleId = ref<number | null>(null)
const menuRoleName = ref('')
const checkedMenuIds = ref<number[]>([])

const loadRoles = async () => {
  loading.value = true
  try {
    const res = await get<Role[]>('/api/admin/roles')
    roles.value = res.data || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const loadMenus = async () => {
  try {
    const res = await get<MenuItem[]>('/api/admin/menus')
    menus.value = res.data || []
  } catch (e) {
    console.error(e)
  }
}

const openCreate = () => {
  editingId.value = null
  form.code = ''
  form.name = ''
  form.description = ''
  form.enabled = true
  dialogVisible.value = true
}

const openEdit = (row: Role) => {
  editingId.value = row.id
  form.code = row.code
  form.name = row.name
  form.description = row.description || ''
  form.enabled = row.enabled
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!form.code || !form.name) {
    ElMessage.warning('请填写角色编码和名称')
    return
  }
  saving.value = true
  try {
    if (editingId.value) {
      await put(`/api/admin/roles/${editingId.value}`, form)
      ElMessage.success('角色已更新')
    } else {
      await post('/api/admin/roles', form)
      ElMessage.success('角色已创建')
    }
    dialogVisible.value = false
    loadRoles()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const handleDelete = async (row: Role) => {
  try {
    await ElMessageBox.confirm(
      `确定删除角色「${row.name}」吗？${row.userCount > 0 ? `该角色下还有 ${row.userCount} 个用户，需先调整。` : ''}`,
      '删除确认',
      { type: 'warning' },
    )
  } catch {
    return
  }
  try {
    await del(`/api/admin/roles/${row.id}`)
    ElMessage.success('角色已删除')
    loadRoles()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || '删除失败')
  }
}

const openMenuAuth = async (row: Role) => {
  menuRoleId.value = row.id
  menuRoleName.value = row.name
  try {
    const res = await get<number[]>(`/api/admin/roles/${row.id}/menus`)
    checkedMenuIds.value = res.data || []
  } catch (e: any) {
    ElMessage.error(e?.data?.message || '加载菜单授权失败')
    return
  }
  menuDialogVisible.value = true
}

const handleSaveMenus = async () => {
  if (!menuRoleId.value) return
  saving.value = true
  try {
    await put(`/api/admin/roles/${menuRoleId.value}/menus`, checkedMenuIds.value)
    ElMessage.success(`「${menuRoleName.value}」菜单授权已保存`)
    menuDialogVisible.value = false
    loadRoles()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadRoles()
  loadMenus()
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">角色管理</h1>
      <el-button type="primary" @click="openCreate">新增角色</el-button>
    </div>

    <div class="card">
      <el-skeleton v-if="loading" :rows="5" animated />
      <el-table v-else :data="roles">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="name" label="角色名称" width="140">
          <template #default="{ row }">
            <span class="font-medium">{{ row.name }}</span>
            <el-tag v-if="row.code === 'admin'" type="danger" size="small" class="ml-2">内置</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="code" label="编码" width="120">
          <template #default="{ row }">
            <code class="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{{ row.code }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200">
          <template #default="{ row }">
            <span class="text-gray-500 text-sm">{{ row.description || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="userCount" label="用户数" width="90" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'" size="small">
              {{ row.enabled ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button size="small" text type="primary" @click="openMenuAuth(row)">菜单授权</el-button>
            <el-button size="small" text type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" text type="danger" :disabled="row.code === 'admin'" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <p class="text-gray-400 text-sm mt-3">
        提示：内置「admin」角色不可删除/禁用；被用户使用的角色需先调整用户角色后才能删除。
      </p>
    </div>

    <!-- 新增/编辑角色 -->
    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑角色' : '新增角色'" width="480">
      <el-form label-width="80px">
        <el-form-item label="编码" required>
          <el-input v-model="form.code" placeholder="如 editor" :disabled="!!editingId" />
          <div v-if="!editingId" class="text-xs text-gray-400 mt-1">字母开头，仅含字母/数字/下划线，创建后不可修改</div>
        </el-form-item>
        <el-form-item label="名称" required>
          <el-input v-model="form.name" placeholder="如 编辑" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="角色职责说明" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.enabled" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- 菜单授权 -->
    <el-dialog v-model="menuDialogVisible" :title="`菜单授权 - ${menuRoleName}`" width="480">
      <el-checkbox-group v-model="checkedMenuIds" class="grid grid-cols-2 gap-2">
        <el-checkbox v-for="m in menus" :key="m.id" :value="m.id">
          {{ m.name }}
          <span class="text-gray-400 text-xs ml-1">{{ m.path }}</span>
        </el-checkbox>
      </el-checkbox-group>
      <template #footer>
        <el-button @click="menuDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSaveMenus">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
