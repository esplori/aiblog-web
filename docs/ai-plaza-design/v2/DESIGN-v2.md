# 工作台版（v2）· 设计说明

> 状态：**待 boss 确认**（2026-10-15）
> 入口：`docs/ai-plaza-design/v2/index.html`｜v1（内容站版）：上一级 `docs/ai-plaza-design/index.html`
> 需求原文：首页做成工作台；左边侧边栏、右边功能区；博客算一个模块，再加一个 AI 模块；参考当前网络的最新网页规范与布局

---

## 1. 一句话

把首页从**内容流**改成**应用外壳**：左侧模块栏负责「去哪儿」，右侧功能区负责「干什么」。外壳只有一套，模块可以增删——博客和 AI 广场是同一层级的两个模块。

---

## 2. 与 v1 的差异

| 维度 | v1（内容站） | v2（工作台） |
| --- | --- | --- |
| 首页性质 | 给访客/搜索引擎看的内容页 | 给自己/常来的人用的任务起点 |
| 导航 | 顶部横向导航（首页 / 文章 / AI 广场） | 左侧模块栏（一级模块 + 模块内二级） |
| 首页主体 | Hero 大卡 + 2×2 精选网格 | Bento 功能区（继续阅读 / KPI / 待办 / 热门条目 / 快捷动作） |
| 卡片圆角 | 16px | 12px（控件 8/6），元素更密 |
| 阴影 | 卡片常驻阴影 | 卡片不用阴影，只保留 1px 边框；阴影只给浮层 |
| 主题 | 仅浅色 | 浅/深双套令牌（`data-theme="dark"`） |
| 交互基线 | 无明确规范 | WCAG 2.2 + ARIA APG + container queries + INP |
| 保留不动 | — | 品牌体系、内容页 SSR 版式、5 类条目与 4 档风险、兼容性矩阵、后台权限 |

---

## 3. 信息架构与路由

```
/                      → 工作台首页（未登录/无权限时降级为公开落地页，见 §6）
/articles              → 文章列表（SSR，保留）
/post/[uuid]           → 文章详情（SSR，保留）
/ai                    → AI 广场（模块首页）
/ai/[slug]             → 条目详情
/ai/collections        → 清单
/ai/submit             → 提交条目
/admin/*               → 后台（沿用现有）
```

侧边栏结构（模块 → 模块内）：

| 一级模块 | 二级项 |
| --- | --- |
| 博客 | 工作台 / 全部文章 / 分类 / 标签 / 我的收藏 |
| AI 广场 | 广场 / 清单 / 我的提交 / 排行榜 |

> 侧边栏第二段「筛选（当前模块）」是 v2 的一个小设计：**模块相关的快捷筛选跟着模块变**，不挤进功能区顶部。

---

## 4. 外壳规格

| 项 | 值 |
| --- | --- |
| 侧边栏 | 展开 240px / 折叠 64px；`position: sticky; height: 100vh`；`< 1024px` 自动进入折叠态 |
| 顶栏 | 56px，`sticky`，半透明 + 背景模糊（`backdrop-filter`）；含面包屑、⌘K 搜索、新建、通知 |
| 功能区 | 内边距 24px，内容最大 1240px 居中 |
| 栅格 | 6 列 Bento（`span 2/3/4/6`），间距 16px |
| 内部自适应 | 用 `@container content` 判断**内容区自身宽度**（1080 / 720 两档），不看视口 |
| 移动端 | `< 1024px` 侧边栏 → 抽屉；`< 720px` 出现底部 Tab（4 项上限） |

**为什么用容器查询**：内容区可用宽度 = 窗口宽度 − 侧边栏状态（展开/折叠）。媒体查询只看窗口，会在「窗口宽但侧边栏展开」时给出错误的换行。

---

## 5. 模块契约（新增一个模块要做什么）

v2 的价值在于「加模块很便宜」。一个模块 = 4 件事：

1. 在侧边栏加一组 `lbl + item`（模块名 + 二级项，不需要改外壳代码）
2. 提供模块首页路由（挂进功能区，自动获得顶栏、搜索、通知）
3. 声明模块内的筛选段（可选，渲染在侧边栏第三段或功能区顶部 chips）
4. 在后台注册对应的管理入口（沿用菜单驱动权限）

博客模块满足这 4 条；AI 广场模块也满足。将来加「资源库 / 数据看板 / 客户实例」不需要动外壳。

---

## 6. SEO 与访客路径（**本稿最需要你拍板的一点**）

工作台式首页有一个真实代价：**陌生访客与搜索引擎拿到的不再是内容页**。三种处理方式：

| 方案 | 做法 | 代价 |
| --- | --- | --- |
| **A（推荐）** | 首页保持工作台；`/articles` 与 `/post/xxx` 仍 SSR；未登录访客访问 `/` 时**重定向/降级**到公开的「博客首页」视图（同一路由，按登录态分流） | 两套首页视图要维护；需要明确 `/` 的 canonical 指向 |
| B | 工作台只在 `/workspace`；`/` 仍是内容首页 | 改动最小，但「首页做成工作台」的诉求没完全满足 |
| C | 首页就是工作台，访客直接看工作台 | 最简单，但对外呈现变成登录墙/空面板，SEO 与首访体验都受伤 |

其余 SEO 注意点（无论选哪个）：
- 文章与条目的 SSR 不能因为外壳改造而丢失；站内链接（`/articles` `/post/` `/ai/`）必须在服务端可爬
- 筛选/分页写进 query（`?type=mcp&platform=pi&page=2`），要有 `canonical` 与 `rel=prev/next` 处理，避免重复内容
- 工作台页面对未登录用户应输出可索引的摘要内容，而不是纯骨架

---

## 7. 逐屏说明

| 屏 | 要点 |
| --- | --- |
| 01 工作台首页 | 问候 + 概览句 → Bento：继续阅读（带进度）· 本周阅读（KPI + 迷你柱图）· 最新文章（行式）· AI 广场热门 · 待我处理 · 分类进度 · 快捷动作 |
| 02 AI 广场模块 | 类型分段（role=tablist）+ 筛选段（平台/风险/排序）+ 卡片网格（2 列）+ 模块内右栏（本周热门 / 最新实测 / 我的提交） |
| 03 阅读页 | 侧边栏多出「本文相关」段；正文 68ch、行高 1.95；右侧粘性目录 + 阅读设置；顶部 2px 进度条（sticky，不遮焦点） |
| 04 命令面板 | ⌘K 打开，分组（跳转 / 条目 / 动作），方向键选择、Enter 打开、Esc 关闭；右侧通知面板用锚点高亮触发按钮 |
| 05 移动端 | 底部 Tab 4 项（工作台 / 文章 / AI 广场 / 我的）+ 抽屉导航；模块内导航变横向 chips；触控目标 44px |
| 06 设计系统 | 双主题令牌、8pt 间距、字阶、侧边栏两态、焦点环、触控尺寸、规范对照清单、新旧对比 |

---

## 8. 实施映射

| 设计稿 | 落地位置 | 说明 |
| --- | --- | --- |
| 外壳 | `app/layouts/workbench.vue`（新增） | 侧边栏 + 顶栏 + `<slot>`；折叠态存 localStorage |
| 模块清单 | `app/utils/navModules.ts`（新增） | 纯数据（模块 → 二级项），**不含 Tailwind 类名**（该目录不被 content 扫描） |
| 工作台首页 | `app/pages/index.vue` 改造 | Bento 组件：`components/workbench/*` |
| AI 广场 | `app/pages/ai/*` | 沿用 `docs/ai-community-plan.md` 的接口，v1 的 `components/ai/*` 可复用 |
| 命令面板 | `app/components/workbench/CommandPalette.vue` | 客户端组件；数据源 = 导航 + 文章 + 条目 |
| 阅读页 | `app/pages/post/[uuid].vue` | 仅换外壳，正文版式不动 |
| 主题 | `app/assets/css/main.css` | 令牌分组：`--bg/--surface/--line/--ink-*` + `[data-theme="dark"]` 覆盖 |
| Tailwind | `tailwind.config.js` | 新增 `type.*` `risk.*` 语义色；圆角沿用现有 scale 不变 |

⚠ 既有约束（`aiblog-web/AGENTS.md`）：`defineModel` 与 `propsDestructure` 被禁用；`app/utils/**` 不参与 Tailwind 扫描；品牌/站名一律 `useSiteConfig()`；部署是「工作区即线上」，`docker compose up -d --build --no-deps aiblog-web`。

---

## 9. 参考规范（可点开核对）

| 规范 | 用在哪 |
| --- | --- |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | §2.5.8 触控 24px 下限、§2.4.11 焦点不被粘性顶栏遮挡、§1.4.3 对比度、§2.3.3 减弱动效 |
| [ARIA APG](https://www.w3.org/WAI/ARIA/apg/) | tabs（类型切换）、dialog + listbox（⌘K）、disclosure（侧边栏折叠）、aria-current |
| [MDN · Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) | 功能区按自身宽度换行 |
| [MDN · :has()](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) | 主题/状态驱动的样式，不倒挂 DOM |
| [MDN · color-mix()](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix) | 品牌色阶与暗色 tint（与现有 tailwind brand 色阶同源） |
| [MDN · prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) | 动效降级 |
| [web.dev · INP](https://web.dev/articles/inp) | 点击后必须有即时反馈（乐观更新 / 骨架屏） |

---

## 10. 分期

| 期 | 内容 |
| --- | --- |
| P0 | 外壳 + 导航模块数据 + 工作台首页 Bento（数据用现有接口） |
| P1 | AI 广场模块接入外壳；阅读页换外壳；移动端 Tab + 抽屉 |
| P2 | ⌘K 命令面板、暗色主题、通知面板、模块化筛选段 |

---

## 11. 待确认

1. **§6 的 A / B / C**：未登录访客的 `/` 怎么处理（推荐 A）
2. 侧边栏默认展开还是折叠？折叠态是否需要记忆到本地（默认记忆）
3. 暗色主题是否本期就做（令牌已备好，工作量主要在回归测试）
4. 现有 `BlogHome` 的三栏内容（分类 / 标签 / 最新）是否需要保留到工作台之外的公开首页视图

---

## 12. 变更记录

| 日期 | 变更 |
| --- | --- |
| 2026-10-15 | v2 首版：工作台外壳 + 6 屏 + 设计系统与规范对照 |

