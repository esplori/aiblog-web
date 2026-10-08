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

const { get, post, put, del } = useApi()

// 与后端 MenuServiceImpl.PROTECTED_PATHS 保持一致：这三条是管理员进后台的入口本身，
// 删掉或改名/改路径都会失去入口，故既不可删除、名称与路径也不可修改。
const PROTECTED_PATHS = ['/admin', '/admin/menus', '/admin/roles']
const isProtected = (row: MenuItem) => PROTECTED_PATHS.includes(row.path)

const menus = ref<MenuItem[]>([])
const loading = ref(true)
const saving = ref(false)
const roleOptions = ref<{ code: string; name: string }[]>([])

// 新增/编辑弹窗
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const editingProtected = ref(false)
const form = reactive({
  name: '',
  path: '',
  icon: '',
  sortOrder: null as number | null,
  enabled: true,
})

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

const openCreate = () => {
  editingId.value = null
  editingProtected.value = false
  form.name = ''
  form.path = ''
  form.icon = ''
  // 留空 = 交给后端排在最后（nextSortOrder），避免默认 0 挤到所有菜单前面
  form.sortOrder = null
  form.enabled = true
  dialogVisible.value = true
}

const openEdit = (row: MenuItem) => {
  editingId.value = row.id
  editingProtected.value = isProtected(row)
  form.name = row.name
  form.path = row.path
  form.icon = row.icon || ''
  form.sortOrder = row.sortOrder ?? null
  form.enabled = row.enabled
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!form.name.trim()) {
    ElMessage.warning('请填写菜单名称')
    return
  }
  if (!form.path.trim()) {
    ElMessage.warning('请填写路由路径')
    return
  }
  // 与后端 @Pattern 同口径，先在前端拦住，省一次往返报错
  if (!/^\/admin(\/[A-Za-z0-9_-]{1,80})*$/.test(form.path.trim())) {
    ElMessage.warning('路由路径必须以 /admin 开头，每段只含字母、数字、下划线或短横线')
    return
  }

  saving.value = true
  const body = {
    name: form.name.trim(),
    path: form.path.trim(),
    icon: form.icon.trim(),
    sortOrder: form.sortOrder,
    enabled: form.enabled,
  }
  try {
    if (editingId.value) {
      await put(`/api/admin/menus/${editingId.value}`, body)
      ElMessage.success(`菜单「${body.name}」已更新`)
    } else {
      await post('/api/admin/menus', body)
      ElMessage.success(`菜单「${body.name}」已创建`)
    }
    dialogVisible.value = false
    await loadMenus()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || '保存失败')
  } finally {
    saving.value = false
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
      `确定要删除菜单「${row.name}」（${row.path}）吗？删除后它将从后台侧边栏消失，其在「角色管理」中的授权也会一并清除；非管理员角色再访问该路径会被拦成 403。可用「新增菜单」按同一路径重建，但已配置的角色授权无法恢复。`,
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
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">菜单管理</h1>
      <el-button type="primary" @click="openCreate">新增菜单</el-button>
    </div>

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
              <el-select
                v-model="row.roles"
                multiple
                filterable
                size="small"
                placeholder="未授权（仅管理员可见）"
                style="width: 100%"
              >
                <el-option v-for="r in roleOptions" :key="r.code" :value="r.code" :label="r.name" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="210" fixed="right">
            <template #default="{ row }">
              <el-button size="small" type="primary" text :loading="saving" @click="handleSave(row)">保存</el-button>
              <el-button size="small" text @click="openEdit(row)">编辑</el-button>
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
          提示：选择角色后点击「保存」，该菜单将只对已选角色显示（不选则仅管理员可见）。角色列表来自「角色管理」。
          新增的菜单默认不授权任何角色，需要在这里补上角色才会对其他用户出现。
          删除菜单会连带清除它在所有角色下的授权；「仪表盘 / 菜单管理 / 角色管理」为内置项，不可删除、名称与路径也不可修改。
        </p>
      </template>
    </div>

    <!-- 新增/编辑菜单 -->
    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑菜单' : '新增菜单'" width="480">
      <el-form label-width="80px">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" placeholder="如 合作伙伴" :disabled="editingProtected" />
          <div v-if="editingProtected" class="text-xs text-gray-400 mt-1">内置菜单的名称与路径不可修改</div>
        </el-form-item>
        <el-form-item label="路由路径" required>
          <el-input v-model="form.path" placeholder="如 /admin/partners" :disabled="editingProtected" />
          <div class="text-xs text-gray-400 mt-1">须以 /admin/ 开头且全站唯一；这里只登记入口，页面本身仍需另行开发</div>
        </el-form-item>
        <el-form-item label="图标">
          <el-input v-model="form.icon" placeholder="如 ep:folder，留空默认 ep:menu" />
          <div class="text-xs text-gray-400 mt-1">现有菜单用的是 ep: 系列，如 ep:document / ep:folder / ep:user</div>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sortOrder" :min="0" placeholder="留空排最后" />
          <div class="text-xs text-gray-400 mt-1">越小越靠前；留空自动排在最后</div>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.enabled" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
