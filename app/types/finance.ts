/** 股票模块类型 */
export interface FinQuote {
  symbol: string
  name?: string
  price?: number
  prevClose?: number
  changeAmount?: number
  changePct?: number
  openPrice?: number
  highPrice?: number
  lowPrice?: number
  volume?: number
  amount?: number
  quoteTime?: string
  updatedAt?: string
}

export interface FinPosition {
  symbol: string
  name?: string
  shares: number
  avgCost: number
  price?: number
  cost: number
  marketValue: number
  pnl: number
  pnlPct: number
  dayPnl: number
  dayPnlPct: number
  weight: number
}

export interface FinWatchItem {
  id: number
  symbol: string
  name?: string
  price?: number
  changePct?: number
  targetPrice?: number
  note?: string
  held?: boolean
}

export interface FinTrade {
  id: number
  symbol: string
  name?: string
  side: 'BUY' | 'SELL'
  price: number
  shares: number
  fee: number
  amount: number
  occurredOn: string
  note?: string
}

export interface FinSummary {
  marketValue: number
  cost: number
  pnl: number
  pnlPct: number
  dayPnl: number
  dayPnlPct: number
  positions: FinPosition[]
  watchlist: FinWatchItem[]
  advice: string[]
  updatedAt?: string
}

export interface FinDailyReport {
  tradeDate: string
  marketValue: number
  cost: number
  dayPnl: number
  totalPnl: number
  dayPnlPct: number
  totalPnlPct: number
  positions: FinPosition[]
  advice: string[]
}
