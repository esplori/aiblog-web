# AI 广场（AI Community）设计

> 状态：**草案待评审**（2026-10-15）
> 目标仓库：前端 `aiblog-web`（`/home/ubuntu/aiblog-web`）+ 后端 `aiblog-java`（`/home/ubuntu/aiblog-java`）
> 相关：`docs/ai-features-proposal.md`（AI 辅助写作/推荐等，**本文档不回退也不覆盖它**，两者并行）

---

## 0. 一句话

在现有博客之外加一个**结构化的 AI 资源目录 + 社区**：skill / MCP / prompt / 模型 / 工具以「卡片」形式收录，用户可投票、写实测报告、收藏成清单，并一键导出可用的安装配置。

**核心论点：这不是「首页加一个板块」，而是一个新的一级栏目。**
skill/MCP 的信息结构是**目录型**的（安装方式、平台、兼容版本、权限风险），塞进文章正文会失去可检索、可比较、可排行这三种能力。

---

## 1. 定位与边界

### 1.1 建议默认决策（boss 未拍板的两点，先按此设计，改动成本低）

| 议题 | 建议 | 理由 |
| --- | --- | --- |
| 定位 | **P0–P1 走「编辑精选」**（仅管理员录入），P2 打开 UGC 提交 | 冷启动质量可控、无需一开始就做审核风控；表结构预留 `submitter_id` / `status` 不返工 |
| 收录范围 | **5 类统一建模**：`skill` / `mcp` / `prompt` / `model` / `tool` | 五者字段重合度 >80%（名称/仓库/安装/平台/许可）；分表会有 5 套重复 CRUD |
| 名字 | 前台名 **「AI 广场」**，路由 `/ai` | 名字后续走站点配置（见 §7.1），不写死 |
| 与博客关系 | **并列栏目**，不是博客的子类 | 首页只放一条入口条（§5.3），不改变现有首页主体 |

### 1.2 明确不做（本期）

- 不代管代码/不镜像仓库 —— 只存 URL 与安装片段，避免版权与安全责任
- 不做在线执行、不做 MCP 沙箱托管
- 不做付费/打赏/交易
- 不动现有 `comments` / `articles` 表结构（**新增表而非改造**，零迁移风险）

---

## 2. 信息架构

### 2.1 前台路由（`app/pages/ai/`）

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `/ai` | 广场首页 | 类型 Tab + 筛选 + 卡片网格 + 右侧「本周热门」 |
| `/ai/[slug]` | 条目详情 | 卡片主信息 + 平台兼容矩阵 + 实测报告 + 评论 |
| `/ai/collections` | 清单广场 | 用户/编辑的合集（「我的 AI 工作流」） |
| `/ai/collections/[slug]` | 清单详情 | 条目列表 + 一键导出整包 |
| `/ai/submit` | 提交条目 | P2 才挂到前台导航；P1 仅管理员走后台 |

导航位置：与「文章」同级，插入前台顶部导航；移动端折叠进抽屉。

### 2.2 后台路由（`app/pages/admin/`）

| 路由 | 说明 |
| --- | --- |
| `/admin/ai-items` | 条目 CRUD + 发布/下架/置顶（沿用 Element Plus 表格 + 弹窗模式，参照 `admin/tags.vue`） |
| `/admin/ai-items/reports` | 实测报告审核（列表 + 通过/驳回） |
| `/admin/ai-collections` | 清单管理（P2） |

菜单：往 `menus` 表插一条 `{name:'AI 广场', path:'/admin/ai-items', icon:'ep:compass', sort_order:11}`，并在 `role_menus` 给 admin 角色授权。**菜单驱动权限**（见 `layouts/admin` 的 `isAllowed`），所以后台页权限零额外代码。

---

## 3. 数据模型

沿用现有约定：`id` 主键、`created_at`/`updated_at` 自动填充、**软删除 `deleted_at`（手动管理，非逻辑删除）**、枚举存 `VARCHAR`。

### 3.1 `ai_items`（条目主表）

```sql
CREATE TABLE IF NOT EXISTS ai_items (
    id               BIGSERIAL PRIMARY KEY,
    uuid             VARCHAR(64)  NOT NULL UNIQUE,   -- 前台友好 id，与 articles.uuid 同风格
    slug             VARCHAR(120) NOT NULL UNIQUE,   -- SEO 用，详情页 URL
    type             VARCHAR(20)  NOT NULL,          -- skill|mcp|prompt|model|tool
    name             VARCHAR(120) NOT NULL,
    tagline          VARCHAR(200),                   -- 一句话（卡片必填，列表页只显示它）
    description      TEXT,                           -- markdown 正文
    repo_url         VARCHAR(500),
    homepage_url     VARCHAR(500),
    install_snippet  TEXT,                           -- 一键复制的主安装命令/配置
    author_name      VARCHAR(120),                   -- 原作者/组织（非本站用户）
    license          VARCHAR(50),
    cover_image_url  VARCHAR(500),
    risk_flags       VARCHAR(50)  DEFAULT 'read',    -- 逗号分隔子集: read,write,net,exec
    status           VARCHAR(20)  DEFAULT 'pending', -- pending|published|rejected
    featured         BOOLEAN      DEFAULT FALSE,     -- 编辑推荐（首页入口条取它）
    star_count       INT          DEFAULT 0,         -- 投票数（冗余计数）
    report_count     INT          DEFAULT 0,         -- 实测报告数（冗余计数）
    view_count       INT          DEFAULT 0,
    submitter_id     BIGINT,                         -- NULL = 官方录入
    published_at     TIMESTAMP,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at       TIMESTAMP,
    FOREIGN KEY (submitter_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_ai_items_type_status ON ai_items (type, status);
CREATE INDEX IF NOT EXISTS idx_ai_items_hot ON ai_items (star_count DESC, report_count DESC);
```

> **冗余计数**沿用 `articles.like_count` / `tags.article_count` 的既有做法：写入时用 `UPDATE ... SET star_count = star_count + 1` 原子自增，投票表持唯一约束兜底。

### 3.2 `ai_item_targets`（平台/客户端兼容行）

一张条目可对应多个客户端，**这是与「文章」最大的结构差异**。

```sql
CREATE TABLE IF NOT EXISTS ai_item_targets (
    id              BIGSERIAL PRIMARY KEY,
    item_id         BIGINT NOT NULL,
    platform        VARCHAR(40) NOT NULL,  -- pi|claude-code|cursor|vscode|codex|gemini-cli|cline|windsurf
    transport       VARCHAR(20),           -- MCP 专用: stdio|sse|http
    install_command TEXT,                  -- 该平台下的安装命令（覆盖主 snippet）
    config_json     TEXT,                  -- 该平台可粘贴的配置片段
    min_version     VARCHAR(40),
    verified        BOOLEAN DEFAULT FALSE, -- 是否有实测通过的证据
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES ai_items(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_item_target ON ai_item_targets (item_id, platform, COALESCE(transport, ''));
```

### 3.3 `ai_item_votes`（投票）

```sql
CREATE TABLE IF NOT EXISTS ai_item_votes (
    id         BIGSERIAL PRIMARY KEY,
    item_id    BIGINT NOT NULL,
    user_id    BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES ai_items(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_vote ON ai_item_votes (item_id, user_id);
```

### 3.4 `ai_reports`（实测报告 —— 社区最值钱的部分）

```sql
CREATE TABLE IF NOT EXISTS ai_reports (
    id             BIGSERIAL PRIMARY KEY,
    item_id        BIGINT NOT NULL,
    user_id        BIGINT,
    platform       VARCHAR(40) NOT NULL,
    client_version VARCHAR(40),
    os             VARCHAR(40),
    result         VARCHAR(20) NOT NULL,   -- works|partial|fail
    content        TEXT NOT NULL,          -- 踩坑记录；正文用 markdown
    snippet        TEXT,                   -- 我实际跑通的配置（很有价值）
    status         VARCHAR(20) DEFAULT 'pending',  -- pending|published|rejected
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at     TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES ai_items(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_ai_reports_item ON ai_reports (item_id, status);
```

> 按 `(platform, client_version, result)` 聚合即得**兼容性矩阵**（§6.2），详情页直接渲染，无需额外表。

### 3.5 标签关联（复用现有 `tags`）

```sql
CREATE TABLE IF NOT EXISTS ai_item_tags (
    item_id BIGINT NOT NULL,
    tag_id  BIGINT NOT NULL,
    PRIMARY KEY (item_id, tag_id),
    FOREIGN KEY (item_id) REFERENCES ai_items(id),
    FOREIGN KEY (tag_id)  REFERENCES tags(id)
);
```

> 复用 `tags` 是为了让「标签」概念全站统一（筛选/SEO 同一套）。**代价**：`tags.article_count` 语义被污染，新增 `usage_count` 由两个关联表共同维护，或干脆列表页改为实时 `COUNT(*)`（数据量小，推荐后者）。

### 3.6 评论 —— 新增 `ai_item_comments`，**不动 `comments` 表**

`comments.article_id` 是 `NOT NULL` + 外键 `REFERENCES articles(id)`，改成多态 target 需要迁移 + 回填，风险不划算。新表字段与 `comments` 对齐（`parent_id` 多级回复、`status` 审核、`like_count`、匿名 nickname/email/website/ip/user_agent），便于后续抽公共组件。

### 3.7 清单（P2）

`ai_collections`（`id, uuid, slug, title, description, cover_image_url, owner_id, is_public, item_count, created_at, updated_at, deleted_at`）
+ `ai_collection_items`（`collection_id, item_id, sort_order, note`，主键 `(collection_id, item_id)`）。

### 3.8 迁移方式

本项目**没有 Flyway/Liquibase**（`pom.xml` 无依赖，手动执行 SQL）。按既有做法落三个文件并保持幂等（`IF NOT EXISTS`）：

1. `aiblog-java/src/main/resources/db/migration/V20261015__ai_community.sql`（新表，主）
2. 同步 `aiblog-java/src/main/resources/schema.sql`（全新建库时生效）
3. 同步 `aiblog-java/docker/initdb/01-schema.sql` + `02-init-data.sql`（菜单 + role_menus 授权）

---

## 4. 后端 API 清单

统一返回 `Result<T>`（`code/message/data`）；分页返回 `PageResult`（`records/total/current/size`）；Swagger 注解 `@Tag`/`@Operation` 与现有 `TagController` 同风格；写操作 `@PreAuthorize`。

### 4.1 前台（`AiItemController` → `/api/ai`）

| 方法 | 路径 | 说明 | 鉴权 |
| --- | --- | --- | --- |
| GET | `/api/ai/items` | 列表。参数 `type/tagId/platform/keyword/sort(hot\|new\|stars)/page/size`，只返回 `published` | 否 |
| GET | `/api/ai/items/{slug}` | 详情（含 targets + tags + 兼容矩阵摘要） | 否 |
| GET | `/api/ai/items/{slug}/reports` | 实测报告分页 | 否 |
| GET | `/api/ai/hot` | 热门条目（首页入口条用，`size` 默认 6） | 否 |
| GET | `/api/ai/stats` | 各类型数量、平台分布（广场首屏数字条） | 否 |
| POST | `/api/ai/items/{id}/vote` | 投票（幂等，重复返回已投） | 登录 |
| DELETE | `/api/ai/items/{id}/vote` | 取消投票 | 登录 |
| POST | `/api/ai/items/{id}/reports` | 提交实测报告（进 `pending`） | 登录 |
| GET | `/api/ai/collections` / `/{slug}` | 清单（P2） | 否 |
| POST | `/api/ai/collections` | 创建清单（P2） | 登录 |

### 4.2 管理端（`AdminAiController` → `/api/admin/ai`）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/admin/ai/items` | 后台列表（含 pending/rejected，返回提交人与审核态） |
| POST | `/api/admin/ai/items` | 新建（含 targets 嵌套提交） |
| PUT | `/api/admin/ai/items/{id}` | 更新 |
| POST | `/api/admin/ai/items/{id}/status` | 发布/下架/驳回（带理由） |
| POST | `/api/admin/ai/items/{id}/featured` | 置顶/取消编辑推荐 |
| DELETE | `/api/admin/ai/items/{id}` | 软删除 |
| GET | `/api/admin/ai/reports` | 报告列表/审核（`pending` 优先） |

### 4.3 需要动的既有代码

- `AiItem` / `AiItemTarget` / `AiItemVote` / `AiReport` / `AiItemTag` 实体 + Mapper + Service/Impl + DTO（`dto/request` + `dto/response`），照 `Tag` 三件套抄
- Security 配置放行 `GET /api/ai/**`（对照现有 `/api/articles`、`/api/tags` 的白名单做法）
- Redis/Spring Cache：`/api/ai/hot`、`/api/ai/stats` 加 `@Cacheable`，TTL 5–10 分钟；写操作 `@CacheEvict`

---

## 5. 前端设计

### 5.1 目录结构

```
app/pages/ai/index.vue                 # 广场
app/pages/ai/[slug].vue                # 详情（SSR + useSeoMeta）
app/pages/ai/collections/index.vue     # P2
app/pages/ai/collections/[slug].vue    # P2
app/components/ai/ItemCard.vue         # 卡片（列表/清单/文章内嵌共用）
app/components/ai/ItemGrid.vue
app/components/ai/TypeTabs.vue
app/components/ai/ItemFilters.vue      # 平台/标签/排序
app/components/ai/RiskBadge.vue        # 权限风险标签
app/components/ai/InstallBlock.vue     # 代码块 + 一键复制
app/components/ai/CompatMatrix.vue     # 兼容性矩阵
app/components/ai/ReportList.vue / ReportForm.vue
app/components/ai/VoteButton.vue
app/components/ai/ExportDialog.vue     # 勾选 → 导出配置
app/types/ai.ts                        # AiItem / AiItemTarget / AiReport / AiCollection
```

### 5.2 实现约定（对齐 `aiblog-web/AGENTS.md`）

- **全部颜色走 `brand-*` 色阶**（只有 11 档，别写 `brand-950`）；站名/标语一律 `useSiteConfig()`
- 请求统一 `useApi()`；列表/详情用 `useAsyncData` **走 SSR**（SEO 是广场的主要收益之一）
- 组件用标准 `props` + `emits` 实现 `v-model`（`nuxt.config.ts` **禁用了 `defineModel`**）
- 版式复用首页既有的 `container` + 三栏栅格（`lg:grid-cols-[190px_minmax(0,1fr)]` / `xl:..._264px`），视觉不另起一套
- 后台页抄 `app/pages/admin/tags.vue`（表格 + 弹窗 + `ElMessage` 反馈）

### 5.3 首页接入（**轻量，不改首页主体**）

在 `app/components/blog/BlogHome.vue` 的 Hero 与「精选文章」之间插一条 `<AiPlazaStrip>`：

- 左：标题「AI 广场」+ 一句说明 + 「查看全部 →」
- 右：6 张迷你卡片（`GET /api/ai/hot`，SSR 取数，失败则整条不渲染，**不能拖垮首页**）

---

## 6. 关键机制（差异化所在）

### 6.1 权限风险标签 —— 建议的招牌功能

MCP server 会在本地执行命令。卡片右上角强制标四档：`read`（只读）/ `write`（可改文件）/ `net`（联网）/ `exec`（执行命令）。
设计要点：**`exec` 级条目详情页顶部常驻醒目提示 + 免责声明**；这是同类目录站普遍缺失的信息，可作为对外宣传点。

### 6.2 兼容性矩阵

`ai_reports` 按 `(platform, client_version, result)` 聚合渲染成表：行=平台/版本，列=works/partial/fail。
价值：MCP 在不同客户端/版本表现差异极大，「有没有人在我这个版本上跑通过」是用户真正的决策依据。

### 6.3 一键导出配置（**前端即可，零后端成本**）

勾选若干条目 → 前端拼装：
- MCP：生成 `{"mcpServers": {...}}` 片段（取 `ai_item_targets.config_json`，按目标客户端模板合并）
- skill：生成安装命令清单（`.sh` / `.ps1` 两种）

`ExportDialog` 里 `navigator.clipboard` 复制 + 「下载 .json」兜底。

### 6.4 文章内嵌条目卡片（P2）

在 `app/utils/markdown.ts` 给 markdown-it 加一条 inline 规则，支持正文写 `[[ai:slug]]` → 渲染成占位元素，由页面客户端注入 `ItemCard`。
⚠ 注意：MarkdownIt 在 utils 下且是纯逻辑，**不要在那里写 Tailwind 类名**（`content` globs 不含 `app/utils/**`）；类名写在 `ItemCard` 组件里。

### 6.5 热度算法

```
score = star_count * 3 + report_count * 5 + min(view_count, 500) * 0.1   // 再乘时间衰减
decay = 1 / (1 + days_since_published / 14)
```
P1 先用 SQL `ORDER BY star_count DESC` 简化实现；P2 换成时间窗（周榜 = 近 7 天新增投票/报告）。

---

## 7. 与现有工程约定的一致性

### 7.1 白标（多客户克隆）

「AI 广场」名称、是否启用该栏目、默认排序建议都进 `site_settings`（新增 `ai_plaza_enabled` / `ai_plaza_name` 两列）+ 对应 `NUXT_PUBLIC_*` 环境变量兜底，优先级仍是 **DB > .env**。
否则 `scripts/clone-instance.sh` 克隆出的客户实例会带着「AI 广场」名字。

### 7.2 SEO

- 列表页分页要正确 `canonical`，避免 `?page=` 重复内容
- 详情页 `useSeoMeta` 用 `tagline` 做 description；`slug` 唯一
- 每个条目 = 一个长尾落地页，是加这个模块最主要的非功能收益

### 7.3 部署

- 前端：`cd /home/ubuntu && docker compose up -d --build --no-deps aiblog-web`（约 5 分钟，**后台跑 + 轮询**；先给旧镜像打 `rollback-*` tag）
- 后端：**需要重建 `aiblog-java` 镜像**（不能只用 `--no-deps aiblog-web`），且改库表 ⇒ 本次**不是零迁移部署**，先备份 PG（`scripts/backup-pg-remote.sh` 已有）
- 提交前本地门禁：`pnpm test` + `pnpm test:node` + `pnpm build`；提交信息 `feat(ai-plaza): 中文描述`，单 `master` 分支直推 + 回读远端

---

## 8. 分期落地

| 期 | 内容 | 预估 | 交付判据 |
| --- | --- | --- | --- |
| **P0** | 7 张表迁移 + 实体/Mapper/Service + 后台条目 CRUD + 前台 `/ai` 列表与详情（只读）+ 首页入口条 | 5–7 人日 | 能录入 30 条种子数据并浏览 |
| **P1** | 投票 + 实测报告（提交/审核）+ 评论 + 筛选搜索 + 热门/统计缓存 | 5–7 人日 | 用户可交互，后台可审核 |
| **P2** | 清单、排行榜/周榜、导出配置、文章内嵌 `[[ai:slug]]`、兼容性矩阵可视化、UGC 提交开放 | 7–10 人日 | 社区自转 |

**冷启动**：P0 上线前由 boss 先人工挑选 **30–50 条种子**（含 pi 自己的 skill 与你常用的 MCP），空目录没人会来第二次。

---

## 9. 风险与待决

| # | 风险/待决 | 应对 |
| --- | --- | --- |
| 1 | **空目录冷启动** | 先备 30–50 条种子；首页入口条在条目 < 6 条时隐藏 |
| 2 | 刷票 | 需登录 + `(item_id,user_id)` 唯一 + 注册开放度限制；后台可看异常投票 |
| 3 | 外链安全 | 只存 URL/片段；`exec` 级加免责声明；外链 `rel="noopener nofollow"` |
| 4 | 内容质量（P2 UGC） | 先审后发（`pending`），复用后台权限体系 |
| 5 | 标签计数语义 | 列表页改用实时 `COUNT(*)`，不维护 `tags.article_count` 之外的计数 |
| 6 | 部署非零迁移 | 上线前 PG 备份；表全部 `IF NOT EXISTS`，可重复执行 |
| 7 | **待 boss 拍板** | ① 精选 vs UGC ② 名字/范围 ③ P2 的清单是否要公开分享 |

---

## 10. 下一步（等你点头）

1. 拍板 §1.1 与 §9-7
2. 我出 **P0 的详细接口契约**（字段级 request/response + Mock 数据）
3. 再动代码：先建库表与后端只读接口，前端随后

