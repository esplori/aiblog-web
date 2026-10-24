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
  /**
   * 整个模块需要登录才出现（如「股票」：数据按用户隔离，未登录进去也是一片空）。
   * 与 item.auth 的区别：那只是隐藏单个入口，这里连模块标题/图标一起收起来。
   */
  auth?: boolean
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
          { key: 'admin', label: '后台首页', path: '/admin', icon: 'chart', auth: true },
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
          { key: 'tool', label: '工具', path: '/ai', type: 'tool', icon: 'wrench', badge: 'ai.tool' },
          { key: 'ai-admin', label: '条目录入', path: '/admin/ai-items', icon: 'upload', auth: true },
        ],
      },
    ],
  },
  {
    key: 'assistant',
    label: 'AI 对话',
    hint: '和工作台助手聊天',
    home: '/chat',
    icon: 'chat',
    // 聊天记录按人隔离，未登录进去也是一片空
    auth: true,
    groups: [
      {
        key: 'chat',
        label: '对话',
        items: [
          { key: 'chat', label: '开始对话', path: '/chat', icon: 'chat', auth: true },
        ],
      },
    ],
  },
  {
    key: 'finance',
    label: '股票',
    hint: '持仓 / 盈亏',
    home: '/finance',
    icon: 'chart',
    auth: true,
    groups: [
      {
        key: 'portfolio',
        label: '持仓',
        items: [
          { key: 'positions', label: '我的持仓', path: '/finance', icon: 'chart', auth: true },
        ],
      },
    ],
  },
  {
    key: 'interview',
    label: '刷题',
    hint: '题库 / 公司 / 面经',
    home: '/interview',
    icon: 'notebook',
    groups: [
      {
        key: 'practice',
        label: '练习',
        items: [
          { key: 'topics', label: '主题刷题', path: '/interview/topics', icon: 'target' },
          { key: 'questions', label: '题库', path: '/interview', icon: 'notebook', badge: 'interview.total' },
          { key: 'mock', label: '模拟考试', path: '/interview/exams', icon: 'mic', auth: true },
          { key: 'iq-admin', label: '题目录入', path: '/admin/interview-questions', icon: 'upload', auth: true },
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
  if (path === '/finance' || path.startsWith('/finance/')) {
    return MODULES.find(m => m.key === 'finance') as NavModule
  }
  if (path === '/chat' || path.startsWith('/chat/')) {
    return MODULES.find(m => m.key === 'assistant') as NavModule
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
  if (path.startsWith('/admin/interview-questions')) return 'iq-admin'
  if (path.startsWith('/admin/interview-companies')) return 'ic-admin'
  // ⚠ 刷题模块必须「先具体、后兜底」：题库本身的 path 就是 /interview，
  //    一旦先用 startsWith('/interview') 兜底，/interview/topics、/interview/exams
  //    等子项会全部被误判成「题库」（历史 bug：点任何子菜单都高亮题库）。
  if (path === '/interview/topics' || path.startsWith('/interview/topics/')) return 'topics'
  if (path.startsWith('/interview/exams') || path.startsWith('/interview/mock')) return 'mock'
  if (path === '/interview' || path.startsWith('/interview/')) return 'questions'
  if (path.startsWith('/articles')) return 'articles'
  if (path.startsWith('/admin/site-settings')) return 'settings'
  if (path.startsWith('/admin/articles')) return 'write'
  if (path.startsWith('/admin')) return 'admin'
  return ''
}

