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
