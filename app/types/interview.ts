// 面试题库（Interview Hub）
export interface InterviewQuestion {
  id: number
  slug: string
  companyId?: number | null
  companyName?: string | null
  companySlug?: string | null
  position?: string | null
  round?: string | null
  difficulty?: number | null
  questionType: string
  title: string
  body: string
  answer?: string | null
  followUps?: string[]
  sourceUrl?: string | null
  askedYear?: number | null
  starCount: number
  viewCount: number
  status: string
  submitterId?: number | null
  publishedAt?: string | null
  createdAt?: string
  updatedAt?: string
  tags?: string[]
  markLevel?: string | null
}

export interface InterviewCompany {
  id: number
  slug: string
  name: string
  industry?: string | null
  scale?: string | null
  logoUrl?: string | null
  intro?: string | null
  questionCount?: number
  createdAt?: string
}

export interface InterviewStats {
  total: number
  companyCount: number
  byPosition: Record<string, number>
  byDifficulty: Record<string, number>
  positions: string[]
}

/** 题型（固定顺序，前台按此顺序渲染筛选） */
export const TYPE_ORDER = ['concept', 'system', 'algorithm', 'coding', 'project', 'hr']

export const TYPE_LABEL: Record<string, string> = {
  concept: '八股概念',
  system: '系统设计',
  algorithm: '算法推导',
  coding: '手写代码',
  project: '项目深挖',
  hr: 'HR 面',
}

/** 轮次（录入时可自由填写，这里是常见值） */
export const ROUND_OPTIONS = ['笔试', '一面', '二面', '三面', 'hr']

/** 难度档位：1-2 绿 / 3 黄 / 4-5 红，颜色由 main.css 的 .iq-diff--* 固定，不随品牌换肤 */
export const DIFFICULTY_LABEL: Record<number, string> = {
  1: '入门',
  2: '简单',
  3: '中等',
  4: '偏难',
  5: '困难',
}

export const STATUS_LABEL: Record<string, string> = {
  pending: '待审核',
  published: '已发布',
  rejected: '已驳回',
}

export const MARK_LABEL: Record<string, string> = {
  marked: '已收藏',
  fuzzy: '模糊',
  mastered: '已掌握',
}

/** 岗位族（题库录入与筛选共用；自由输入也允许，后端按字符串存） */
export const POSITION_OPTIONS = ['java', 'frontend', 'algo', 'data', 'product', 'test', 'ops']

export const POSITION_LABEL: Record<string, string> = {
  java: 'Java 后端',
  frontend: '前端',
  algo: '算法',
  data: '数据',
  product: '产品',
  test: '测试',
  ops: '运维',
}

export const positionLabel = (position?: string | null): string => {
  if (!position) return '通用'
  return POSITION_LABEL[position] || position
}

/* ==========================================================================
 * P2 个人备战台（计划 / 进度 / SRS 复习）
 * 接口：/api/interview/plan、/api/interview/review/**（均需登录）
 * ========================================================================== */

/** 备战计划（一个用户一份；未设置时后端返回 plan: null） */
export interface InterviewPlan {
  id: number
  targetCompanyId?: number | null
  targetCompanyName?: string | null
  targetCompanySlug?: string | null
  position?: string | null
  interviewDate?: string | null
  /** 距面试的天数：>0 还有 N 天；=0 就是今天；<0 已过 N 天 */
  daysLeft?: number | null
  note?: string | null
  updatedAt?: string
}

/** 个人进度概览 */
export interface InterviewProgress {
  markedCount: number
  masteredCount: number
  cardTotal: number
  dueToday: number
  reviewedToday: number
}

export interface InterviewPlanResponse {
  plan: InterviewPlan | null
  progress: InterviewProgress
}

/** 一张待复习卡（SRS） */
export interface ReviewCard {
  questionId: number
  slug: string
  title: string
  position?: string | null
  difficulty?: number | null
  companyName?: string | null
  /** 间隔档位 0-5，对应 1/2/4/7/15/30 天 */
  stage: number
  dueAt?: string | null
  lastResult?: string | null
  lapses: number
}

export interface ReviewDueResponse {
  dueTotal: number
  cards: ReviewCard[]
}

export interface ReviewStats {
  cardTotal: number
  dueToday: number
  dueWeek: number
  mastered: number
  byStage: Record<string, number>
}

/** 三键反馈（与后端 result 取值一致） */
export const REVIEW_RESULTS = ['unknown', 'fuzzy', 'known'] as const
export type ReviewResult = (typeof REVIEW_RESULTS)[number]

export const REVIEW_RESULT_LABEL: Record<ReviewResult, string> = {
  unknown: '不会',
  fuzzy: '模糊',
  known: '会',
}

/** SRS 固定间隔（天），与后端 stage 0-5 对应，用于空态文案说明 */
export const REVIEW_INTERVALS = [1, 2, 4, 7, 15, 30]

/* ==========================================================================
 * P3 AI 模拟面试（会话 / 答题 / 评分报告）
 * 接口：/api/interview/sessions/**（均需登录）
 * ========================================================================== */

/** 会话状态机：created(AI 出题中) → ongoing(作答中) → scoring(评分中) → done / failed */
export interface MockSessionSummary {
  id: number
  companyName?: string | null
  position?: string | null
  round?: string | null
  mode: string
  status: string
  questionCount: number
  answeredCount: number
  score?: number | null
  createdAt?: string
  submittedAt?: string | null
}

/** 一道模拟题：题库抽题带 questionId/slug，AI 出题只有 generated title/body */
export interface MockQuestion {
  seq: number
  questionId?: number | null
  slug?: string | null
  title: string
  body?: string | null
}

export interface MockAnswer {
  seq: number
  answerText: string
  score?: number | null
  feedback?: string | null
}

/** 四维评分（0-100） */
export interface MockDimensions {
  accuracy: number
  depth: number
  expression: number
  structure: number
}

/** 报告里的逐题条目（题干来自 detail.questions，此处只有评分与反馈） */
export interface MockReportItem {
  seq: number
  title: string
  answerText: string
  score: number
  feedback: string
}

export interface MockReport {
  overallScore: number
  dimensions: MockDimensions
  /** 后端可能给整段文本，也可能给建议数组，前端统一归一化展示 */
  suggestions: string | string[]
  items: MockReportItem[]
}

export interface MockSessionDetail {
  id: number
  companyName?: string | null
  position?: string | null
  round?: string | null
  mode: string
  status: string
  questionCount: number
  score?: number | null
  createdAt?: string
  submittedAt?: string | null
  questions: MockQuestion[]
  answers: MockAnswer[]
  report?: MockReport | null
}

/** 出题方式：题库抽题 / AI 出题 */
export const MOCK_MODE_LABEL: Record<string, string> = {
  bank: '题库抽题',
  ai: 'AI 出题',
}

export const MOCK_STATUS_LABEL: Record<string, string> = {
  created: '生成中',
  ongoing: '进行中',
  scoring: '评分中',
  done: '已完成',
  failed: '已失败',
}

/** 模拟面试轮次（可与题库 ROUND_OPTIONS 不同，这里只留面试轮） */
export const MOCK_ROUND_OPTIONS = ['一面', '二面', '三面', 'hr']

/** 题量三档 */
export const MOCK_QUESTION_COUNTS = [3, 5, 8]

/** 每人每日场次上限（与后端一致，仅用于文案提示） */
export const MOCK_DAILY_LIMIT = 3

/** 四维雷达图展示顺序与标签 */
export const MOCK_DIMENSION_ORDER: Array<{ key: keyof MockDimensions; label: string }> = [
  { key: 'accuracy', label: '准确性' },
  { key: 'depth', label: '深度' },
  { key: 'expression', label: '表达' },
  { key: 'structure', label: '结构' },
]
