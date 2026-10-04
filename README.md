# aiblog-web

博客系统前端（Nuxt 3 / SSR）。与 [aiblog-java](../aiblog-java) 后端组成前后端分离的博客平台，默认品牌名 **Pylox**。

**产品化目标：一套代码换肤换名。** 站点名称、标语、品牌主色、Logo、favicon、页脚、版权、ICP 备案号均可运行时配置；配合后端多实例编排，可为不同客户克隆出完全隔离的实例（独立域名/端口/数据卷/内容）。因此新增样式**必须走品牌色变量**（`--color-brand` / Tailwind 的 `brand-*` 色阶），不要写死颜色。

## 技术栈

| 类别 | 选型（`package.json` 声明） |
| --- | --- |
| 框架 | Nuxt 3（`^3.17.5`；SSR，`srcDir: 'app'`） |
| 视图 | Vue 3.5（`^3.5.13`）+ Element Plus（`^2.9.1`）+ Tailwind CSS 3（经 `@nuxtjs/tailwindcss ^6.13.2`） |
| 状态 | Pinia 3（`^3.0.3`） |
| 图表 | ECharts 6（`^6.1.0`）+ vue-echarts |
| 内容 | markdown-it 15（`^15.0.0`；前台渲染）、md-editor-v3 6（后台编辑器） |
| 图标 | @nuxt/icon + @iconify-json/ep |
| 包管理 | pnpm |
| 运行时 | Node 22（Dockerfile 基准 `node:22-alpine`） |

> `pnpm-lock.yaml` 当前解析到的实际版本：Nuxt 3.21.11、Vue 3.5.41、Element Plus 2.14.4、Pinia 3.0.3、ECharts 6.1.0、Tailwind CSS 3.4.19、markdown-it 15.0.0、md-editor-v3 6.5.6。

## 快速开始

```bash
# 安装依赖（pnpm-workspace.yaml 已配置 allowBuilds: esbuild: true）
pnpm install

# 开发服务器 → http://localhost:3000
pnpm dev

# 生产构建（产物在 .output/）
pnpm build

# 本地预览构建产物
pnpm preview

# 静态生成（当前为 SSR 部署，一般不用）
pnpm generate
```

开发时前端通过 Vite 代理把 `/api` 转发到后端，目标地址取 `NUXT_PUBLIC_API_BASE`，默认 `http://localhost:8080`（见 `nuxt.config.ts`）。

### 测试

`package.json` 里**没有** test script，用 Node 内置测试运行器直接跑：

```bash
node --test                                # 自动发现 tests/*.test.mjs
node --test tests/article-cover.test.mjs   # 或指定文件
```

当前覆盖 `app/utils/articleCover.mjs` 的纯函数（5 个用例）。组件与页面暂无测试。

## 环境变量

`.env` 不入库（`.gitignore` 已忽略；`!.env.example` 规则已预留但文件尚未创建）。全部为可选，未设置时回落代码默认值：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `NUXT_API_BASE_INTERNAL` | `http://localhost:8080` | **SSR 侧**访问后端的地址，浏览器不可见 |
| `NUXT_PUBLIC_API_BASE` | `http://localhost:8080` | **浏览器侧** API 基址（开发代理目标） |
| `NUXT_PUBLIC_SITE_NAME` | `Pylox` | 站点名称 |
| `NUXT_PUBLIC_SITE_TAGLINE` | `AI 驱动的现代化博客系统` | 站点标语 |
| `NUXT_PUBLIC_SITE_DESCRIPTION` | 见 `nuxt.config.ts` | 站点描述，用于 SEO |
| `NUXT_PUBLIC_SITE_BRAND_COLOR` | `#2563eb` | 品牌主色，驱动整站主题 |
| `NUXT_PUBLIC_SITE_LOGO_URL` | 空 | 站点 Logo，留空显示文字站名 |
| `NUXT_PUBLIC_SITE_FAVICON_URL` | 空 | 站点图标，留空用 `/favicon.ico` |
| `NUXT_PUBLIC_SITE_FOOTER_TEXT` | 空 | 页脚附加文案 |
| `NUXT_PUBLIC_SITE_COPYRIGHT` | 空 | 版权声明，留空默认 `© 年份 站点名` |
| `NUXT_PUBLIC_SITE_ICP` | 空 | ICP 备案号，留空不显示 |

容器部署另有：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `API_BACKEND_HOST` | `aiblog-java` | nginx 反代 `/api` 的后端主机名，启动时写入 nginx 配置 |

## 配置优先级

站点外观的生效顺序：**后端 `site_settings` 表（后台可运行时修改）> `.env` > 代码默认值**。

- `app/composables/useSiteConfig.ts` 用 `useAsyncData('site-settings')` 预取后端配置，SSR 时**阻塞渲染**，值随 payload 下发、客户端不重复请求；后端不可达时回退 `.env`。
- 合并规则：后端字段为 `null` 或空串时**不覆盖**已有默认值。
- `app/app.vue` 顶层 `await useSiteSettings()` 保证渲染前配置已就绪。
- 品牌色通过 `useBrandTheme()` 在 SSR 阶段写入 `<html>` 内联 style，避免客户端注入导致的**首屏颜色闪烁**。
- `app/assets/css/main.css` 用 `:root:root` 提升特异性覆盖 Element Plus 的 `--el-color-primary`，并用 `color-mix()` 派生各 light/dark 变体——Element Plus 组件主色跟随同一个变量。

后台「站点设置」页（`/admin/site-settings`，仅管理员）可修改上述全部字段，并可从后端提供的主题预设中选择（当前：`blue` 商务蓝 / `orange` 温暖橙 / `gray` 简约灰，来自 `GET /api/site-settings/themes`）。

## 架构

生产容器内 **Nuxt SSR 跑 3001、nginx 跑 3000**，对外只暴露 3000：

```
浏览器 ──► nginx :3000 ──┬─► /api/           ──► http://$API_BACKEND_HOST:8080   （后端）
                         ├─► /api/_nuxt_icon/ ─► Nitro :3001                    （图标 API）
                         ├─► /uploads/       ──► /app/uploads/  （alias，上传文件）
                         ├─► /_nuxt/ + 静态  ──► /app/.output/public
                         └─► 其余 /          ──► Nitro :3001  （SSR）
```

`nginx.conf.template` 中的 `@API_BACKEND_HOST@` 占位符由 `entrypoint.sh` 在启动时用环境变量替换，因此**同一镜像可起多实例、各自指向不同后端**。注意 `/api/_nuxt_icon/` 必须排在 `/api/` 之前，否则图标 API 会被误代理到后端。

前端 API 调用统一走 `app/composables/useApi.ts`，其中按环境分流：

- **SSR 时**直接请求 `NUXT_API_BASE_INTERNAL`（避免 Nitro 自身无 `/api` 代理导致 404），并从 `useRequestHeaders(['cookie'])` 中提取 token；
- **浏览器端**使用相对路径 `/api/...`，交给 nginx 反代；
- 请求统一带 `Authorization: Bearer <token>`；收到 401 时清 token 并跳转 `/login`。

## 目录结构

```
app/
  app.vue                 应用根组件：预取站点配置 + 全局 head
  layouts/
    default.vue           前台布局（顶部导航 + 页脚）
    admin.vue             后台布局（可折叠侧栏，菜单按角色动态加载）
  pages/                  18 个路由页面（见下）
  components/
    ArticleCover.vue      文章封面：图片 / 编辑部风格海报双态
    blog/BlogHome.vue     博客首页（三栏粘性布局）
  composables/
    useApi.ts             统一请求封装（SSR/浏览器分流、鉴权、401 处理）
    useSiteConfig.ts      站点配置读取、合并与品牌色注入
  stores/auth.ts          登录态（Pinia，token 存 cookie）
  utils/
    articleCover.mjs      封面主题映射、编号/计数格式化（有测试）
    markdown.ts           markdown-it 实例与渲染函数
  types/index.ts          后端响应与实体类型
  assets/css/main.css     全局样式、品牌色变量、Element Plus 主题覆盖
  public/                 favicon.ico、robots.txt
docs/home-design-redesign/  首页改版设计稿与候选方案对比（HTML 原型 + PROPOSALS.md）
scripts/                  多实例克隆脚本与初始化 SQL
tests/                    Node 内置测试
nuxt.config.ts            Nuxt 配置（srcDir / SSR / runtimeConfig / 模块）
nginx.conf.template       nginx 配置模板（API 与应用分流）
entrypoint.sh             容器入口：渲染 nginx 配置后启动 SSR + nginx
Dockerfile                多阶段构建（builder → node:22-alpine + nginx）
```

### 路由

**前台**：`/`（博客首页）、`/articles`（文章列表）、`/post/[uuid]`（文章详情，**对外标识用 UUID**）、`/login`

**后台**：`/admin`（看板）、`/admin/articles`（含 `create` / `edit/[id]`）、`categories`、`tags`、`comments`、`files`、`menus`、`roles`、`users`、`settings`（个人设置）、`site-settings`（站点设置，仅管理员）

**兜底**：`/403`

> 后台布局在 `onMounted` 中依次完成「校验登录 → 拉取用户 → 按角色加载 `/api/menus`」后才渲染子页面，因此后台页面实际是客户端渲染；无权限访问会跳转 `/403`。

## 后端 API 依赖

前端调用的端点（均由 aiblog-java 提供）：

| 分组 | 端点 |
| --- | --- |
| 认证 | `POST /api/auth/login`、`POST /api/auth/register`、`GET /api/users/me` |
| 文章 | `GET /api/articles`、`GET /api/articles/{id}`、`GET /api/articles/uuid/{uuid}`、`POST /api/articles/{id}/like` |
| 分类/标签 | `GET/POST /api/categories`、`PUT/DELETE /api/categories/{id}`、`GET /api/tags`、`GET /api/tags/hot`、`PUT/DELETE /api/tags/{id}` |
| 评论 | `GET /api/comments/article/{id}`、`POST /api/comments`、`DELETE /api/comments/{id}`、`PUT /api/comments/{id}/status` |
| 文件 | `POST /api/files/upload`、`GET /api/files/user/{userId}`、`DELETE /api/files/{id}` |
| 站点设置 | `GET /api/site-settings`、`GET /api/site-settings/themes`、`PUT /api/admin/site-settings` |
| 后台管理 | `GET /api/menus`、`/api/admin/users`、`/api/admin/roles`（含 `{id}/menus`）、`/api/admin/menus`（含 `{id}/roles`）、`PUT /api/admin/users/{id}/role` |
| 统计 | `GET /api/admin/stats/trend`、`/article-trend`、`/category-distribution`、`/top-articles` |

响应统一为 `{ code, message, data, timestamp }`，分页数据为 `{ records, total, current, size }`（见 `app/types/index.ts`）。

## 部署

多阶段构建：builder 阶段 `pnpm install --frozen-lockfile` + `pnpm build`，运行阶段基于 `node:22-alpine` 并安装 nginx、curl、tzdata（时区 `Asia/Shanghai`）。仅拷贝 `.output` 与 `package.json` 到运行镜像。

```bash
docker build -t aiblog-web .
docker run -p 3000:3000 -e API_BACKEND_HOST=aiblog-java aiblog-web
```

容器健康检查为 `curl -f http://localhost:3000`（间隔 30s）。完整编排见仓库外的 `docker-compose.yml`。

多实例克隆（独立网络/数据卷/端口/主题/内容）见 `scripts/clone-instance.sh`，用法 `clone-instance.sh <实例名> [--flavor web|enterprise] [--with-demo] [--dry-run]`。
