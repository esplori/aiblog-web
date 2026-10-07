# 登录页改造 · 验收与测试计划(login-redesign-acceptance)

> 2026-10-07 | 对象:`aiblog-web` | 作者:Pytrix
> 对应方案:`docs/login-redesign-plan.md`(下称「方案」);现状诊断:`notes/login-page-audit.md`(下称「审计」)
> ⚠ **本文件与方案、审计笔记本次均不提交**,由用户决定。

---

## 一、验收总则

1. **每项验收必须有可复现的证据**:命令 + 输出、截图、或工具报告。**不接受"看起来没问题"**。
2. **阶段门禁**:每个阶段（方案 §9）**独立验收**,通过才进入下一阶段;阶段一不依赖阶段二的视觉改动。
3. **失败即上报,不放宽标准**:若某项验收达不到,**如实记录并说明原因**,不修改验收标准来"通过"。
4. **不可自动化的项**（视觉观感、对比度、屏幕阅读器）必须有**手工检查清单 + 检查人签名位**。

### 1.1 环境前置

```bash
cd /home/ubuntu/aiblog-web
pnpm install          # 依赖已装,首次或 lock 变更后需要
pnpm dev              # 开发服务器 → http://localhost:3000（README「快速开始」）
```

⚠ **后端依赖**:登录/注册需要 `aiblog-java` 在 `http://localhost:8080`（`nuxt.config.ts` 的
vite proxy 与 `NUXT_PUBLIC_API_BASE` 默认值）。**后端不可达时,§4.2/§4.3 的联调类用例无法执行** ——
此时只能跑纯逻辑单测,验收状态记为「部分执行(后端阻塞)」,**不得记为通过**。

---

## 二、验收标准(按方案 §1.2 的目标逐条对应)

| 目标 | 验收标准 | 验证手段 | 证据形式 |
|---|---|---|---|
| **G1** 不再"太简单" | 桌面端(≥1024px)呈现「品牌侧 + 表单侧」两栏;品牌侧含 `logoUrl`(或站名回落)、站名、`tagline` 三项 | 1440×900 与 1280×800 两档截图 | 截图 ×2 |
| **G2** 白标正确 | ① 配 `NUXT_PUBLIC_SITE_LOGO_URL` 后品牌侧显示该 logo;② **清空**该变量后回落为站名文字,**不留空白块**;③ 改 `NUXT_PUBLIC_SITE_BRAND_COLOR` 为 `#dc2626` 后全站主色与登录页装饰色同步变化 | 改环境变量重启 → 截图 | 截图 ×3 |
| **G3** 校验符合惯例且规则真实 | ① 代码里存在 `rules` 对象 + `:rules` + `prop`(与 `admin/settings.vue:62-80` 同写法);② 注册用户名输 2 字符 → 报「长度 3-50 个字符」;③ 注册密码输 5 位 → 报「至少 6 位」;④ 邮箱输 `abc` → 报「邮箱格式不正确」;⑤ 两次密码不一致 → 报错 | 手工操作 + 组件测试 | 测试输出 + 截图 |
| **G4** 可访问性达标 | 见 §6 全表通过(axe 0 critical/serious;关键输入框 `autocomplete` 与可见 `label` 齐备;对比度 ≥ AA) | axe DevTools + 手工 | axe 报告截图 |
| **G5** 错误可分辨 | 四类错误给出**不同文案**:① 错密码 →「用户名或密码错误」+ 聚焦密码框;② 停后端 →「网络连接失败…」+ 重试按钮;③ 后端返 500 →「服务暂时不可用…」+ 重试;④ (若后端支持)429 → 倒计时 | 断网/停后端/错密码 三组手工操作 | 截图 ×3 |
| **G6** 登录后回原页 | 未登录直接访问 `/admin/articles` → 被带到 `/login?redirect=%2Fadmin%2Farticles` → 登录成功 → 落到 `/admin/articles` | 手工 + `useAuthRedirect` 单测 | 单测输出 + 截图 |
| **G7** 移动端可用 | 320px 宽无横向滚动;iPhone SE 尺寸(375×667)与**横屏**(667×375)下注册表单 5 字段 + 按钮全部可达 | DevTools 设备模拟 + 手工 | 截图 ×3 |
| **G8** 无新运行时依赖 | `package.json` 的 `dependencies` 与改造前**逐字节相同**(仅 `devDependencies` 可增测试库) | `git diff package.json` | diff 输出 |

---

## 三、阶段零:测试脚手架(前置)

**现状(审计 §1.8)**:`tests/` 只有 `tests/article-cover.test.mjs`;`package.json` 的 `scripts`
**没有 `test` 项** ⇒ 无可用的前端测试基线。方案 §9「阶段零」要求先补脚手架。

### 3.1 步骤

```bash
pnpm add -D vitest @vue/test-utils happy-dom
```

`package.json` 增加:

```json
"scripts": { "test": "vitest run" }
```

### 3.2 验收(阶段零)

| # | 检查项 | 判据 |
|---|---|---|
| T0-1 | `pnpm test` 可运行 | 退出码 0,输出含 vitest 汇总行 |
| T0-2 | 既有测试不回归 | `tests/article-cover.test.mjs` 仍可通过(若与其 runner 冲突,则用 vitest 的 `include` 限定范围,**不删原测试**) |
| T0-3 | `dependencies` 未被改动 | 见 G8 的 diff 检查 |

⚠ **T0-2 的风险**:原测试是 `.mjs`、可能自带的断言风格与 vitest 不同。
实施时先确认它原来的运行方式(`package.json` 无 `test` 脚本 ⇒ 可能是手动 `node tests/...`),
再决定是否纳入 vitest 的 `include`。**不要为了"统一"而改写它**。

---

## 四、测试用例

### 4.1 单元测试:纯逻辑 composable(可完全自动化,优先写)

对应方案 §5.1 的 `app/composables/useAuthError.ts`、`useAuthRedirect.ts`、`app/utils/authCookie.ts`。

| # | 用例 | 输入 | 期望 |
|---|---|---|---|
| T-01 | 凭据错误分类 | `{ statusCode: 401 }` | `message` 含「用户名或密码错误」,`action === 'focus-password'` |
| T-02 | 服务端故障分类 | `{ statusCode: 500 }` | `message` 含「服务暂时不可用」,`action === 'retry'` |
| T-03 | 网络不通分类 | 无 `statusCode` 的 `FetchError` | `message` 含「网络连接失败」,`action === 'retry'` |
| T-04 | 离线态文案 | T-03 输入 + `navigator.onLine === false` | `message` 含「离线」 |
| T-05 | 频次限制分类 | `{ statusCode: 429, data: { message: '稍后再试' } }` | `action === 'backoff'` |
| T-06 | 参数错误透传后端文案 | `{ statusCode: 400, data: { message: '邮箱已被注册' } }` | `message === '邮箱已被注册'` |
| T-07 | **开放重定向防护** | `?redirect=https://evil.com` | 回落 `/`(或角色默认页) |
| T-08 | **协议相对地址防护** | `?redirect=//evil.com` | 回落默认页 |
| T-09 | 反斜杠绕过防护 | `?redirect=/\\evil.com` | 回落默认页 |
| T-10 | 路径穿越防护 | `?redirect=/admin/../..%2Fetc` | 回落默认页 |
| T-11 | 合法站内路径 | `?redirect=/admin/articles?page=2` | 原样返回该路径 |
| T-12 | 缺失 redirect | 无 `redirect` 参数 | 返回 `null`(由调用方按 role 决定默认页) |
| T-13 | cookie 选项一致性 | 比较 `auth.ts` 与 `useApi.ts` 使用的选项对象 | 二者**同一引用/同值**(证明确实消除了重复) |

> **T-07 ~ T-10 是本计划里安全权重最高的四个用例** —— 它们守的是方案 §6.4 的开放重定向漏洞。

### 4.2 组件测试(`@vue/test-utils`)

对应方案 §5.1 的组件。以下用例不依赖后端(mock `useApi`)。

| # | 用例 | 断言 |
|---|---|---|
| T-20 | `AuthLoginForm` 空提交 | 触发校验 → 不调用 `useApi`;出现两个字段级错误 |
| T-21 | `AuthLoginForm` 提交期状态 | 提交中:输入框与按钮均 `disabled`,容器 `aria-busy="true"` |
| T-22 | `AuthRegisterForm` 一致性 | 两次密码不同 → 不提交,报「不一致」 |
| T-23 | `AuthRegisterForm` 规则 | 用户名 2 字符 / 密码 5 位 / 邮箱 `abc` → 分别报错(对应 G3 ②③④) |
| T-24 | `AuthBrandPanel` 回落 | `logoUrl` 为空 → 渲染站名文字;非空 → 渲染 `<img>`,**不渲染**站名文字块 |
| T-25 | `AuthFooter` ICP 条件渲染 | `icp` 为空 → 不渲染 ICP 链接;非空 → 渲染且 `href` 指向 `beian.miit.gov.cn` |
| T-26 | 密码可见性 | 切换后 `type` 在 `password` / `text` 间变化 |
| T-27 | Enter 提交 | 在**用户名**框触发 `keyup.enter` → 触发表单提交(现状只在密码框生效,见审计 I2) |
| T-28 | 错误聚焦 | 401 错误后,焦点落在密码框(`document.activeElement`) |

### 4.3 手工验收清单(不可自动化,必须人工做)

| # | 项目 | 步骤 | 通过判据 |
|---|---|---|---|
| M-01 | 首屏无闪烁(FOUC) | 硬刷新登录页,观察品牌色 | 无"先默认蓝再变色"的跳变(方案 §7.3) |
| M-02 | SSR 输出含品牌色 | `curl -s localhost:3000/login \| grep -o '\-\-color-brand:[^;"]*'` | 命中,且值等于配置的品牌色 |
| M-03 | 无布局跳动(CLS) | DevTools Performance 录制加载 | CLS < 0.1 |
| M-04 | 后端全停时的表现 | `docker stop` 后端(或改错 `API_BASE`)→ 提交登录 | 文案为「网络连接失败…」且有重试按钮(**不是**「登录失败」) |
| M-05 | 错误密码 | 输错密码 | 文案「用户名或密码错误」+ 密码框聚焦 |
| M-06 | 注册→自动登录 | 注册一个新用户 | 进度文案清晰;成功后落到 `/`(非 admin 角色) |
| M-07 | 自动登录失败分支 | 注册后立即停后端 | 提示「注册成功,请手动登录」并切到登录面板(**不是**「注册失败」) |
| M-08 | `?redirect` 真实链路 | 未登录访问 `/admin/articles` → 登录 | 落到 `/admin/articles`(G6) |
| M-09 | 白标换肤 | 改 `NUXT_PUBLIC_SITE_BRAND_COLOR=#dc2626` 重启 | 登录页装饰/按钮/焦点环同步变红,**对比度仍达 AA**(§6) |
| M-10 | logo 未配置 | 清空 `NUXT_PUBLIC_SITE_LOGO_URL` | 回落站名文字,无空白 |
| M-11 | ICP 显示 | 配 `NUXT_PUBLIC_SITE_ICP` | 页脚出现备案号链接且新窗口打开 |
| M-12 | 关掉品牌侧开关 | `NUXT_PUBLIC_AUTH_BRAND_PANEL=false` | 退化为单卡片居中(**这是回滚手段之一**,§8) |

### 4.4 回归清单(不能破坏的既有行为)

| # | 既有行为 | 依据 | 判据 |
|---|---|---|---|
| R-01 | `authStore.setAuth / logout / fetchUser` 调用点不报错 | `layouts/default.vue:12`、`app/pages/admin/*`、`login.vue` | 全站无 console 报错;登录态在导航栏正确显示 |
| R-02 | 401 自动登出并跳登录 | `useApi.ts:72-75` | token 失效后请求 → 被带到登录页 |
| R-03 | SSR 请求走内部地址 | `useApi.ts:62` | SSR 下登录后的后续请求不 404 |
| R-04 | 后台页 `admin/settings.vue` 的密码校验不受影响 | 审计 §1.8 的既有 `:rules` 用法 | 该页仍能正常改密码 |
| R-05 | 首页 `/` 与文章页渲染不变 | 方案 §10.7 | 改动前后截图对比无差异 |
| R-06 | `pnpm build` 成功 | 部署链路 | 退出码 0;**必须**在阶段二(改了 `tailwind.config.js`)后重跑 |

---

## 五、兼容性检查

| # | 维度 | 检查内容 | 判据 |
|---|---|---|---|
| C-01 | 断点 | 375 / 768 / 1024 / 1440 / 1920 五档宽度 | 无横向滚动;布局按方案 §3.2 切换 |
| C-02 | 小高度 | 667×375(手机横屏) | 注册表单全字段 + 按钮**可滚动到达** |
| C-03 | 极窄 | 320×568 | 无横向滚动;不出现文字截断 |
| C-04 | 浏览器 | Chrome / Firefox / Safari(桌面)+ iOS Safari / Android Chrome | 布局一致;输入框聚焦与自动填充正常 |
| C-05 | 自动填充 | 浏览器保存过的密码 | 用户名/密码能被识别并填充(验证 `autocomplete` 生效) |
| C-06 | 密码管理器 | 同上 | 提供保存/更新密码提示 |
| C-07 | 触屏 | 移动端点按输入框、切换、按钮 | 可点中;无 hover-only 交互 |
| C-08 | SSR/CSR | 直接访问 `/login`(SSR)与客户端路由跳转 | 两者渲染一致、无 hydration 警告 |
| C-09 | 构建 | `pnpm build` + `pnpm preview` | 产物可运行,登录流程在 preview 下正常 |
| C-10 | 缩放 | 浏览器缩放 200% | 内容不被裁切(与 a11y 的 WCAG 1.4.4 相关) |
| C-11 | 白标路径 | 按 `scripts/clone-instance.sh` 的换肤口径配不同品牌色各跑一遍 | 无写死的品牌字符串残留(方案 D9) |
| C-12 | 无 JS 降级(可选) | 禁用 JS 访问 `/login` | 至少不白屏(SSR 已输出结构);**此项为观察项,不设通过门槛** |

---

## 六、可访问性检查

### 6.1 自动化

| # | 工具/方法 | 判据 |
|---|---|---|
| A-01 | axe DevTools(浏览器扩展)扫 `/login` | **0 个 critical、0 个 serious** |
| A-02 | Chrome Lighthouse 无障碍分 | ≥ 90(记录实际分数,**不设"必须 100"这种不可达门槛**) |
| A-03 | 键盘 Tab 遍历 | 焦点顺序 = 视觉顺序;可见焦点环;无键盘陷阱 |
| A-04 | `prefers-reduced-motion: reduce` 模拟 | 所有过渡/位移被关闭(方案 §4.5) |

### 6.2 手工(必须在报告里逐条打勾)

| # | 检查项 | 判据 | 依据 |
|---|---|---|---|
| A-10 | **`autocomplete` 齐备** | 用户名 = `username`;登录密码 = `current-password`;注册密码 = `new-password`;邮箱 = `email` | 审计 A1(全站 0 处) |
| A-11 | **可见 `<label>`** | 4 个关键字段均有可见标签(非仅 placeholder) | 审计 A3 |
| A-12 | **表单级错误播报** | 错误区域有 `aria-live="polite"`,屏幕阅读器可读 | 审计 A2 |
| A-13 | 装饰元素隐藏 | 品牌侧纯装饰有 `aria-hidden="true"` | 方案 §7.2 |
| A-14 | 标题层级 | 页面恰有 1 个 `<h1>` | — |
| A-15 | **对比度:表单侧** | 白底 + `#1f1f1f` ≥ 4.5:1(实测约 15:1) | 方案 §4.3 |
| A-16 | **对比度:品牌侧** | 白色文字对 `--auth-panel-base`(`#0b1220`)≥ 4.5:1(实测约 17:1) | 方案 §4.3 |
| A-17 | **对比度:换肤后** | 把品牌色改成**亮色**(如 `#fbbf24`)与**暗色**(如 `#1e3a8a`)各跑一遍 | 文字区域对比度**仍 ≥ 4.5:1** —— 这是 §4.3 策略的核心验证点 |
| A-18 | 提交中状态可感知 | `aria-busy="true"` 且按钮文案/加载态可被读屏识别 | 方案 §6.1 |
| A-19 | 屏幕阅读器实测 | VoiceOver 或 NVDA 走一遍登录流程 | 能听到字段名、错误、成功 |
| A-20 | 缩放 200% | 无内容丢失 | WCAG 1.4.4 |

> **A-17 是分水岭用例**:它直接验证「品牌色运行时可变、对比度仍达标」这一设计决策是否真的成立。
> 若亮色品牌下不达标,说明 §4.3 的深底策略没落实到位(而不是去放宽对比度标准)。

---

## 七、埋点(**先说实话:现状没有埋点**)

### 7.1 现状

- 前端**没有任何埋点/分析 SDK**:`package.json` 无相关依赖,全站无上报代码。
- 唯一与登录相关的可观测性**在后端**:`User.lastLoginAt` 字段(`app/types/index.ts:27`)
  由 `aiblog-java` 在登录时写入。

### 7.2 本方案的处理

**不引入第三方埋点库**(与方案 G8「不引入新运行时依赖」一致)。改为:

| 项 | 做法 | 目的 |
|---|---|---|
| 登录失败原因分类计数 | **仅开发环境**用 `console.debug` 输出分类结果(生产 `import.meta.dev` 门控) | 联调能确认四分类真的生效;不产生生产噪音 |
| 前端错误边界 | 登录页组件外层加 `onErrorCaptured`,开发环境打印 | 避免白屏无人知 |
| 转化率/漏斗等业务埋点 | **不做**,建议接后端:登录接口已写 `lastLoginAt`,如需漏斗由后端记录 | 不在前端重复造轮子 |

⚠ **若用户要求生产埋点**,这是一项**独立需求**(涉及隐私合规、Cookie 同意、上报端点选型),
应单独立项,**不塞进登录页改造**(方案 §10 边界)。

---

## 八、回滚策略

### 8.1 代码回滚

| 层级 | 手段 |
|---|---|
| 单阶段 | 每阶段一个独立提交(或分支),`git revert <commit>` 即可回滚该阶段 |
| 全量 | 改造前的 `master` 提交点;产物文件未提交,不影响业务代码 |
| 部署 | `pnpm build` 重新出包(方案 §5.3 只增色阶,回滚后无需清理构建缓存) |

### 8.2 运行时开关(**无需重新发版**的回滚路径)

方案 §7.6 定义的 `runtimeConfig.public.auth` 让**部分改动可以只靠环境变量关掉**:

| 开关 | 值 | 效果 |
|---|---|---|
| `NUXT_PUBLIC_AUTH_BRAND_PANEL` | `false` | 隐藏品牌侧,**退化为单卡片居中**(接近改造前的形态) —— 对应验收 M-12 |
| `NUXT_PUBLIC_AUTH_FORGOT_URL` | 空 | 不渲染「忘记密码」入口(默认即空) |
| `NUXT_PUBLIC_AUTH_CAPTCHA_ENABLED` | `false` | 不渲染验证码插槽(默认即 false) |
| `NUXT_PUBLIC_SITE_BRAND_COLOR` | 任意合法色 | 回到原品牌色(视觉回归) |

> ⚠ **注意**:`runtimeConfig.public` 的值在**构建期与运行期均可注入**,但本项目的品牌配置走
> "DB 优先 > .env"(见 `useSiteConfig.ts:46-71`)⇒ 若后台已配品牌色,**改 `.env` 不生效**,
> 需从后台站点设置改。回滚演练时必须先确认改的是哪一层(验收 M-09 就是为此设计)。

### 8.3 数据回滚

登录页改造**不涉及数据迁移**(不改表、不改字段)。唯一相关副作用是按「记住我」写更长 `maxAge`
的 cookie —— 回滚后旧 cookie 仍在有效期内,用户可能保持登录;如需强制失效,清 `token` cookie 即可。

---

## 九、阶段 ↔ 验收 对应表(**门禁**)

| 阶段(方案 §9) | 覆盖目标 | 必跑用例 | 阶段出口条件 |
|---|---|---|---|
| **阶段零** 测试脚手架 | — | T0-1 ~ T0-3 | `pnpm test` 可运行;`dependencies` 未变 |
| **阶段一** 可用性与安全 | G3 / G4(部分) / G5 / G6 / G7 / G8 | T-01~T-13、T-20~T-28、M-03~M-08、M-11、A-01~A-04、A-10~A-15、A-18、C-01~C-03、C-09、R-01~R-05 | 上述全通过 |
| **阶段二** 视觉升级 | G1 / G2 / G4(对比度) / G7 | M-01、M-02、M-09、M-10、M-12、A-16、A-17、A-19、A-20、C-04~C-08、C-10、C-11、R-05、R-06 | 上述全通过(尤其 **A-17** 与 **R-06**) |
| **阶段三** 能力增强 | G5(退避) / G4(部分) | T-05、M-04、C-12 + 新增项用例 | 逐项定义;**后端阻塞项需先确认端点存在** |

### 9.1 组件 ↔ 用例 对应

| 方案 §5.1 组件/模块 | 对应用例 |
|---|---|
| `app/components/auth/Shell.vue` | M-03、C-01~C-03、C-10 |
| `app/components/auth/BrandPanel.vue` | T-24、M-09、M-10、A-13、A-17 |
| `app/components/auth/FormCard.vue` | T-21、A-18 |
| `app/components/auth/LoginForm.vue` | T-20、T-21、T-27、T-28、M-04~M-05 |
| `app/components/auth/RegisterForm.vue` | T-22、T-23、M-06、M-07 |
| `app/components/auth/ModeSwitch.vue` | A-03(键盘遍历)、M-06 |
| `app/components/auth/Footer.vue` | T-25、M-11 |
| `app/composables/useAuthError.ts` | T-01~T-06、M-04、M-05 |
| `app/composables/useAuthRedirect.ts` | **T-07~T-12**、M-08 |
| `app/utils/authCookie.ts` | T-13 |
| `app/composables/useLoginThrottle.ts`(阶段三) | T-05 |
| `app/pages/login.vue` | M-01、M-02、C-08 |
| `tailwind.config.js` | R-06(构建) |
| `app/assets/css/main.css` | A-04、A-16、A-17 |

---

## 十、报告模板(每阶段验收时填写)

```markdown
## 阶段 <N> 验收报告 · <日期>

环境:后端运行 / 未运行(阻塞项:…)
执行者:… | 复核者:…

| 用例 | 结果 | 证据 |
|---|---|---|
| T-01 | 通过 | <命令输出/截图路径> |
| … | … | … |

未执行:<列出并说明原因>
未通过:<列出 + 原因 + 处置(修 or 上报),**不得删除该行**>
结论:通过 / 不通过 / 部分执行(后端阻塞)
```

⚠ **「未通过」栏必须保留**:即使后续修复,也要留痕 —— 否则无法判断哪些问题是"曾经存在过"的。

---

## 十一、明确不做

1. 不引入生产埋点/分析 SDK(§7.2,属独立需求);
2. 不为"通过验收"而放宽任何标准(§1.3);
3. 不改写既有 `tests/article-cover.test.mjs`;
4. 不做后端接口测试(那是 `aiblog-java` 的验收范围);
5. 三个文档产物本次不提交。
