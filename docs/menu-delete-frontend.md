# 前端改动:菜单管理页新增删除按钮(管理员)

> 仓库:`aiblog-web`(任务给的 `aiblog-blog` 目录不存在,菜单管理页实际在此仓)。
> 文件:`app/pages/admin/menus.vue`(+43 / −2 行,LF 行尾未变,CRLF=0)

## 1. 改动清单(4 处)

| 位置 | 改动 | 作用 |
|---|---|---|
| 第 16 行 | `const { get, put } = useApi()` → 加 `del` | `useApi` 第 98 行已导出 `del`,此前本页未用 |
| 第 18-21 行 | 新增 `PROTECTED_PATHS` + `isProtected()` | 与后端保护清单一致,内置项按钮置灰 |
| 第 62-87 行 | 新增 `handleDelete()` | 确认弹窗 → 调接口 → 刷新列表 → 错误提示 |
| 第 120-137 行 | 操作列 `width 100→150` + 删除按钮 + 提示文案 | UI 入口 |

## 2. 删除按钮(操作列)

```vue
<el-table-column label="操作" width="150" fixed="right">
  <template #default="{ row }">
    <el-button size="small" type="primary" text :loading="saving" @click="handleSave(row)">保存</el-button>
    <el-button size="small" type="danger" text
      :disabled="isProtected(row) || saving" @click="handleDelete(row)">删除</el-button>
  </template>
</el-table-column>
```

样式跟同仓 `users.vue:141-150` 的删除按钮(`type="danger"` + `:disabled` + `@click`);
差别是本页保留 `text` 风格与「保存」并排,并把列宽从 100 调到 150 容纳两个按钮。

## 3. 确认弹窗 + 接口调用 + 刷新 + 错误提示

```ts
const handleDelete = async (row: MenuItem) => {
  if (isProtected(row)) { ElMessage.warning('内置菜单不可删除'); return }
  try {
    await ElMessageBox.confirm(`确定要删除菜单「${row.name}」…`, '删除菜单',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })
  } catch { return }                       // 用户取消:ElMessageBox reject,不发请求
  saving.value = true
  try {
    await del(`/api/admin/menus/${row.id}`)
    ElMessage.success(`菜单「${row.name}」已删除`)
    await loadMenus()                      // 刷新列表
  } catch (e: any) {
    ElMessage.error(e?.data?.message || '删除失败')   // 后端文案优先
  } finally { saving.value = false }
}
```

逐条对应本步要求:
- **删除按钮** → `@click="handleDelete(row)"`
- **确认弹窗** → `ElMessageBox.confirm`;取消走 `catch { return }`,不发请求
- **调用删除接口** → `del('/api/admin/menus/{id}')`,对应步 2 的新端点
- **刷新列表** → 成功后 `await loadMenus()`(重新拉 `GET /api/admin/menus`)
- **错误提示** → `ElMessage.error(e?.data?.message || '删除失败')`,优先展示后端
  `BusinessException` 的 message(「菜单不存在」/「内置菜单「xxx」不可删除」),
  与 `users.vue:86`、本页 `handleSave` 第 56 行的既有写法一致。
- `ElMessage` / `ElMessageBox` 无需 import:本仓走 Nuxt 自动导入(`users.vue` 同样未显式 import)。

## 4. 内置菜单保护(与后端口径一致)

```ts
const PROTECTED_PATHS = ['/admin', '/admin/menus', '/admin/roles']
const isProtected = (row: MenuItem) => PROTECTED_PATHS.includes(row.path)
```

前端只是**置灰 + warning 兜底**,真正的拒绝在后端 `MenuServiceImpl.PROTECTED_PATHS`
(前端可绕过,不能只靠 UI)。两边清单逐字符一致。

## 5. 删除后前端到底受什么影响(实测,含一处对旧文档的纠正)

读 `app/layouts/admin.vue` 后确认影响分两层,**此前我写的「删掉菜单行 → 直接访问 URL 会跳 403」
只对非 admin 成立,admin 不成立**,原因见第 45 行的短路:

```ts
// admin.vue:44-53
const isAllowed = computed(() => {
  if (authStore.user?.role === 'admin') return true   // ← admin 无条件放行
  if (route.path === '/admin/settings') return true
  const path = route.path
  return menuItems.value.some(m => {
    if (path === m.path) return true
    if (m.path === '/admin') return false             // 仪表盘只匹配自身
    return path.startsWith(m.path + '/')
  })
})
```

| 影响 | 对 admin | 对非 admin(editor/user) | 证据 |
|---|---|---|---|
| 侧边栏入口消失 | **是** | 是 | `admin.vue:119` `v-for="item in menuItems"` 直接吃接口返回的菜单列表 |
| 手输 URL 访问该页 | **仍可访问**(第 45 行短路) | **403**(第 77-80 行 `!isAllowed` → `navigateTo('/403')`) | 同上 |
| 该菜单的角色授权 | 连带清除 | 连带清除 | 后端事务内删 `role_menus`(见 backend 文档) |

→ 所以保护内置项的**真实理由**不是「admin 会被锁在门外」,而是:
菜单**没有新增端点**、`menus.path` 又带 `UNIQUE`,一旦删掉 `/admin/menus` 这条,
侧边栏入口对所有人生效消失且**无法经 UI 恢复**;对非 admin 角色还等于直接收回页面权限。
`deleteMenu` 的注释与本节口径已按此纠正。

另:菜单全删空时 `admin.vue:127` 会显示「暂无可用菜单」空态,不会白屏。

## 6. 本步未做的事(如实说明)
- 未加「新增菜单」功能(未被要求)。因此删除不可逆,只能靠 `docker/initdb/02-init-data.sql`
  重跑(`ON CONFLICT (path) DO NOTHING` 会补回被删行)。
- 未做浏览器端视觉验收:本仓管理页是 SSR 客户端空壳,证明 UI 效果需要构建产物 + 接口返回,
  见 `docs/menu-delete-test-report.md` 的验证边界说明。
