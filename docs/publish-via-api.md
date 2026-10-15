# 用接口发布文章（agent / 脚本）

两条路：**API Key（推荐，长期有效）** 或 **账号密码换 JWT（24 小时过期）**。

## 1. 签发 API Key（仅管理员）

接口：`POST /api/admin/api-keys`，需要管理员登录态。

```bash
# 1) 登录拿 JWT（24h）
TOKEN=$(curl -s -XPOST localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"<密码>"}' | jq -r .data.accessToken)

# 2) 签发长期令牌（不传 expiresInDays 即长期有效）
curl -s -XPOST localhost:8080/api/admin/api-keys \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"moss agent 发布文章"}' | jq
```

返回里的 `data.key`（`ak_xxxxxxxx…`）**只返回这一次**，库里只存 SHA-256 哈希。

其他管理接口：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/admin/api-keys` | 列表（不含明文，带 `lastUsedAt`） |
| POST | `/api/admin/api-keys` | 签发（`name`、可选 `expiresInDays`、`userId`） |
| DELETE | `/api/admin/api-keys/{id}` | 吊销（软删 + 停用） |

## 2. 用脚本发布（推荐）

```bash
export AIBLOG_API_KEY=ak_xxxxxxxxxxxxxxxx
node scripts/publish-article.mjs content/posts/agent-article.md
```

markdown 的 front-matter 支持 `title` / `category` / `tags` / `status` / `cover` / `excerpt`：

```markdown
---
title: "Agent 工具设计：让模型少犯错的七个决定"
category: 技术
tags: [AI Agent, 工程实践]
status: draft
---

# 正文用 Markdown 写
```

常用参数：

| 参数 | 说明 |
| --- | --- |
| `--status draft|published|archived` | 默认 `draft`（先存草稿，人工点发布更安全） |
| `--category 技术` | 分类，可写名称或 ID（front-matter 里写也行） |
| `--tags AI,工程实践` | 标签，缺的自动创建（`--no-create-tags` 可关掉） |
| `--cover <url>` | 封面图 URL（图片先传 `POST /api/files/upload`） |
| `--dry-run` | 只打印将提交的内容 |
| `--force` | 标题已存在时也新建（默认跳过，方便重复跑） |

传目录即可批量：`node scripts/publish-article.mjs content/posts --status draft`

## 3. 直接 curl 发布

```bash
curl -s -XPOST localhost:8080/api/articles \
  -H "X-API-Key: $AIBLOG_API_KEY" -H 'Content-Type: application/json' \
  -d '{
    "title": "标题",
    "content": "# Markdown 正文",
    "excerpt": "摘要",
    "status": "draft",
    "categoryId": 1,
    "tagIds": [6, 7]
  }'
```

## 4. 安全说明

- 令牌权限 = 所属用户的角色（默认归属签发人，admin 令牌权限最大）；`scopes` 字段已预留细分
- 支持三种写法：`X-API-Key: ak_…`、`Authorization: ApiKey ak_…`、`Authorization: Bearer <JWT>`
- 令牌无效 / 已过期 / 已停用时返回 **401**，并附 `{"code":401,"message":"API Key 无效、已停用或已过期"}`
- 每次使用会更新 `lastUsedAt`（最多每分钟写一次库），便于在列表里发现异常使用
- 怀疑泄露：`DELETE /api/admin/api-keys/{id}` 立即吊销

