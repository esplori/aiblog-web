/**
 * 动态 sitemap：直接从后端取真实数据生成，不引第三方模块（少一个依赖、少一次构建风险）。
 *
 * 收录口径：
 *  - 文章   /post/{uuid}
 *  - 题目   /interview/{slug}
 *  - 话题   /interview/topics/{slug}
 * 列表页/首页作为固定项写死。
 *
 * 拉不到数据时降级为「只输出固定页」，不让 sitemap 整个 500 ——
 * 搜索引擎抓到一个空 sitemap 总比抓到一个 500 好。
 */
interface Page<T> { records: T[] }

const escapeXml = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string))

export default defineEventHandler(async (event) => {
  const cfg = useRuntimeConfig()
  const api = cfg.apiBaseInternal
  const proto = getRequestHeader(event, 'x-forwarded-proto') || 'http'
  const host = getRequestHeader(event, 'x-forwarded-host') || getRequestHeader(event, 'host') || 'localhost'
  const base = `${proto}://${host}`

  const get = async <T>(path: string): Promise<T | null> => {
    try {
      const res = await $fetch<{ data?: T }>(`${api}${path}`, { timeout: 8000 })
      return (res?.data ?? null) as T | null
    } catch { return null }
  }

  const urls: Array<{ loc: string; lastmod?: string; priority: string }> = [
    { loc: '/', priority: '1.0' },
    { loc: '/articles', priority: '0.9' },
    { loc: '/interview', priority: '0.9' },
    { loc: '/interview/topics', priority: '0.7' },
    { loc: '/ai', priority: '0.6' },
  ]

  // 文章：一页拉 1000，超过就再翻一页（当前 600 篇左右，留余量）
  const pageSize = 1000
  for (let page = 1; page <= 5; page++) {
    const res = await get<Page<{ uuid: string; updatedAt?: string; updated_at?: string }>>(
      `/api/articles?page=${page}&size=${pageSize}`,
    )
    const records = res?.records ?? []
    for (const a of records) {
      urls.push({ loc: `/post/${a.uuid}`, lastmod: (a.updatedAt || a.updated_at)?.slice(0, 10), priority: '0.8' })
    }
    if (records.length < pageSize) break
  }

  const questions = await get<Page<{ slug: string }>>(`/api/interview/questions?page=1&size=${pageSize}`)
  for (const q of questions?.records ?? []) urls.push({ loc: `/interview/${q.slug}`, priority: '0.7' })

  type Topic = { slug?: string; name?: string; children?: Topic[] }
  const topics = await get<Topic[]>('/api/interview/topics')
  const flat: Topic[] = []
  const walk = (list: Topic[]) => { for (const t of list) { flat.push(t); if (t.children?.length) walk(t.children) } }
  walk(topics ?? [])
  for (const t of flat) {
    // 一级话题有 slug；子话题通常只有 id，用父级 slug 不成立，跳过没有 slug 的
    if (t.slug) urls.push({ loc: `/interview/topics/${t.slug}`, priority: '0.6' })
  }

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')

  const body = urls.map((u) => [
    '  <url>',
    `    <loc>${escapeXml(base + u.loc)}</loc>`,
    u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>` : '',
    `    <priority>${u.priority}</priority>`,
    '  </url>',
  ].filter(Boolean).join('\n')).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
})
