/**
 * 工作台侧边栏导航（纯数据，不含样式类名）。
 * app/utils/** 不参与 Tailwind content 扫描，所以这里只放结构。
 */

export interface NavItem {
  key: string
  label: string
  /** 路由路径 */
  path: string
  /** 对应的 query.type（AI 广场按类型分项） */
  type?: string
  icon: string
  /** 需要登录才展示 */
  auth?: boolean
  /** 数字徽章的取数键（articles / ai.total / ai.mcp ...） */
  badge?: string
}

export interface NavGroup {
  key: string
  label?: string
  items: NavItem[]
}

export interface NavModule {
  key: string
  label: string
  hint: string
  home: string
  /** 折叠态模块图标（AppIcon 的 name） */
  icon?: string
  groups: NavGroup[]
}

export const MODULES: NavModule[] = [
  {
    key: 'blog',
    label: '博客',
    hint: '内容与文章',
    home: '/',
    icon: 'doc',
    groups: [
      {
        key: 'content',
        label: '内容',
        items: [
          { key: 'home', label: '首页', path: '/', icon: 'grid' },
          { key: 'articles', label: '全部文章', path: '/articles', icon: 'doc', badge: 'articles' },
          { key: 'write', label: '写文章', path: '/admin/articles', icon: 'plus', auth: true },
        ],
      },
      {
        key: 'system',
        label: '站点',
        items: [
          { key: 'admin', label: '后台首页', path: '/admin', icon: 'chart', auth: true },
          { key: 'settings', label: '站点设置', path: '/admin/site-settings', icon: 'settings', auth: true },
        ],
      },
    ],
  },
  {
    key: 'ai',
    label: 'AI 广场',
    hint: 'Skill / MCP / 提示词',
    home: '/ai',
    icon: 'spark',
    groups: [
      {
        key: 'plaza',
        label: '资源',
        items: [
          { key: 'plaza', label: '全部条目', path: '/ai', icon: 'spark', badge: 'ai.total' },
          { key: 'mcp', label: 'MCP 服务', path: '/ai', type: 'mcp', icon: 'plug', badge: 'ai.mcp' },
          { key: 'skill', label: 'Skill', path: '/ai', type: 'skill', icon: 'check', badge: 'ai.skill' },
          { key: 'prompt', label: '提示词', path: '/ai', type: 'prompt', icon: 'chat', badge: 'ai.prompt' },
          { key: 'model', label: '模型', path: '/ai', type: 'model', icon: 'cube', badge: 'ai.model' },
          { key: 'tool', label: '工具', path: '/ai', type: 'tool', icon: 'wrench', badge: 'ai.tool' },
        ],
      },
      {
        key: 'manage',
        label: '管理',
        items: [
          { key: 'ai-admin', label: '条目录入', path: '/admin/ai-items', icon: 'upload', auth: true },
        ],
      },
    ],
  },
  {
    key: 'interview',
    label: '面试',
    hint: '题库 / 公司 / 面经',
    home: '/interview',
    icon: 'notebook',
    groups: [
      {
        key: 'prepare',
        label: '备战',
        items: [
          { key: 'plan', label: '备战台', path: '/interview/plan', icon: 'target', auth: true },
          { key: 'mock', label: '模拟面试', path: '/interview/mock', icon: 'mic', auth: true },
          { key: 'review', label: '今日复习', path: '/interview/review', icon: 'clock', auth: true },
          { key: 'applications', label: '投递看板', path: '/interview/applications', icon: 'briefcase', auth: true },
        ],
      },
      {
        key: 'practice',
        label: '练习',
        items: [
          { key: 'questions', label: '题库', path: '/interview', icon: 'notebook', badge: 'interview.total' },
          { key: 'companies', label: '公司库', path: '/interview/companies', icon: 'building' },
        ],
      },
      {
        key: 'manage',
        label: '管理',
        items: [
          { key: 'iq-admin', label: '题目录入', path: '/admin/interview-questions', icon: 'upload', auth: true },
          { key: 'ic-admin', label: '公司维护', path: '/admin/interview-companies', icon: 'building', auth: true },
        ],
      },
    ],
  },
]

/** 按路径判断当前属于哪个模块（用于高亮模块切换器） */
export const resolveModule = (path: string): NavModule => {
  if (path === '/ai' || path.startsWith('/ai/')) {
    return MODULES.find(m => m.key === 'ai') as NavModule
  }
  if (path.startsWith('/admin/ai-items')) {
    return MODULES.find(m => m.key === 'ai') as NavModule
  }
  if (path === '/interview' || path.startsWith('/interview/')) {
    return MODULES.find(m => m.key === 'interview') as NavModule
  }
  if (path.startsWith('/admin/interview')) {
    return MODULES.find(m => m.key === 'interview') as NavModule
  }
  return MODULES[0]
}

/** 当前高亮的二级项 */
export const resolveActive = (path: string, type?: string): string => {
  if (path === '/') return 'home'
  if (path.startsWith('/ai/')) return 'plaza'
  if (path === '/ai') return type ? type : 'plaza'
  if (path.startsWith('/admin/ai-items')) return 'ai-admin'
  // ⚠ 必须放在更宽泛的 /interview 判断之前，否则会被题库兜底命中
  if (path.startsWith('/interview/mock')) return 'mock'
  if (path.startsWith('/interview/plan')) return 'plan'
  if (path.startsWith('/interview/review')) return 'review'
  if (path.startsWith('/interview/applications')) return 'applications'
  if (path.startsWith('/interview/companies')) return 'companies'
  if (path.startsWith('/interview')) return 'questions'
  if (path.startsWith('/admin/interview-questions')) return 'iq-admin'
  if (path.startsWith('/admin/interview-companies')) return 'ic-admin'
  if (path.startsWith('/articles')) return 'articles'
  if (path.startsWith('/admin/site-settings')) return 'settings'
  if (path.startsWith('/admin/articles')) return 'write'
  if (path.startsWith('/admin')) return 'admin'
  return ''
}

