/**
 * 功能开关的纯逻辑（不含样式类名，可被单测直接引用）。
 *
 * 取值优先级：后端 site_settings(DB，后台设置页可切) > .env(NUXT_PUBLIC_*) > 默认开。
 * 归一化只认明确的 false：DB 给布尔、env 给字符串 'false'、历史数据给 null 都要能正确处理。
 */

export interface FeatureFlags {
  /** 股票（持仓/盈亏）模块 */
  stockEnabled: boolean
  /** 前台登录入口（默认关：不对外提供注册/登录） */
  loginEnabled: boolean
  /** 文章评论（默认关：不显示评论区，也不请求评论接口） */
  commentEnabled: boolean
}

export const resolveStockEnabled = (raw: boolean | string | null | undefined): boolean =>
  raw !== false && raw !== 'false'

/**
 * 「默认关」类开关的归一化：只有明确的 true / 'true' 才算开。
 * 与 resolveStockEnabled 相反——那两个开关是后加的、默认不该对外开放，
 * 所以 null / undefined / 历史脏数据一律按「关」处理。
 */
export const resolveOffByDefault = (raw: boolean | string | null | undefined): boolean =>
  raw === true || raw === 'true'
