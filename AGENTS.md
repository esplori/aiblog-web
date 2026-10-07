# aiblog-web 项目约定

> 本文件记录「在这个仓库里怎么做事」:技术栈口径、常用命令、代码约定、提交与分支格式、部署流程、踩过的坑。
> 由 agent 与人工共同维护;改动时保留仍有价值的内容,保持精炼。
> 生成/最后校订:**2026-10-07**(登录页改造 + 重新部署那次)。

## 项目概况

- **Nuxt 3 SSR 博客系统前端**;默认品牌 `Pylox`,支持**白标换肤**(改环境变量即可换名/换色/换 logo,见「部署约定」)。
- 仓库:分支 **`master`**(⚠ 不是 `main`);远端 `git@github.com:esplori/aiblog-web.git`(SSH)。
- 包管理 **pnpm**(`pnpm-lock.yaml`,`lockfileVersion: '9.0'`);实测 node `v22.22.3` / pnpm `11.22.0`;
  Docker 构建用 `node:22-alpine`。
- ⚠ **`srcDir: 'app'`**(见 `nuxt.config.ts`)⇒ 源码在 `app/` 下:
  **`app.vue` 实际是 `app/app.vue`,仓库根目录没有 `app.vue`**。
- ⚠ `package.json` **没有 `version` 字段** —— 本仓不用 package 版本号做发布标识。
- **无 CI**(无 `.github/workflows/`)、**无 `deploy.sh`**。

## 目录结构

| 路径 | 说明 |
|---|---|
| `app/` | 源码(`srcDir`)。`pages/` `layouts/` `components/` `composables/` `stores/` `utils/` `assets/css/main.css` `types/` |
| `app/components/auth/` | 登录页组件(2026-10-07 新增):`Shell` / `BrandPanel` / `FormCard` / `ModeSwitch` / `LoginForm` / `RegisterForm` / `Footer` |
| `docs/` | 设计与规范文档(`home-design-redesign/`、`login-redesign-plan.md`、`login-redesign-acceptance.md`) |
| `notes/` | 审计与分析笔记(如 `login-page-audit.md`) |
| `content/posts/*.md` | 博文源文件 |
| `publish-log.md` | 发布记录 |
| `scripts/` | `clone-instance.sh`(多实例克隆)、`init-data-clean.sql`、`test-clone-instance.sh` |
| `tests/` | 单测(两套 runner,见下) |
| `Dockerfile` / `nginx.conf.template` / `entrypoint.sh` | 部署(多阶段构建 + 容器内 nginx) |
| **`.output/`** | **Nuxt 3 构建产物目录(⚠ 不是 `dist/`)**,已被 `.gitignore` 排除 |
| `nuxt.config.ts` / `tailwind.config.js` / `tsconfig.json` | 配置 |

## 常用命令

```bash
pnpm install          # 安装依赖(pnpm-workspace.yaml 配了 allowBuilds: esbuild: true)
pnpm dev              # 开发服务器 → http://localhost:3000
pnpm build            # 生产构建(产物在 .output/)
pnpm preview          # 本地预览构建产物
pnpm test             # 单测:vitest(tests/**/*.test.ts)
pnpm test:node        # 单测:node:test(tests/article-cover.test.mjs)
```

⚠ **两套测试 runner 并存**,是有意为之:
- 新增测试用 **vitest**(`*.test.ts`),配置见 `vitest.config.ts`(`environment: happy-dom`);
- `tests/article-cover.test.mjs` 用 **`node:test`**,由 `pnpm test:node` 单独跑 ——
  vitest 的 `include` 刻意只收 `*.test.ts`,**不要为了"统一"改写它**。

## 代码约定

- TypeScript + Vue 3 `<script setup>`;UI 用 **Element Plus**(`importStyle: 'css'`)+ **Tailwind** + **Pinia** + `@nuxt/icon`。
- ⚠ **`nuxt.config.ts` 禁用了 `defineModel` 与 `propsDestructure`**(vite.vue.script)⇒
  组件里**不能用 `defineModel`**,要写标准 `props` + `emits` 实现 `v-model`。
- ⚠ **Tailwind `content` globs 不含 `./app/utils/**`** ⇒ 该目录的文件**不要写 Tailwind 类名**(那些类不会被生成)。
  该目录只放常量与纯逻辑。
- ⚠ **`brand` 色阶只有 11 档**(`DEFAULT` + `50/100/200/300/400/500/600/700/800/900`,见 `tailwind.config.js`)。
  写不在档位里的类(如 `bg-brand-950`)**不会报错,只是静默不生成规则**。
- **品牌/站点名一律读 `useSiteConfig()`**,不要写死字符串 —— 这是白标与多客户克隆(`scripts/clone-instance.sh`)的前提。
- **页面 `layout: false` 时没有布局代劳**:需自己在 `<script setup>` **顶层**调 `useBrandTheme(brandColor)`
  (放 `onMounted` 会丢 SSR 时机 → 首屏颜色闪烁)。
- 请求统一走 **`useApi()`**;认证 cookie 选项统一取 **`app/utils/authCookie.ts`**(不要在别处重复定义)。
- 改**含中文的文件**注意全角字符(如全角冒号 `:` U+FF1A、全角括号 `(` U+FF08):
  文本替换失配时**照抄报错信息给出的该行原文**,不要凭肉眼重打。

## 提交信息格式

- **中文描述 + conventional 前缀**(scope 可选)。仓库历史实例:
  - `docs(readme): 用项目实况文档替换 Nuxt 模板原文`
  - `feat(web): 前台移除企业官网模板,只保留博客模板`
  - 也出现过纯中文陈述句(如 `修复文章表单分类默认显示为 0 的问题`)——**两种都见得到**;
    新增提交**建议**用 `type(scope): 中文描述`。
- **一次提交只做一类改动**(代码 / 文档 / 版本号分开,便于回滚与 `revert`)。
- 历史提交署名是 `vinco`;本仓未强制 commit 钩子。

## 分支策略

- **单长期分支 `master`**,直接在 `master` 上提交并推送(`origin` = GitHub `esplori/aiblog-web`)。
- **无 PR 流程、无 CI 门禁** ⇒ 本地校验就是唯一门禁,提交前至少跑:
  `pnpm test` + `pnpm test:node` + `pnpm build`。
- 推送后**回读远端**确认一致:
  `git rev-parse master` 与 `git ls-remote origin refs/heads/master` 对比。
- ⚠ **线上跑的是工作区状态**(Docker 构建的是当前文件,不是某个 commit)——
  提交与否**不影响**线上。但**部署前建议先提交**,让线上有唯一 commit 可指。

## 文档规范

- **长期规范/设计 → `docs/`**;**审计与分析笔记 → `notes/`**;**博文 → `content/posts/`**。
- **一次性产物不要落在仓库根目录**(部署报告、验证记录等放仓库外,例如 workspace 目录)。
- 文档里的 `文件:行号` 引用要**机械核验**(引用会随行号漂移失效)。

## 部署约定

- **编排文件在仓库外**:`/home/ubuntu/docker-compose.yml`(compose 项目名 `ubuntu`,服务名 `aiblog-web`)。
- **重新部署**:

  ```bash
  cd /home/ubuntu && docker compose up -d --build --no-deps aiblog-web
  ```

  - `--no-deps` **只重建 web**,不动 `aiblog-java` / `aiblog-postgres` / `aiblog-redis` / `aiblog-minio`;后端未就绪无法启动。
  - 镜像 `ubuntu-aiblog-web:latest`;容器 `aiblog-web`;端口 `3000:3000`。
  - 容器内:**nginx 前台 3000 → Nuxt SSR 内部 3001**(见 `entrypoint.sh`);
    nginx 配置由 `nginx.conf.template` 按环境变量 `API_BACKEND_HOST` 生成,`/api/` 反代到后端 8080。
  - 健康检查 `curl -f http://localhost:3000`(间隔 30s、start_period 60s)。
  - ⚠ **无 `docker-compose`(v1)二进制** ⇒ 用 `docker compose` 子命令(实测 Compose v5.1.4)。
- ⚠ **构建约 5 分钟,必须后台跑 + 轮询**:`nohup ... &` 后台化再查退出码。
  前台调用会被工具超时**截断,但进程仍在后台跑**(会造成"以为失败了其实在跑/重复启动")。
- ⚠ **Nuxt 有构建锁**:同目录并发 `nuxt build` 会直接失败并报
  `Another Nuxt build is already running (PID ...)` —— 看到它先 `ps -p <PID>` 查进程,**不要重试**。
- ⚠ **部署前给旧镜像打回滚 tag**(否则旧镜像被新镜像顶掉后**无法秒回**,只能回退源码重建):

  ```bash
  docker tag ubuntu-aiblog-web:latest ubuntu-aiblog-web:rollback-$(date +%Y%m%d%H%M)
  ```

- **回滚**:① 镜像回切 —— `docker tag <rollback-tag> ubuntu-aiblog-web:latest && docker compose up -d --no-deps aiblog-web`;
  ② 无 tag 时 —— `git stash -u`(或 `git checkout`)回退源码后**重新 build(约 5 分钟)**;
  ③ 只关品牌侧(软回退,无需改码)—— `NUXT_PUBLIC_AUTH_BRAND_PANEL=false`。
  数据层**无需回滚**:部署只换应用镜像,无 DB 迁移。
- **站点品牌/白标环境变量**:`NUXT_PUBLIC_SITE_NAME` / `_TAGLINE` / `_DESCRIPTION` / `_BRAND_COLOR` /
  `_LOGO_URL` / `_FAVICON_URL` / `_FOOTER_TEXT` / `_COPYRIGHT` / `_ICP`。
  ⚠ 生效优先级为**后端 `site_settings`(DB) > `.env`** —— 后台已配过的项,改 `.env` **不生效**。
- **登录页开关**:`NUXT_PUBLIC_AUTH_BRAND_PANEL`(默认 `true`)、`NUXT_PUBLIC_AUTH_FORGOT_URL`(默认空=不渲染)、
  `NUXT_PUBLIC_AUTH_CAPTCHA_ENABLED`(默认 `false`)。
- 该实例**对外可访问**(nginx access.log 有真实外网流量)⇒ 重建期间存在秒级不可用窗口;
  需零停机应上双实例 + 反向代理切换。

## 已知坑与现状

- **`.output/` 是构建产物目录**(不是 `dist/`);宿主的 `.output` 只用于本地预览,权威构建在 Docker builder 阶段。
- 部署日志里 `error-404.css` / `error-500.mjs` 是**产物文件名**,`Some chunks are larger than 500 kB` 是 Rollup 建议 ——
  **都不是错误**。判真错看 `ERROR` / `FATAL` / `Command failed`。
- `GET /tbk/detail/*` 返回 404 并伴随 Vue Router 警告 —— 这是**已移除的企业官网遗留链接**
  (外部搜索引擎/旧书签仍在访问),**与代码改动无关**。要消除需加 `/tbk/*` → 301 跳首页规则。
- **未跟踪(历史上一直未入库,提交时按需处理)**:`content/`、`publish-log.md`、`docs/home-design-redesign/`。
- 后端为独立项目 **`aiblog-java`**(不在本仓库);前端依赖的端点清单见 `README.md`「后端 API 依赖」段。
