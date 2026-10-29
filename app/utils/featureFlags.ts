/**
 * 功能开关的纯逻辑（不含样式类名，可被单测直接引用）。
 *
 * 取值优先级：后端 site_settings(DB，后台设置页可切) > .env(NUXT_PUBLIC_*) > 默认开。
 * 归一化只认明确的 false：DB 给布尔、env 给字符串 'false'、历史数据给 null 都要能正确处理。
 */

export interface FeatureFlags {
  /** 股票（持仓/盈亏）模块 */
  stockEnabled: boolean
}

export const resolveStockEnabled = (raw: boolean | string | null | undefined): boolean =>
  raw !== false && raw !== 'false'
