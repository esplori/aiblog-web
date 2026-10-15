#!/usr/bin/env node
/**
 * 通过接口发布文章（给 agent / 脚本用）
 *
 * 用法：
 *   node scripts/publish-article.mjs content/posts/xxx.md
 *   node scripts/publish-article.mjs content/posts --status published --category 技术 --tags AI,工程实践
 *
 * 鉴权：优先 AIBLOG_API_KEY（长期令牌），否则用 AIBLOG_USERNAME / AIBLOG_PASSWORD 登录换 JWT。
 */
import { readFile, readdir, stat, mkdir, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'

const API = (process.env.AIBLOG_API || 'http://localhost:8080').replace(/\/+$/, '')
const WEB = (process.env.AIBLOG_WEB || 'http://localhost:3000').replace(/\/+$/, '')
const TOKEN_CACHE = path.join(homedir(), '.cache', 'aiblog', 'token.json')
const argv = process.argv.slice(2)

const USAGE = [
  '通过接口发布文章',
  '',
  '用法: node scripts/publish-article.mjs <file.md | 目录> [选项]',
  '',
  '选项:',
  '  --status <draft|published|archived>  文章状态（默认 draft，安全起见）',
  '  --category <名称或ID>                分类（也可写在 front-matter 的 category:）',
  '  --tags <a,b>                         标签（也可写在 front-matter；缺失的自动创建）',
  '  --cover <url>                        封面图 URL（图片先传到 /api/files/upload）',
  '  --title <标题>                       覆盖 front-matter 标题',
  '  --excerpt <摘要>                     覆盖摘要（不填则从正文自动截取）',
  '  --source <url>                       原文链接',
  '  --api <base>                         后端地址（默认 $AIBLOG_API 或 http://localhost:8080）',
  '  --key <apiKey>                       长期令牌（默认 $AIBLOG_API_KEY）',
  '  --no-create-tags                     标签不存在时报错，而不是自动创建',
  '  --force                              标题已存在时仍然新建（默认跳过）',
  '  --dry-run                            只打印将要提交的内容，不发请求',
  '  --json                               输出接口原始返回',
  '',
  '环境变量: AIBLOG_API_KEY / AIBLOG_USERNAME / AIBLOG_PASSWORD / AIBLOG_API / AIBLOG_WEB',
].join('\n')

function usage() {
  console.log(USAGE)
}

function parseArgs(args) {
  const opts = {
    files: [], status: null, category: null, tags: null, cover: null, title: null,
    excerpt: null, source: null, key: process.env.AIBLOG_API_KEY || null,
    createTags: true, force: false, dryRun: false, json: false,
  }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    const nextVal = () => args[++i]
    if (a === '--status') opts.status = nextVal()
    else if (a === '--category') opts.category = nextVal()
    else if (a === '--tags') opts.tags = nextVal()
    else if (a === '--cover') opts.cover = nextVal()
    else if (a === '--title') opts.title = nextVal()
    else if (a === '--excerpt') opts.excerpt = nextVal()
    else if (a === '--source') opts.source = nextVal()
    else if (a === '--key') opts.key = nextVal()
    else if (a === '--api') process.env.AIBLOG_API = nextVal()
    else if (a === '--no-create-tags') opts.createTags = false
    else if (a === '--force') opts.force = true
    else if (a === '--dry-run') opts.dryRun = true
    else if (a === '--json') opts.json = true
    else if (a.startsWith('--')) { console.error('未知参数: ' + a); usage(); process.exit(1) }
    else opts.files.push(a)
  }
  return opts
}

const opts = parseArgs(argv)
if (argv.length === 0 || argv.includes('-h') || argv.includes('--help')) { usage(); process.exit(0) }
if (opts.files.length === 0) { usage(); process.exit(1) }

// ---------- front-matter ----------
const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

function parseFrontMatter(raw) {
  const match = raw.match(FRONT_MATTER)
  if (!match) return { data: {}, content: raw }
  const data = {}
  for (const line of match[1].split(/\r?\n/)) {
    const at = line.indexOf(':')
    if (at <= 0) continue
    const key = line.slice(0, at).trim()
    let value = line.slice(at + 1).trim()
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
    } else {
      value = value.replace(/^["']|["']$/g, '')
    }
    data[key] = value
  }
  return { data, content: raw.slice(match[0].length) }
}

function toExcerpt(markdown, limit = 120) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~>-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > limit ? text.slice(0, limit) + '…' : text
}

// ---------- 鉴权 ----------
let cachedToken = null

async function login() {
  const username = process.env.AIBLOG_USERNAME
  const password = process.env.AIBLOG_PASSWORD
  if (!username || !password) {
    throw new Error('缺少鉴权：设置 AIBLOG_API_KEY，或 AIBLOG_USERNAME / AIBLOG_PASSWORD（也可用 --key）')
  }
  const res = await fetch(API + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok || json?.code !== 200) throw new Error('登录失败: ' + (json?.message || res.status))
  const token = json.data.accessToken
  const expiresIn = Number(json.data.expiresIn || 0)
  try {
    await mkdir(path.dirname(TOKEN_CACHE), { recursive: true })
    await writeFile(TOKEN_CACHE, JSON.stringify({ token, exp: Date.now() + Math.max(expiresIn - 300, 60) * 1000 }))
  } catch { /* 缓存失败不影响发布 */ }
  return token
}

async function authHeaders() {
  if (opts.key) return { 'X-API-Key': opts.key }
  if (cachedToken) return { Authorization: 'Bearer ' + cachedToken }
  try {
    const cached = JSON.parse(await readFile(TOKEN_CACHE, 'utf8'))
    if (cached?.token && cached.exp > Date.now()) {
      cachedToken = cached.token
      return { Authorization: 'Bearer ' + cachedToken }
    }
  } catch { /* 无缓存 */ }
  cachedToken = await login()
  return { Authorization: 'Bearer ' + cachedToken }
}

async function api(pathname, options = {}) {
  const method = options.method || 'GET'
  const res = await fetch(API + pathname, {
    method,
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const text = await res.text()
  let json = null
  try { json = text ? JSON.parse(text) : null } catch { /* 非 JSON 响应 */ }
  if (!res.ok || (json && typeof json.code === 'number' && json.code !== 200)) {
    throw new Error(method + ' ' + pathname + ' -> ' + res.status + ' ' + (json?.message || text.slice(0, 160)))
  }
  return json
}

// ---------- 分类 / 标签 ----------
let categoryCache = null
async function resolveCategory(input) {
  if (input === null || input === undefined || input === '') return null
  if (/^\d+$/.test(String(input))) return Number(input)
  if (!categoryCache) categoryCache = (await api('/api/categories')).data || []
  const wanted = String(input).trim()
  const hit = categoryCache.find(c => c.name === wanted) || categoryCache.find(c => c.name.includes(wanted))
  if (!hit) throw new Error('分类「' + wanted + '」不存在，可用: ' + categoryCache.map(c => c.name).join(' / '))
  return hit.id
}

let tagCache = null
async function resolveTags(input) {
  const names = (Array.isArray(input) ? input : String(input || '').split(','))
    .map(s => String(s).trim()).filter(Boolean)
  if (names.length === 0) return []
  if (!tagCache) tagCache = new Map(((await api('/api/tags')).data || []).map(t => [t.name, t.id]))
  const ids = []
  for (const name of names) {
    if (tagCache.has(name)) { ids.push(tagCache.get(name)); continue }
    if (!opts.createTags) throw new Error('标签「' + name + '」不存在')
    const created = await api('/api/tags', { method: 'POST', body: { name } })
    tagCache.set(name, created.data.id)
    ids.push(created.data.id)
    console.log('  + 新建标签: ' + name)
  }
  return ids
}

// ---------- 发布 ----------
async function publishFile(file) {
  const raw = await readFile(file, 'utf8')
  const { data, content } = parseFrontMatter(raw)

  const title = opts.title || data.title
  if (!title) throw new Error('缺少标题（front-matter 的 title: 或 --title）')
  const status = opts.status || data.status || 'draft'
  const body = content.trim()
  if (!body) throw new Error('正文为空')

  const categoryId = await resolveCategory(opts.category ?? data.category)
  if (!categoryId) throw new Error('缺少分类（front-matter 的 category: 或 --category）')
  const tagIds = await resolveTags(opts.tags ?? data.tags ?? [])

  const payload = {
    title: String(title),
    content: body,
    excerpt: opts.excerpt || data.excerpt || toExcerpt(body),
    coverImage: opts.cover || data.cover || null,
    status,
    sourceUrl: opts.source || data.sourceUrl || null,
    categoryId,
    tagIds,
  }

  if (opts.dryRun) {
    console.log('\n[dry-run] ' + file)
    console.log(JSON.stringify({ ...payload, content: payload.content.slice(0, 80) + '…' }, null, 2))
    return { skipped: true }
  }

  if (!opts.force) {
    try {
      // 列表接口能查到草稿，/search 只看已发布，所以用列表做去重
      const found = await api('/api/articles?status=all&keyword=' + encodeURIComponent(payload.title) + '&page=1&size=10')
      if ((found?.data?.records || []).some(a => a.title === payload.title)) {
        console.log('  = 已存在同名文章，跳过（强制新建加 --force）: ' + payload.title)
        return { skipped: true }
      }
    } catch { /* 搜索不可用时不做去重 */ }
  }

  const created = await api('/api/articles', { method: 'POST', body: payload })
  const article = created.data
  if (opts.json) {
    console.log(JSON.stringify(created, null, 2))
  } else {
    const label = status === 'published' ? '已发布' : status === 'draft' ? '已存为草稿' : status
    console.log('  ✓ ' + label + ': ' + payload.title)
    console.log('    uuid: ' + article.uuid)
    console.log('    ' + WEB + '/post/' + article.uuid)
  }
  return { created: article }
}

async function collectFiles(input) {
  const info = await stat(input)
  if (info.isDirectory()) {
    const entries = await readdir(input)
    return entries.filter(f => f.endsWith('.md')).map(f => path.join(input, f)).sort()
  }
  return [input]
}

async function main() {
  const files = (await Promise.all(opts.files.map(collectFiles))).flat()
  if (files.length === 0) { console.error('没有找到 .md 文件'); process.exit(1) }
  console.log('目标: ' + API + '  |  文件 ' + files.length + ' 个  |  鉴权: ' + (opts.key ? 'API Key' : '账号密码'))

  let ok = 0, skipped = 0, failed = 0
  for (const file of files) {
    try {
      const result = await publishFile(file)
      if (result.skipped) skipped++; else ok++
    } catch (e) {
      failed++
      console.error('  ✗ ' + file + ': ' + e.message)
    }
  }
  console.log('\n完成: 成功 ' + ok + ' / 跳过 ' + skipped + ' / 失败 ' + failed)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => { console.error('脚本失败: ' + e.message); process.exit(1) })

