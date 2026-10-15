/**
 * 「继续阅读」本地记录（工作台首页用）。
 * 只存 localStorage，不落库；不同步到服务端。
 */

export interface RecentRead {
  path: string
  title: string
  kind: 'article' | 'ai'
  at: number
}

const KEY = 'aiblog:recent'
const MAX = 6

export const useRecentReading = () => {
  const read = (): RecentRead[] => {
    if (import.meta.server) return []
    try {
      const raw = localStorage.getItem(KEY)
      const list = raw ? (JSON.parse(raw) as RecentRead[]) : []
      return Array.isArray(list) ? list.slice(0, MAX) : []
    } catch {
      return []
    }
  }

  const remember = (entry: Omit<RecentRead, 'at'>) => {
    if (import.meta.server || !entry.path || !entry.title) return
    const list = read().filter(r => r.path !== entry.path)
    list.unshift({ ...entry, at: Date.now() })
    try {
      localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
    } catch {
      /* 配额满等情况忽略 */
    }
  }

  return { read, remember }
}

