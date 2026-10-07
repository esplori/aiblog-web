# 登录页审计笔记(login-page-audit)

> 2026-10-07 | 审计对象:`/home/ubuntu/aiblog-web` | 审计者:Pytrix
> 第 1 节 = 第 1 步(结构探查);第 2 节 = 第 2 步(现状诊断与优先级)
> ⚠ 本文件与 `docs/login-redesign-plan.md`、`docs/login-redesign-acceptance.md` 均落在
> **aiblog-web 项目内** —— 任务对象是该项目的登录页,且该项目已有 `docs/home-design-redesign/`
> 的设计文档先例,产物应与被改造对象同库。

---

## 1. 结构探查(第 1 步)

### 1.1 项目基本情况

| 项 | 值 | 出处 |
|---|---|---|
| 项目名 | `aiblog-web`(`package.json` 的 `name` 字段) | `package.json:2` |
| 定位 | 可白标换肤的博客系统前端,当前品牌 `Pylox` | `nuxt.config.ts` runtimeConfig.public.site |
| 版本控制 | 独立 git 仓库,分支 **`master`** | `git branch --show-current` |
| 项目约定文档 | **无** `AGENTS.md` / `CLAUDE.md` / `.cursorrules` | `ls` 确认 |
| 包管理 | pnpm(`pnpm-workspace.yaml`、`pnpm-lock.yaml`) | 顶层清单 |

### 1.2 前端框架与技术栈

| 项 | 值 | 出处 |
|---|---|---|
| 框架 | **Nuxt 3**(`^3.17.5`)+ **Vue 3**(`^3.5.13`) | `package.json:12-27` |
| 渲染 | **SSR 开启**(`ssr: true`) | `nuxt.config.ts` |
| 源码目录 | `srcDir: 'app'` ⚠ **因此 `app.vue` 实际在 `app/app.vue`,顶层无 `app.vue`** | `nuxt.config.ts` |
| 语言 | TypeScript(`typescript ^5.8.3`) | `package.json:32` |
| UI 库 | **Element Plus**(`^2.9.1`,`importStyle: 'css'`)+ `@element-plus/nuxt` | `package.json:18` |
| CSS | **Tailwind CSS**(`@nuxtjs/tailwindcss ^6.13.2`) | `package.json:31` |
| 图标 | `@nuxt/icon`(用法为字符串 `prefix-icon="ep:user"`) | `login.vue:97,107` |
| 状态管理 | **Pinia**(`@pinia/nuxt`) | `package.json:14` |
| 表格/图表 | `echarts` + `vue-echarts`(后台用) | `package.json:16,25` |

**样式方案:双层**
1. **Tailwind 原子类**写页面结构;`tailwind.config.js` 把 `brand` 色阶映射到 CSS 变量。
2. **CSS 变量驱动换肤**:`app/assets/css/main.css:7-9` 定义 `--color-brand`;`main.css:50-58` 用
   `:root:root` 提升特异性,**把 Element Plus 的 `--el-color-primary*` 重映射到该变量** —— 于是
   组件库主色跟随品牌色,换肤无需改代码。

**⚠ 关键约束:Tailwind 的 `brand` 色阶只定义了 5 档** —— `DEFAULT / 50 / 100 / 600 / 700`
(`tailwind.config.js`)。**没有 200/300/400/500/800/900**;任何 `bg-brand-400` 之类的类名会**静默失效**
(Tailwind 不会报错,只是不生成该规则)。这是改造方案里最容易被忽略的硬约束。

### 1.3 目录结构(仅列本任务相关)

```
aiblog-web/
├─ app/                    ← srcDir
│  ├─ app.vue              ← 根组件:预取 site-settings、注入 head
│  ├─ pages/
│  │  ├─ login.vue         ← ★ 改造对象(195 行)
│  │  ├─ index.vue / articles/ / post/ / admin/ / 403.vue
│  ├─ layouts/
│  │  ├─ default.vue       ← 博客布局(header + main + footer)
│  │  └─ admin.vue         ← 后台布局(侧边栏)
│  ├─ components/
│  │  ├─ ArticleCover.vue
│  │  └─ blog/BlogHome.vue  ⚠ 仅 2 个组件,无 form/input 类通用组件
│  ├─ composables/
│  │  ├─ useApi.ts         ← 统一请求封装(SSR/CSR 双路径 + 401 处理)
│  │  └─ useSiteConfig.ts  ← 品牌配置(DB > .env)+ useBrandTheme
│  ├─ stores/auth.ts       ← ★ 认证状态(token/refreshToken 存 cookie)
│  ├─ types/index.ts       ← ★ ApiResponse / LoginData / User 等契约
│  ├─ assets/css/main.css  ← 全局样式 + 品牌变量
│  ├─ plugins/  (空)
│  └─ public/
├─ docs/
│  ├─ home-design-redesign/   ← 既有首页改造先例(PROPOSALS.md + 多套 HTML 原型)
├─ tests/article-cover.test.mjs   ← ★ 唯一测试文件
├─ nuxt.config.ts / tailwind.config.js / package.json
```

**⚠ 无 `app/middleware/` 目录** ⇒ 不存在路由级鉴权中间件(登录态门禁靠 `useApi` 的 401 分支)。

### 1.4 路由

| 路由 | 文件 | 布局 |
|---|---|---|
| `/` | `app/pages/index.vue` | `default` |
| `/articles` | `app/pages/articles/` | `default` |
| `/post/...` | `app/pages/post/` | `default` |
| **`/login`** | **`app/pages/login.vue`** | **`layout: false`(独立布局)** |
| `/admin` | `app/pages/admin/` | `admin` |
| `/403` | `app/pages/403.vue` | — |

**`/login` 的关键特性**:`definePageMeta({ layout: false })`(`login.vue:4-6`)⇒ **不套用任何布局**,
没有站点 header/footer,也就**必须自己调用 `useBrandTheme(brandColor)`**(`login.vue:13`)才能拿到品牌色。

### 1.5 登录页组件(改造对象)

**文件:`app/pages/login.vue`(195 行,单文件包含登录+注册两个表单)**

结构:`min-h-screen` 居中 → 渐变底(`from-brand-600 to-brand-700`)→ 白卡片
(`max-w-md p-8 rounded-lg shadow-lg`)→ 标题区(`name` + 副标题)→ `el-tabs`(登录/注册)。

**登录表单**:`username` / `password` 两个 `el-input`(`size="large"`,`prefix-icon`)+ 提交按钮。
**注册表单**:`username` / `email` / `displayName` / `password` / `confirmPassword` 五个输入框。

**逻辑**:`handleLogin` → `post('/api/auth/login', form)` → `authStore.setAuth(res.data)` →
`navigateTo(role === 'admin' ? '/admin' : '/')`;`handleRegister` → 注册成功后**再发一次登录请求**自动登录。

### 1.6 状态管理(认证)

**文件:`app/stores/auth.ts`(43 行,Pinia setup store)**

| 成员 | 说明 |
|---|---|
| `token` / `refreshToken` | `useCookie`,**`maxAge` 7 天、`secure: false`、`path: '/'`**(`auth.ts:6-10`) |
| `user` | `ref<User \| null>`,`userInfo` 在 `setAuth` 时写入,**不持久化** |
| `isLoggedIn` | `computed(() => !!token.value)` |
| `setAuth(data)` | 写三个字段 |
| `logout()` | 清空 + `navigateTo('/login')` |
| `fetchUser()` | `GET /api/users/me`,失败即 `logout()` |

**⚠ 发现:`refreshToken` 被存下来但全站没有任何地方使用它** —— `useApi.ts:72-75` 遇 401
直接清 token 跳登录,**没有刷新重试链路**。

### 1.7 数据契约与后端接口

- 统一响应 `{ code, message, data, timestamp }`(`app/types/index.ts:2-7`);
  分页 `{ records, total, current, size }`。
- 登录响应 `LoginData { accessToken, refreshToken, expiresIn, userInfo: User }`(`types/index.ts:44-49`)。
- 后端端点:**`POST /api/auth/login`**、`POST /api/auth/register`、`GET /api/users/me`
  (README「后端 API 依赖」段;后端为独立项目 `aiblog-java`)。
- 请求封装 `useApi.ts`:SSR 走 `apiBaseInternal`(容器内地址),浏览器走相对路径由 nginx 代理;
  自动带 `Authorization: Bearer <token>`。

### 1.8 测试现状

- **`tests/` 只有 `tests/article-cover.test.mjs` 一个文件**。
- `package.json` 的 `scripts` **没有 `test` 项**(只有 build/dev/generate/preview/postinstall)。
- 结论:**改造前没有可用的组件测试基线**,验收计划需自建(详见验收文档)。

---

## 2. 现状诊断(第 2 步)

> 说明:以下问题均基于 `app/pages/login.vue`(195 行)、`app/stores/auth.ts`、
> `app/composables/useApi.ts`、`app/assets/css/main.css`、`tailwind.config.js` 的**实际代码**,
> 非泛泛而谈。优先级 P0=阻塞体验/安全,P1=明显短板,P2=锦上添花。

### 2.1 视觉层次(P0/P1)

| # | 问题 | 证据 | 优先级 |
|---|---|---|---|
| V1 | **只用了站点名文字,完全没用 `logoUrl`** —— 站点配置里有 logo 字段,首页布局用了(`layouts/default.vue:25-30`),登录页没用 ⇒ 白标部署时登录页显示不出客户 logo | `login.vue:85` 只有 `{{ name }}`;`useSiteConfig` 返回 `logoUrl` 但登录页只解构了 `name, brandColor`(`login.vue:10`) | **P0** |
| V2 | **无品牌副标题/标语** —— `tagline` 字段存在且未被使用 | `login.vue:86` 固定文案「登录到你的账户」 | P1 |
| V3 | **视觉信息量过低**:整页只有一个卡片、两段文字、两个输入框;无插画/图形/背景层次 ⇒ 这就是「太简单」的直接观感 | `login.vue:82-87` 全页结构 | **P0** |
| V4 | 背景是**单一渐变**,两色取自 `brand-600/700`;`brand-700` 是 `color-mix(… 82%, black)` ⇒ 深色端偏灰,层次弱 | `tailwind.config.js` brand 定义;`login.vue:82` | P2 |
| V5 | 卡片 `rounded-lg`(8px)与全站 `card` 类(`main.css:26-32`,**16px 圆角 + 双层阴影**)风格不一致 | `login.vue:83` vs `main.css:26-32` | P1 |
| V6 | **无 logo/favicon 外的任何站点元素**(页脚、ICP 备案号在登录页缺失 —— 中国大陆部署通常要求首页/登录页可见备案号) | `layouts/default.vue:87-99` 有 footer,登录页 `layout:false` 后**全丢** | P1 |
| V7 | **无暗色模式** —— 全站没有任何 dark 样式(全局 grep `dark` 只命中 `--el-color-primary-dark-2`),但站点配置里有 `theme` 字段且后端有 `/api/site-settings/themes` 端点 | `grep -rn dark app/` 结果;`useSiteConfig.ts:14` | P2 |

### 2.2 交互反馈(P0/P1)

| # | 问题 | 证据 | 优先级 |
|---|---|---|---|
| I1 | **提交期间表单未禁用** —— 只有按钮 `:loading`,输入框仍可编辑,可能提交到一半改值 | `login.vue:114-122`(仅 `:loading="loading"`) | P1 |
| I2 | **Enter 键支持不完整** —— 登录只在密码框绑了 `@keyup.enter`;注册只绑在**确认密码**框。用户名框按回车无反应 | `login.vue:109`、`login.vue:175` | P1 |
| I3 | **无「记住我」** —— 会话固定 7 天 cookie,用户无从选择 | `auth.ts:6-10`(硬编码 `maxAge`) | P1 |
| I4 | **无「忘记密码」入口** —— 后端确实没有该端点(README 认证组只有 login/register/me)⇒ **需后端配合,本方案只能预留入口** | README「后端 API 依赖」认证行 | P2(受后端阻塞) |
| I5 | **登录成功后忽略来路** —— 固定跳 `/admin` 或 `/`;若用户是从 `/admin/articles` 被 401 踢来的,登录后回不到原页 | `login.vue:43`;`useApi.ts:74`(`navigateTo('/login')` 不带 returnUrl) | P1 |
| I6 | **注册成功要发两次请求**(register + login)且文案「正在自动登录...」后无进度反馈 | `login.vue:64-72` | P2 |
| I7 | **切换 tab 不清空错误态**,且两个表单同时挂载,注册表单的 5 个字段在移动端会撑长 | `login.vue:89-192`(`el-tabs` 默认不销毁未激活面板) | P2 |
| I8 | **无密码可见性以外的辅助**(无大小写锁定提示、无输入法提示) | — | P2 |

### 2.3 表单验证(P0)

| # | 问题 | 证据 | 优先级 |
|---|---|---|---|
| F1 | **全站唯一的两个 `:rules` 用在后台页,登录页反而手写 if 校验** ⇒ 与项目既有做法不一致 | `:rules` 仅出现在 `admin/site-settings.vue:132`、`admin/settings.vue:179`;`login.vue:33-36,52-59` 手写 | **P0** |
| F2 | **声明了但未校验的规则**:用户名 placeholder 写「3-50个字符」、密码写「至少6位」,代码只判**非空** | `login.vue:52-55` vs `login.vue:132,160` | **P0** |
| F3 | **邮箱只判非空,不校验格式** | `login.vue:52` | P1 |
| F4 | **无内联字段级错误** —— 全部走 `ElMessage.warning/error` 弹条,字段本身不标红 | `login.vue:34,54,57` | P1 |
| F5 | **无服务端错误到字段的映射** —— 401「用户名或密码错误」只弹全局条,不指向密码框 | `login.vue:44-46` | P1 |
| F6 | 两次密码一致性校验在 `registerForm` 上依赖 `confirmPassword`,但**提交前用解构丢弃**该字段 —— 逻辑对,但校验与载荷构造耦合在一处,易在后续改动中漏掉 | `login.vue:56-63` | P2 |

### 2.4 可访问性(P0/P1)

| # | 问题 | 证据 | 优先级 |
|---|---|---|---|
| A1 | **零 `autocomplete` 属性** —— 密码管理器无法识别用户名/密码字段(全站 `autocomplete` 出现 **0** 次) | `grep -rho autocomplete app/ --include=*.vue \| wc -l` = **0** | **P0** |
| A2 | **无 `aria-*` / `role`** —— 全站 `aria-` 仅 4 处、`role=` **0** 处;登录页内一个都没有;错误提示是弹出条,屏幕阅读器读不到字段级错误 | `grep -rho` 统计 | **P0** |
| A3 | **无 `<label>` 关联** —— 输入框只有 `placeholder`(Element Plus 的 `el-form-item` 未传 `label`)⇒ 占位符一填字就没有可见标签,对认知障碍用户不友好 | `login.vue:92-111`(仅 placeholder) | P1 |
| A4 | 品牌渐变底 + 白色文字/卡片的对比度未经验证(`brand-700` 是 `color-mix` 结果,取值随换肤而变)⇒ **换肤后可能不达 WCAG AA** | `tailwind.config.js`;`login.vue:82` | P1 |
| A5 | 键盘可达性:无跳过导航、无焦点管理(切 tab 后焦点不进入表单) | `login.vue:89` | P2 |
| A6 | 页面无 `robots: noindex` —— 登录页被搜索引擎收录无意义 | `app.vue` 仅设 title/description/favicon | P2 |

### 2.5 响应式(P1)

| # | 问题 | 证据 | 优先级 |
|---|---|---|---|
| R1 | **登录页没有任何断点类** —— 全站 `sm:` 15 处、`md:` 14 处、`lg:` 9 处,`login.vue` 内 **0 处** | `grep -rho 'sm:\|md:\|lg:\|xl:' app/`;登录页全文 | P1 |
| R2 | **小高度窗口溢出无兜底** —— `min-h-screen flex items-center` + 注册表单 5 字段 ⇒ 横屏手机/小窗口下卡片上下被裁且**无法滚动到** | `login.vue:82` | P1 |
| R3 | 卡片固定 `p-8`(32px 内边距)+ `max-w-md`,窄屏(320–360px)下可用宽度偏紧 | `login.vue:83` | P2 |
| R4 | 不支持 `prefers-reduced-motion`(若方案加入动效则必须处理) | 现状无动效,属**方案约束** | P2 |

### 2.6 安全与错误处理(P0)

| # | 问题 | 证据 | 优先级 |
|---|---|---|---|
| S1 | **无验证码/无登录频次限制** —— 后端端点无 captcha 参数,前端也无防爆破(README 甚至记载默认口令 `admin/123456` ⇒ 一旦部署在公网,爆破成本极低) | `login.vue:32-49`;README | **P0** |
| S2 | **错误信息不区分「网络失败」与「凭据错误」** —— 任何异常都退化成 `e?.data?.message \|\| '登录失败'`,网络不通时误导用户反复试密码 | `login.vue:44-46`、`login.vue:73-75` | **P0** |
| S3 | **cookie `secure: false` 硬编码**(为兼容 HTTP 部署)—— 若部署在 HTTPS 下,令牌会跟着明文 HTTP 请求走 | `auth.ts:6-10`;`useApi.ts:3-7`(两处重复定义) | P1 |
| S4 | **refreshToken 存而不用**,401 直接登出,长会话体验差且 token 生命周期管理不完整 | `useApi.ts:72-75`;`auth.ts:14` | P1 |
| S5 | **无 token 过期预判** —— `expiresIn` 从未使用 | `types/index.ts:47` | P2 |
| S6 | 无防重放/CSRF 相关处理说明(纯 Bearer 头、非 cookie 会话,风险较低,但需在方案里明确结论) | `useApi.ts:54-56` | P2 |

### 2.7 优先级汇总

**P0(方案必须解决,共 8 项)**
- **V1** 未使用 `logoUrl`(白标失效)
- **V3** 视觉信息量过低(用户诉求本体)
- **F1** 校验方式与全站既有做法不一致
- **F2** placeholder 声明的规则未实现(用户名 3–50、密码 ≥6)
- **A1** 零 `autocomplete`
- **A2** 零 `aria-*`/字段级错误可读
- **S1** 无频次限制/验证码
- **S2** 网络错误与凭据错误不分

**P1(共 16 项)**:V2、V5、V6、I1、I2、I3、I5、F3、F4、F5、A3、A4、R1、R2、S3、S4
**P2(共 13 项)**:V4、V7、I4、I6、I7、I8、F6、A5、A6、R3、R4、S5、S6

**受外部阻塞(本方案只能预留,不能落地)**
- **I4 忘记密码** ⇒ 后端无该端点(README 认证组仅 login/register/me)
- **S1 验证码** 若走服务端校验 ⇒ 需后端出接口;纯前端方案只能做到「失败 N 次后强制延时」
