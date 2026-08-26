<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

const { get, put, request } = useApi()
const authStore = useAuthStore()

// 当前活跃 Tab
const activeTab = ref('profile')

// === 个人信息 ===
const profileForm = reactive({
  displayName: '',
  bio: '',
  avatar: '',
})
const profileLoading = ref(false)
const profileSaving = ref(false)

const loadProfile = async () => {
  profileLoading.value = true
  try {
    const res = await get<any>('/api/users/me')
    const data = res.data
    profileForm.displayName = data.displayName || ''
    profileForm.bio = data.bio || ''
    profileForm.avatar = data.avatar || ''
  } catch (e: any) {
    ElMessage.error('加载用户信息失败')
  } finally {
    profileLoading.value = false
  }
}

const saveProfile = async () => {
  profileSaving.value = true
  try {
    await put('/api/users/me', {
      displayName: profileForm.displayName,
      bio: profileForm.bio,
      avatar: profileForm.avatar,
    })
    ElMessage.success('个人信息已更新')
    // 同步 auth store
    authStore.fetchUser()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || '保存失败')
  } finally {
    profileSaving.value = false
  }
}

// === 修改密码 ===
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})
const passwordSaving = ref(false)

const passwordRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (_rule: any, value: string, callback: any) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次密码输入不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}

const passwordFormRef = ref()
const passwordPolicy = computed(() => {
  const pwd = passwordForm.newPassword
  return {
    length: pwd.length >= 6,
    hasLetter: /[a-zA-Z]/.test(pwd),
    hasNumber: /\d/.test(pwd),
  }
})

const changePassword = async () => {
  const valid = await passwordFormRef.value.validate().catch(() => false)
  if (!valid) return

  passwordSaving.value = true
  try {
    await request('/api/users/me/password', {
      method: 'PUT',
      params: {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      },
    })
    ElMessage.success('密码修改成功')
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch (e: any) {
    ElMessage.error(e?.data?.message || '密码修改失败')
  } finally {
    passwordSaving.value = false
  }
}

onMounted(loadProfile)
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 mb-6">个人设置</h1>

    <div class="card">
      <el-tabs v-model="activeTab" class="settings-tabs">
        <!-- ════ 个人信息 ════ -->
        <el-tab-pane label="个人信息" name="profile">
          <el-skeleton v-if="profileLoading" :rows="6" animated />

          <el-form v-else :model="profileForm" label-width="100px" class="max-w-lg">
            <el-form-item label="用户名">
              <el-input :model-value="authStore.user?.username" disabled />
              <div class="text-xs text-gray-400 mt-1">用户名不可修改</div>
            </el-form-item>

            <el-form-item label="邮箱">
              <el-input :model-value="authStore.user?.email" disabled />
              <div class="text-xs text-gray-400 mt-1">邮箱暂不可修改</div>
            </el-form-item>

            <el-form-item label="显示名称" prop="displayName">
              <el-input v-model="profileForm.displayName" placeholder="输入显示名称" maxlength="50" show-word-limit />
            </el-form-item>

            <el-form-item label="个人简介" prop="bio">
              <el-input
                v-model="profileForm.bio"
                type="textarea"
                :rows="3"
                placeholder="介绍一下自己..."
                maxlength="200"
                show-word-limit
              />
            </el-form-item>

            <el-form-item label="头像" prop="avatar">
              <div class="flex items-center gap-4">
                <el-avatar :size="72" :src="profileForm.avatar">
                  {{ profileForm.displayName?.charAt(0) || '?' }}
                </el-avatar>
                <el-input v-model="profileForm.avatar" placeholder="头像图片 URL" class="flex-1" />
              </div>
              <div class="text-xs text-gray-400 mt-1">输入图片 URL 或上传文件后粘贴 URL</div>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" :loading="profileSaving" @click="saveProfile">
                保存修改
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- ════ 修改密码 ════ -->
        <el-tab-pane label="修改密码" name="password">
          <el-form
            ref="passwordFormRef"
            :model="passwordForm"
            :rules="passwordRules"
            label-width="110px"
            class="max-w-md"
          >
            <el-form-item label="原密码" prop="oldPassword">
              <el-input
                v-model="passwordForm.oldPassword"
                type="password"
                show-password
                placeholder="输入当前密码"
              />
            </el-form-item>

            <el-form-item label="新密码" prop="newPassword">
              <el-input
                v-model="passwordForm.newPassword"
                type="password"
                show-password
                placeholder="至少 6 位"
              />
              <!-- 密码强度提示 -->
              <div class="flex gap-4 mt-2 text-xs">
                <span :class="passwordPolicy.length ? 'text-green-500' : 'text-gray-400'">
                  ✓ 至少 6 位
                </span>
                <span :class="passwordPolicy.hasLetter ? 'text-green-500' : 'text-gray-400'">
                  ✓ 包含字母
                </span>
                <span :class="passwordPolicy.hasNumber ? 'text-green-500' : 'text-gray-400'">
                  ✓ 包含数字
                </span>
              </div>
            </el-form-item>

            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input
                v-model="passwordForm.confirmPassword"
                type="password"
                show-password
                placeholder="再次输入新密码"
              />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" :loading="passwordSaving" @click="changePassword">
                修改密码
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<style scoped>
.settings-tabs {
  --el-tabs-header-height: 48px;
}
.settings-tabs :deep(.el-tabs__item) {
  font-size: 15px;
  padding: 0 24px;
}
</style>