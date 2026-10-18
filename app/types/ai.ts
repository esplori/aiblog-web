/** AI 广场：条目类型与风险档位 */

export type AiType = 'skill' | 'mcp' | 'prompt' | 'model' | 'tool'

export interface AiTarget {
  platform: string
  transport?: string | null
  installCommand?: string | null
  configJson?: string | null
  minVersion?: string | null
  verified?: boolean | null
}

export interface AiItem {
  id: number
  uuid: string
  slug: string
  type: AiType | string
  name: string
  tagline?: string | null
  description?: string | null
  repoUrl?: string | null
  homepageUrl?: string | null
  installSnippet?: string | null
  authorName?: string | null
  license?: string | null
  coverImageUrl?: string | null
  riskFlags?: string | null
  risks: string[]
  status: string
  featured?: boolean
  starCount: number
  reportCount: number
  viewCount: number
  tags: string[]
  targets: AiTarget[]
  publishedAt?: string | null
  createdAt: string
  updatedAt?: string
}

export interface AiStats {
  total: number
  byType: Record<string, number>
  byPlatform: Record<string, number>
  platforms: string[]
}

export const TYPE_LABEL: Record<string, string> = {
  skill: 'Skill',
  mcp: 'MCP',
  prompt: '提示词',
  model: '模型',
  tool: '工具',
}

export const TYPE_ORDER: AiType[] = ['skill', 'mcp', 'prompt', 'tool']

export const RISK_LABEL: Record<string, string> = {
  read: '只读',
  write: '可写',
  net: '联网',
  exec: '执行',
}

export const RISK_HINT: Record<string, string> = {
  read: '只读取上下文，不改动任何东西',
  write: '可以创建或修改文件、数据',
  net: '会发起网络请求，注意数据外发',
  exec: '可以在你机器上执行命令，风险最高',
}

export const STATUS_LABEL: Record<string, string> = {
  pending: '待审核',
  published: '已发布',
  rejected: '已驳回',
}

