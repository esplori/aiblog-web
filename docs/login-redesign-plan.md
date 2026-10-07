# 登录页改造方案(login-redesign-plan)

> 2026-10-07 | 对象:`aiblog-web`(`/home/ubuntu/aiblog-web`,分支 `master`) | 作者:Pytrix
> 前置:现状诊断见 `notes/login-page-audit.md`;验收与测试计划见 `docs/login-redesign-acceptance.md`
> 参照先例:`docs/home-design-redesign/`(首页改造,含 `PROPOSALS.md` 与多套 HTML 原型)

---

## 一、设计目标

### 1.1 要解决的问题

当前登录页 `app/pages/login.vue`(195 行)**只有一个居中的白色卡片**:一段站点名、一句副标题、
两个输入框、一个按钮。审计结论(见 `notes/login-page-audit.md` §2)列出了 **8 项 P0**:
视觉信息量过低、未使用 `logoUrl`(白标失效)、校验与全站做法不一致、placeholder 声明的规则未实现、
零 `autocomplete`、零 `aria-*`、无频次限制、网络错误与凭据错误不分。

### 1.2 目标(可验收)

| # | 目标 | 量化判据 |
|---|---|---|
| G1 | **不再"太简单"**:建立有品牌辨识度的分栏式登录页 | 桌面端(≥1024px)为「品牌侧 + 表单侧」两栏;品牌侧含 logo、站名、标语、装饰层 |
| G2 | **白标正确工作** | `logoUrl` 与 `tagline` 生效;未配置 logo 时回落到站名文字,不留空白 |
| G3 | **表单校验符合全站惯例且规则真实** | 与 `app/pages/admin/settings.vue:62-80` 同一写法(`rules` 对象 + `:rules` + `prop`);placeholder 承诺的规则全部生效 |
| G4 | **可访问性达标** | 关键输入框均有可见 `<label>` 与正确 `autocomplete`;表单级错误有 `aria-live` 播报;对比度 ≥ WCAG AA |
| G5 | **错误可分辨** | 凭据错误 / 频次限制 / 服务端故障 / 网络不通 四类给出**不同文案与不同后续动作** |
| G6 | **登录后回到来路** | 从 `/admin/articles` 被踢到登录页,登录成功后回到 `/admin/articles` |
| G7 | **移动端可用** | 320px 宽度无横向滚动;小高度窗口可滚动到全部字段与按钮 |
| G8 | **不引入新运行时依赖** | `package.json` 的 `dependencies` 无新增 |

### 1.3 非目标

- 不改后端(`aiblog-java`)的接口、密码策略与鉴权模型;
- 不新增第三方登录(微信/GitHub 等,后端无支持);
- 不引入新的 UI 组件库或图标库(继续用 Element Plus + `@nuxt/icon`)。

---

## 二、设计原则

1. **换肤不可破**:品牌色是**运行时变量**(`--color-brand`,`useSiteConfig` 可从 DB 覆盖)。
   因此方案里**任何承载文字的区域都不依赖品牌色的亮度** —— 对比度由固定的深色底保证(见 §4.3),
   品牌色只用于装饰、描边、按钮与焦点环。
2. **跟随既有惯例**:校验用 `rules` 对象(与 `admin/settings.vue` 一致);组件放 `app/components/`
   走 Nuxt 自动导入;请求走 `useApi`;品牌读 `useSiteConfig`。不另起一套。
3. **未就位不显示**:后端缺的入口(忘记密码、验证码)用 `runtimeConfig` 开关控制,
   **不发死链接** —— 一个点了报错的「忘记密码」比没有更糟。
4. **SSR 优先**:页面在 SSR 下即可正确渲染与配色(`useBrandTheme` 已是 SSR 时机),
   不出现首屏闪烁与布局跳动。
5. **可持续分层**:三个阶段各自独立可上线、可回滚;阶段一不依赖阶段二的视觉重构。

---

## 三、页面结构

### 3.1 信息架构

```
/login  (definePageMeta: layout: false —— 保持独立布局)
└─ AuthShell                          ← 布局外壳(分栏 + 页脚 + 溢出兜底)
   ├─ AuthBrandPanel                  ← 仅 ≥lg 显示:logo / 站名 / 标语 / 装饰
   ├─ AuthFormCard                    ← 表单容器(白底白卡 + 标题 + 模式切换)
   │  ├─ AuthModeSwitch               ← 登录 / 注册 切换
   │  ├─ AuthLoginForm                ← 登录表单
   │  └─ AuthRegisterForm             ← 注册表单(未激活时惰性渲染)
   └─ AuthFooter                      ← 版权 / footerText / ICP 备案号(全尺寸显示)
```

**与现状的关键差异**:
- 现在**没有**任何品牌侧内容、没有页脚(因为 `layout: false` 丢掉了 `layouts/default.vue:87-99` 的
  footer,连带 **ICP 备案号也消失了** —— 中国大陆部署通常要求备案号可见,这是**合规回归**,必须补回)。
- 现在注册表单与登录表单同时挂载(`el-tabs`),新结构改为**惰性渲染**。

### 3.2 布局与响应式

| 断点 | 布局 | 品牌侧 | 表单侧 |
|---|---|---|---|
| **≥1024px(`lg:`)** | 两栏 `grid`,左品牌 / 右表单 | 显示(logo + 站名 + 标语 + 装饰) | 垂直居中,卡片宽 420–480px |
| **768–1023px(`md:`)** | 单栏;顶部一条紧凑品牌条(logo + 站名) | 折叠为顶栏 | 卡片居中 |
| **<768px** | 单栏 | 折叠为顶栏 | 卡片满宽,**内边距降到 `p-5`** |

**高度与溢出(修 R1/R2)**:
- 根容器用 **`min-h-[100dvh]`** 而非 `min-h-screen` —— 移动端浏览器地址栏收起/展开时
  `100vh` 会导致内容被裁,`dvh` 跟随可视高度。
- 表单栏自身**可滚动**:`overflow-y-auto` + 底部安全区内边距
  (`padding-bottom: env(safe-area-inset-bottom)`),保证注册表单 5 个字段 + 按钮在横屏手机也能全部到达。
- 品牌侧装饰使用 `position: absolute` + `overflow: hidden`,**不参与布局**,不产生横向滚动。

**⚠ 硬约束(Tailwind 配置)**:`tailwind.config.js` 的 `content` globs **不含 `./app/utils/**`**。
新增的 `app/components/auth/**` 已被 `./app/components/**/*.{js,vue,ts}` 覆盖,
但**不要把任何 Tailwind 类名写进 `app/utils/` 的文件**(那些类不会被生成)。

### 3.3 组件命名(Nuxt 自动导入)

新增组件放在 `app/components/auth/` 下。**文件名不带 `Auth` 前缀**,以避免依赖 Nuxt 的
「重复段去重」行为,让导入名完全确定:

| 文件 | 自动导入名 |
|---|---|
| `app/components/auth/Shell.vue` | `<AuthShell>` |
| `app/components/auth/BrandPanel.vue` | `<AuthBrandPanel>` |
| `app/components/auth/FormCard.vue` | `<AuthFormCard>` |
| `app/components/auth/LoginForm.vue` | `<AuthLoginForm>` |
| `app/components/auth/RegisterForm.vue` | `<AuthRegisterForm>` |
| `app/components/auth/ModeSwitch.vue` | `<AuthModeSwitch>` |
| `app/components/auth/Footer.vue` | `<AuthFooter>` |

> 参照:`app/components/blog/BlogHome.vue` 现以 `<BlogHome />` 使用(`app/pages/index.vue:12`)。

---

## 四、视觉规范

### 4.1 设计令牌(新增到 `app/assets/css/main.css`)

沿用项目既有的「CSS 变量 + `color-mix`」换肤机制,新增登录页专用变量(前缀 `--auth-`):

| 令牌 | 值 | 用途 |
|---|---|---|
| `--auth-surface` | `#ffffff` | 表单卡面 |
| `--auth-text` | `#1f1f1f` | 主文字(与 `main.css` 的 body 色一致) |
| `--auth-muted` | `#6b7280` | 辅助文字、占位说明 |
| `--auth-border` | `rgba(15, 23, 42, 0.08)` | 分隔线、输入框描边 |
| `--auth-panel-base` | `#0b1220` | **品牌侧深底(固定)** —— 对比度的保证,见 §4.3 |
| `--auth-radius-card` | `16px` | **对齐全站 `.card`**(`main.css:28` 现为 16px),替换登录页现用的 `rounded-lg`(8px) |
| `--auth-shadow-card` | 与 `.card` 同源的双层阴影 | 视觉一致 |
| `--auth-focus-ring` | `color-mix(in srgb, var(--color-brand) 40%, transparent)` | 焦点环(跟随品牌色) |
| `--auth-motion` | `200ms ease` | 过渡时长 |

**⚠ 已知不一致**:登录页现用 `rounded-lg`(8px),而全站 `.card` 是 16px。
方案统一到 16px(修 V5)。

### 4.2 色彩使用

| 区域 | 用色 |
|---|---|
| 品牌侧背景 | `--auth-panel-base` 为底,叠加**品牌色径向光斑**(`radial-gradient` 用 `var(--color-brand)`,透明度 ≤ 22%)与细网格纹理 |
| 品牌侧文字 | 纯白 `#ffffff`(标题)、`rgba(255,255,255,.72)`(标语) |
| 表单侧背景 | `--auth-surface`,可加极淡品牌色渐变(透明度 ≤ 6%) |
| 主按钮 | Element Plus `type="primary"` ⇒ 自动跟随 `--el-color-primary`(已在 `main.css:50-58` 重映射到品牌色) |
| 错误态 | Element Plus `--el-color-danger`(不自定义,保持组件库一致) |

### 4.3 对比度策略(**方案的关键设计决策**)

品牌色是运行时可变的白标配置,亮度不可控 —— 若直接用品牌色做文字底,换肤后可能不达 AA。
因此:

> **品牌侧所有承载文字的区域,底色一律走 `--auth-panel-base`(近黑 `#0b1220`)及其衍生色,
> 品牌色只作为其上的装饰层(光斑/描边/图形),不决定文字所在区域的最小亮度。**

这样白色文字对 `#0b1220` 的对比度约 **17:1**,远超 WCAG AA(4.5:1)要求,**与品牌色无关**。
表单侧是白底 + `--auth-text` `#1f1f1f`,对比度约 **15:1**。

### 4.4 字号与间距

| 元素 | 规格 |
|---|---|
| 品牌侧站名 | 28–32px / 700 |
| 品牌侧标语 | 15–16px / 400 / `rgba(255,255,255,.72)` |
| 卡片标题 | 20px / 600 |
| 字段标签 | 14px / 500(`label-position="top"`) |
| 输入框文字 | 15px |
| 辅助/错误文字 | 13px |
| 间距刻度 | 4 / 8 / 12 / 16 / 24 / 32 / 48(卡内主间距 24,字段间 16) |

### 4.5 动效

- 卡片入场:透明度 0→1 + `translateY(8px)`→0,`--auth-motion`;
- 输入框聚焦:仅焦点环颜色过渡,**不做位移**;
- **必须**支持 `@media (prefers-reduced-motion: reduce)` ⇒ 关闭所有过渡与位移(修 R4);
- 不做持续型背景动画(省电、避免干扰,也降低 SSR 与低端设备风险)。

---

## 五、组件拆分

### 5.1 新增文件

| 文件 | 职责 | 依赖 |
|---|---|---|
| `app/components/auth/Shell.vue` | 分栏布局、响应式、`min-h-[100dvh]`、溢出滚动、页脚插槽 | — |
| `app/components/auth/BrandPanel.vue` | 读 `useSiteConfig()` 渲染 `logoUrl`/`name`/`tagline`;未配 logo 时回落站名文字;装饰层 | `useSiteConfig` |
| `app/components/auth/FormCard.vue` | 白卡容器 + 标题 + 切换器插槽 + 表单插槽 | — |
| `app/components/auth/LoginForm.vue` | 登录表单:校验、提交、错误映射、密码框聚焦、记住我(阶段三) | `useApi`、`useAuthStore`、`useAuthError`、`useAuthRedirect` |
| `app/components/auth/RegisterForm.vue` | 注册表单:5 字段 + 一致性校验 + 注册后自动登录 | 同上 |
| `app/components/auth/ModeSwitch.vue` | 登录/注册切换(替代现在的 `el-tabs`) | — |
| `app/components/auth/Footer.vue` | 版权 / `footerText` / ICP(`icp` 非空时显示,链 `beian.miit.gov.cn`) | `useSiteConfig` |
| `app/composables/useAuthError.ts` | 把异常分类为「凭据/频次/服务端/网络」四类 → 文案 + 后续动作 | `ofetch` 错误形状 |
| `app/composables/useAuthRedirect.ts` | 解析 `?redirect=`、**站内路径白名单校验**、生成回跳 URL | `useRoute` |
| `app/composables/useLoginThrottle.ts`(阶段三) | 失败计数与退避倒计时(**纯前端缓解,不是防护**) | — |
| `app/utils/authCookie.ts` | **消除重复**:合并 `auth.ts:6-10` 与 `useApi.ts:3-7` 两份相同的 cookie 选项 | ⚠ 此目录不在 Tailwind content globs,只放常量/纯逻辑 |

### 5.2 改造文件

| 文件 | 改动 |
|---|---|
| `app/pages/login.vue` | 瘦身为「容器」:解析模式(login/register)、`useBrandTheme`、装配 `<AuthShell>`,表单逻辑下沉到子组件 |
| `app/stores/auth.ts` | 用 `authCookie.ts` 的共享选项;`setAuth` 支持「记住我」差异化 `maxAge`(阶段三) |
| `app/composables/useApi.ts` | 401 时带上 `returnUrl`(不再裸跳 `/login`);复用 `authCookie.ts`;错误对象保留原始 `statusCode` 供分类 |
| `app/assets/css/main.css` | 追加 §4.1 的 `--auth-*` 令牌 + `prefers-reduced-motion` 规则 |
| `tailwind.config.js` | **补齐 `brand` 色阶**(见 §5.3) |
| `nuxt.config.ts` | 追加 `runtimeConfig.public.auth` 开关(见 §7.6) |

### 5.3 ⚠ Tailwind `brand` 色阶必须先补齐

当前 `tailwind.config.js` 只定义了 **5 档**:`DEFAULT / 50 / 100 / 600 / 700`。
**没有 200/300/400/500/800/900** ⇒ 写 `bg-brand-500` 之类**不会报错,只是静默不生效**。

方案需要中间档(边框、hover、光斑渐变)。补法(与现值同源,都用 `color-mix`):

```js
brand: {
  DEFAULT: 'var(--color-brand)',
  50:  'color-mix(in srgb, var(--color-brand) 8%, white)',
  100: 'color-mix(in srgb, var(--color-brand) 14%, white)',
  200: 'color-mix(in srgb, var(--color-brand) 24%, white)',
  300: 'color-mix(in srgb, var(--color-brand) 38%, white)',
  400: 'color-mix(in srgb, var(--color-brand) 58%, white)',
  500: 'var(--color-brand)',
  600: 'var(--color-brand)',
  700: 'color-mix(in srgb, var(--color-brand) 82%, black)',
  800: 'color-mix(in srgb, var(--color-brand) 60%, black)',
  900: 'color-mix(in srgb, var(--color-brand) 42%, black)',
}
```

> ⚠ **这是纯增量改动**:新增可用类名,**不改动**已有 5 档的取值 ⇒ 现有页面渲染不变。
> 若不愿动配置,退化方案是**只用已定义的档位 + 直接写 `color-mix()` 的 CSS 变量**;
> 但那样会散落魔法值,不推荐。

---

## 六、交互流程

### 6.1 登录提交(状态机)

```
idle ──提交──▶ validating ──失败──▶ 显示字段级错误(聚焦首个错误字段)
                   │
                   └─通过─▶ submitting(表单 aria-busy=true、输入框与按钮全部 disabled)
                              ├─成功─▶ setAuth → 跳转(§6.4)
                              └─失败─▶ 分类映射(§6.2)→ 恢复可交互
```

**修 I1**:提交期间**输入框一并 `disabled`**(现状只禁用按钮,见 `login.vue:114-122`)。

### 6.2 错误分类(**修 S2**)

`useAuthError.ts` 把异常映射为 `{ message, action }`:

| 情形 | 判据 | 文案 | 后续动作 |
|---|---|---|---|
| 凭据错误 | `statusCode === 401` | 用户名或密码错误 | 清空密码、聚焦密码框 |
| 频次限制 | `statusCode === 429` | 尝试过于频繁,请 N 秒后重试 | 按钮进入倒计时禁用 |
| 参数错误 | `400` / `422` | 用后端 `message`,无则「输入不合法」 | 聚焦首个可疑字段 |
| 服务端故障 | `statusCode >= 500` | 服务暂时不可用,请稍后重试 | 显示「重试」按钮 |
| 网络不通 | 无 `statusCode`(FetchError)/超时 | 网络连接失败,请检查网络后重试 | 显示「重试」按钮;`navigator.onLine === false` 时文案改为「当前处于离线状态」 |

> 现状 `login.vue:44-46` 把所有异常压成 `e?.data?.message || '登录失败'` ——
> 网络不通时会让用户反复重试密码,这是要修的核心体验缺陷。

### 6.3 键盘与焦点(**修 I2 / A5**)

- 整个表单支持 **Enter 提交**:`<el-form @submit.prevent="onSubmit">` +
  按钮 `native-type="submit"`,不再依赖单个输入框的 `@keyup.enter`
  (现状只绑在密码框 `login.vue:109` 与确认密码框 `login.vue:175`)。
- 提交失败后**焦点移到首个错误字段**(`el-form` 的 `validate` 回调里做)。
- 切换 登录/注册 后,焦点进入该面板的第一个输入框。
- 焦点环用 `--auth-focus-ring`,**不用 `outline: none` 抹掉**。

### 6.4 登录后跳转(**修 I5**)

- `useApi.ts` 的 401 分支:若当前不在 `/login`,跳
  `/login?redirect=<encodeURIComponent(route.fullPath)>`,否则裸跳 `/login`(避免自嵌套)。
- 登录页读取 `route.query.redirect`,**只接受站内相对路径**:

  ```
  合法:以单个 "/" 开头,且不含 "//" 前缀、不含反斜杠、不含 ".." 段
  非法/缺失:一律回落到 role 决定的默认页(admin → /admin,其他 → /)
  ```

- **安全理由**:不做这层白名单就是**开放重定向**漏洞(`?redirect=//evil.com` 可把用户带去外部站)。

### 6.5 注册流程

保持现有语义(注册成功后再发一次登录请求自动登录,`login.vue:64-72`),但:
- 改为**惰性渲染**(未切到注册面板时不挂载);
- 自动登录阶段给出明确进度文案(现状「注册成功,正在自动登录...」之后无反馈);
- 自动登录失败时提示「注册成功,请手动登录」并切到登录面板,而不是弹「注册失败」误导用户。

---

## 七、技术实现

### 7.1 表单校验(修 F1/F2/F3/F4)

按 `app/pages/admin/settings.vue:62-80` 的既有写法:

```ts
const loginRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}
const registerRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 50, message: '用户名长度 3-50 个字符', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: /* 与 password 比对 */, trigger: 'blur' },
  ],
}
```

**⚠ 两处刻意的克制(避免"前端比后端严"导致合法用户登录不了)**:
1. **登录表单只校验 `required`** —— 不加长度/格式规则。旧账号可能不满足新规则,加了会把它们挡在门外。
2. **注册密码下限保持 6 位** —— 与现状 placeholder(`login.vue:160`)和后台 `admin/settings.vue:66`
   的 `min: 6` 一致。**改密码策略是产品决策,不在本方案范围**(若后端规则更严,以后端为准并把前端同步为后端的值)。

配套:每个 `el-form-item` 给 `prop` 与**可见 `label`**(修 A3),`label-position="top"`。

### 7.2 可访问性(修 A1/A2/A3)

| 措施 | 实现 |
|---|---|
| 自动填充(修 A1) | 用户名 `autocomplete="username"`;登录密码 `autocomplete="current-password"`;注册密码 `autocomplete="new-password"`;邮箱 `autocomplete="email"` |
| 可见标签(修 A3) | `el-form-item` 的 `label` 属性(不再是纯 placeholder) |
| 错误播报(修 A2) | 表单顶部一个 `aria-live="polite"` 的区域承载**表单级**错误(字段级由 Element Plus 的 `error` 渲染) |
| 提交中状态 | 表单容器 `aria-busy="true"` |
| 装饰层 | 品牌侧纯装饰元素加 `aria-hidden="true"`,避免屏幕阅读器读噪音 |
| 标题层级 | 页面唯一 `<h1>` = 站名或「登录」,`<h2>` = 卡片标题 |
| SEO | `useHead({ meta: [{ name: 'robots', content: 'noindex' }] })`(修 A6) |
| 动效 | `prefers-reduced-motion`(§4.5) |

### 7.3 SSR 注意事项

- `useBrandTheme(brandColor)` **必须保留在登录页**(`layout: false` 时没有布局代劳),
  且保持在 `<script setup>` 顶层(不能挪进 `onMounted`,否则丢 SSR 时机、产生首屏闪烁)。
- 任何浏览器 API(`navigator.onLine`、`localStorage`)必须放在 `import.meta.client` 分支或事件回调里。
- 卡片设 `min-height`,避免标语/logo 加载造成的布局跳动(CLS)。
- `100dvh` 是纯 CSS,SSR 输出无障碍。

### 7.4 请求层改造(`useApi.ts`)

1. 401 分支带 `returnUrl`(§6.4);
2. 抛出的错误**保留 `statusCode`**(现在直接 `throw error`,形状是 ofetch 的 `FetchError`,
   分类时可读 `error.statusCode` / `error.response?.status`;实施时用一处真实失败请求确认字段名);
3. `authCookie.ts` 共享 cookie 选项(消除 `auth.ts:6-10` 与 `useApi.ts:3-7` 的重复)。

### 7.5 状态管理(`auth.ts`)

- 保留现有 API(`setAuth` / `logout` / `fetchUser`),**不破坏调用点**
  (`layouts/default.vue:12`、`admin.vue`、`login.vue` 都用到);
- 「记住我」通过 `setAuth(data, { remember })` 差异化 `maxAge`(勾选 30 天 / 不勾选会话级);
- `logout()` 里现在直接 `navigateTo('/login')`,建议改为可传 `redirect` 参数,行为向后兼容。

### 7.6 配置开关(`nuxt.config.ts`)

新增(全部在 `public`,供浏览器读取):

```ts
auth: {
  // 未配置则不渲染「忘记密码」入口 —— 后端目前没有该端点(README 认证组仅 login/register/me)
  forgotPasswordUrl: process.env.NUXT_PUBLIC_AUTH_FORGOT_URL || '',
  // 后端就位前置 false;为 true 时预留验证码插槽
  captchaEnabled: false,
  // 品牌侧是否展示(纯展示型部署可关掉,退化为单卡片)
  brandPanel: true,
  // 登录失败退避(纯前端缓解,见 §8 风险)
  maxAttempts: 5,
  lockoutSeconds: 60,
}
```

### 7.7 性能

- **不加任何新依赖**(G8):品牌侧装饰用 CSS 渐变/网格,不引图片、不引动效库;
- 注册表单惰性渲染 ⇒ 首屏只挂 2 个输入框;
- 图标继续用 `@nuxt/icon` 的字符串形式(`prefix-icon="ep:user"`),不引入图标包体积;
- 首屏无 CLS(§7.3)。

---

## 八、依赖与风险

| # | 项 | 类型 | 处置 |
|---|---|---|---|
| D1 | **后端无「忘记密码」端点** | 阻塞 | 用 `forgotPasswordUrl` 开关;**默认不渲染**,不发死链接 |
| D2 | **后端无验证码** | 阻塞 | `captchaEnabled=false` 预留插槽;前端退避(§8)只能缓解 |
| D3 | **后端无 `/api/auth/refresh`**(README 未列) | 阻塞 | 「刷新令牌」链路放阶段三并标注依赖;当前 `refreshToken` 存而不用 |
| D4 | 品牌色运行时可变 ⇒ 对比度不可控 | 已缓解 | §4.3 固定深底策略,文字区域不依赖品牌色亮度 |
| D5 | Tailwind `brand` 色阶缺 7 档 | 前置 | §5.3 先补齐(纯增量,不影响现有页面) |
| D6 | **前端无测试基线**(`tests/` 仅 1 个 `.mjs`;`package.json` 无 `test` 脚本) | 前置 | 阶段零搭测试脚手架(见验收文档) |
| D7 | 无 `app/middleware/` ⇒ 无路由级鉴权 | 范围外 | 本方案**不改鉴权架构**;仅修 `returnUrl` 体验 |
| D8 | 前端退避可被绕过(刷新/清缓存) | 已知局限 | **明确它是体验缓解,不是安全防护**;真正防护需后端限流 |
| D9 | 多客户 clone 实例(`scripts/clone-instance.sh`) | 约束 | 文案/logo 一律读 `useSiteConfig()`,**不写死任何品牌字符串** |

---

## 九、分阶段落地计划

> 每阶段**独立可上线、独立可回滚**;阶段一不依赖阶段二的视觉重构。

### 阶段零:测试脚手架(前置,推荐先做)

- 引入 `vitest` + `@vue/test-utils` + `happy-dom`(**devDependencies**,不影响运行时依赖);
- 在 `package.json` 增加 `"test": "vitest run"` 脚本;
- 为 `useAuthError` / `useAuthRedirect` 等**纯逻辑 composable** 写首批单测(见验收文档 §3)。

### 阶段一:可用性与安全(**不改视觉骨架**,风险最低、收益最直接)

覆盖 P0/P1 中的非视觉项:
- 校验规则化 + placeholder 承诺的规则落地(F1/F2/F3/F4);
- `autocomplete` / 可见 `label` / `aria-live` / `robots:noindex`(A1/A2/A3/A6);
- 错误四分类(S2);
- Enter 全表提交 + 提交期禁用输入框(I1/I2);
- `returnUrl` 与开放重定向白名单(I5);
- 响应式兜底:`100dvh` + 溢出滚动 + 小屏内边距(R1/R2);
- **补回页脚(含 ICP)**(V6 —— 合规回归)。

### 阶段二:视觉升级(用户诉求本体)

- 补齐 Tailwind `brand` 色阶(D5);
- 落 `--auth-*` 设计令牌,统一圆角/阴影到全站 `.card` 规格(V5);
- 拆分 `app/components/auth/*`,落分栏布局与品牌侧(V1/V2/V3/V4);
- 动效 + `prefers-reduced-motion`(R4);
- 对比度按 §4.3 固化。

### 阶段三:能力增强(含后端依赖)

- 「记住我」(I3);
- 登录失败退避 `useLoginThrottle`(缓解 D2,明确其局限);
- `refreshToken` 刷新链路(D3,**阻塞**);
- 忘记密码入口(D1,**阻塞**);
- 验证码插槽(D2,**阻塞**);
- 暗色模式(V7,可选:站点配置已有 `theme` 字段与 `/api/site-settings/themes` 端点)。

---

## 十、明确不做(边界)

1. **不改后端**接口与密码策略;
2. **不改鉴权架构**(不新增 `middleware/`,不动 401 登出语义 —— 只加 `returnUrl`);
3. **不做第三方登录**(后端无支持);
4. **不放宽/收紧密码规则**(注册仍 ≥6 位,与后端和后台页保持一致);
5. **不引入新运行时依赖**(G8);
6. **不在前端实现"真正的"防爆破**(D8:前端限流可被绕过,只做体验缓解);
7. **不动首页/后台**(`docs/home-design-redesign/` 是另一条线);
8. 三个产物文件(`notes/login-page-audit.md`、本文件、验收文档)**本次不提交**,由用户决定。
