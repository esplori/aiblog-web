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
  /** 主题（P1 主题化） */
  topicId?: number | null
  topicName?: string | null
  /** subjective / single / multiple / judge / fill */
  questionKind?: string | null
  points?: number | null
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
 * P3 AI 模拟考试（会话 / 答题 / 评分报告）
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

/** 模拟考试轮次（可与题库 ROUND_OPTIONS 不同，这里只留面试轮） */
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

// 投递看板（P2）：一条投递记录，阶段固定五档
export interface InterviewApplication {
  id: number
  companyId?: number | null
  companyName?: string | null
  position: string
  stage: string
  appliedAt?: string | null
  note?: string | null
  createdAt?: string
  updatedAt?: string
}

/** 看板阶段顺序与中文名，前后端共用同一套 key */
export const APPLICATION_STAGES = [
  { key: 'applied', label: '已投递', tone: 'text-slate-600 bg-slate-100' },
  { key: 'screening', label: '筛选中', tone: 'text-amber-700 bg-amber-50' },
  { key: 'interview', label: '面试中', tone: 'text-brand-700 bg-brand-50' },
  { key: 'offer', label: 'Offer', tone: 'text-emerald-700 bg-emerald-50' },
  { key: 'rejected', label: '已结束', tone: 'text-slate-500 bg-slate-100' },
] as const

export const stageLabel = (stage?: string | null): string =>
  APPLICATION_STAGES.find((item) => item.key === stage)?.label || '已投递'

/* ==========================================================================
 * P2 模拟考试（客观题组卷）：创建 → 答题 → 交卷 → 成绩单
 * 接口：/api/interview/exams/**（均需登录）
 * ========================================================================== */

export interface ExamOption {
  key: string
  text: string
}

export interface ExamQuestionItem {
  seq: number
  questionId: number
  title: string
  body?: string | null
  questionKind: string
  points: number
  options: ExamOption[]
}

export interface ExamPaper {
  id: number
  title: string
  topicNames?: string | null
  questionCount: number
  durationMinutes: number
  totalPoints: number
  status: string
  startedAt?: string | null
  remainingSeconds: number
  questions: ExamQuestionItem[]
}

export interface ExamTopicScore {
  name: string
  total: number
  correct: number
}

export interface ExamWrongItem {
  questionId: number
  title: string
  questionKind?: string | null
  userAnswer?: string | null
  correctAnswer?: string | null
  explanation?: string | null
}

export interface ExamResult {
  id: number
  title: string
  topicNames?: string | null
  status: string
  questionCount: number
  correctCount: number
  totalPoints: number
  score: number
  accuracy: number
  durationMinutes: number
  elapsedSeconds?: number
  startedAt?: string | null
  submittedAt?: string | null
  passed: boolean
  passScore: number
  byTopic: ExamTopicScore[]
  wrongItems: ExamWrongItem[]
}

export interface ExamSummary {
  id: number
  title: string
  topicNames?: string | null
  questionCount: number
  status: string
  score: number
  totalPoints: number
  startedAt?: string | null
  submittedAt?: string | null
}

export const EXAM_STATUS_LABEL: Record<string, string> = {
  ongoing: '进行中',
  submitted: '已交卷',
}

export const examStatusLabel = (status?: string | null): string =>
  (status && EXAM_STATUS_LABEL[status]) || '进行中'


/** 主题树节点（/api/interview/topics） */
export interface InterviewTopicNode {
  id: number
  slug: string
  name: string
  parentId?: number | null
  kind: string
  description?: string | null
  icon?: string | null
  sortOrder?: number
  questionCount: number
  objectiveCount: number
  children: InterviewTopicNode[]
}


/** 题型（客观/主观）中文名，题库筛选与卡片共用 */
export const QUESTION_KIND_LABEL: Record<string, string> = {
  subjective: '主观题',
  single: '单选题',
  multiple: '多选题',
  judge: '判断题',
  fill: '填空题',
}

export const questionKindLabel = (kind?: string | null): string =>
  (kind && QUESTION_KIND_LABEL[kind]) || '主观题'

/** 题库题型筛选项（objective 为后端支持的合并值） */
export const KIND_FILTER_OPTIONS = [
  { value: 'objective', label: '客观题（自动判分）' },
  { value: 'subjective', label: '主观题' },
  { value: 'single', label: '单选题' },
  { value: 'multiple', label: '多选题' },
  { value: 'judge', label: '判断题' },
  { value: 'fill', label: '填空题' },
] as const
