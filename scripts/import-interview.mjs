#!/usr/bin/env node
/**
 * 面试题库种子导入（走 admin API，幂等：已存在的公司/题目会跳过）
 *
 * 用法：
 *   node scripts/import-interview.mjs
 *   node scripts/import-interview.mjs --file scripts/interview-seed.json --dry-run
 *
 * 鉴权：优先 AIBLOG_API_KEY，否则读 ~/.pi/agent/secrets/aiblog.key（与 publish-article.mjs 一致）
 */
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'

const argv = process.argv.slice(2)
let file = path.join(import.meta.dirname, 'interview-seed.json')
let api = process.env.AIBLOG_API || 'http://localhost:8080'
let key = process.env.AIBLOG_API_KEY
let keyFile = path.join(homedir(), '.pi/agent/secrets/aiblog.key')
let dryRun = false

for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  const next = () => argv[++i]
  if (a === '--file') file = next()
  else if (a === '--api') api = next()
  else if (a === '--key') key = next()
  else if (a === '--key-file') keyFile = next()
  else if (a === '--dry-run') dryRun = true
  else {
    console.error('未知参数: ' + a)
    process.exit(1)
  }
}
api = api.replace(/\/+$/, '')

async function request(method, p, body) {
  const res = await fetch(api + p, {
    method,
    headers: { 'X-API-Key': key, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json.code !== 200) {
    throw new Error(method + ' ' + p + ' -> HTTP ' + res.status + ' ' + (json.message || ''))
  }
  return json.data
}

async function loadAllQuestions() {
  const slugs = new Set()
  for (let page = 1; page <= 20; page++) {
    const data = await request('GET', '/api/admin/interview/questions?page=' + page + '&size=200')
    const records = data?.records || []
    for (const r of records) slugs.add(r.slug)
    if (records.length < 200) break
  }
  return slugs
}

const seed = JSON.parse(await readFile(file, 'utf8'))
if (!Array.isArray(seed.companies) || !Array.isArray(seed.questions)) {
  throw new Error('种子文件格式不对：需要 { companies: [], questions: [] }')
}
if (!key) key = (await readFile(keyFile, 'utf8')).trim()
if (!key) throw new Error('缺少 API Key：设置 AIBLOG_API_KEY 或 ' + keyFile)

console.log('种子文件 ' + file)
console.log('目标 ' + api + (dryRun ? '（dry-run，不写库）' : ''))

const existingCompanies = await request('GET', '/api/admin/interview/companies')
const companyByName = new Map()
for (const c of existingCompanies || []) companyByName.set(c.name, c.id)

let coCreated = 0
for (const c of seed.companies) {
  if (companyByName.has(c.name)) continue
  if (dryRun) {
    console.log('  [dry] 新建公司 ' + c.name)
  } else {
    const saved = await request('POST', '/api/admin/interview/companies', {
      slug: c.slug, name: c.name, industry: c.industry, scale: c.scale, intro: c.intro,
    })
    companyByName.set(saved.name, saved.id)
  }
  coCreated++
}

const existingSlugs = await loadAllQuestions()
let qCreated = 0
let qSkipped = 0
const failed = []
for (const q of seed.questions) {
  if (existingSlugs.has(q.slug)) { qSkipped++; continue }
  const companyId = q.company ? companyByName.get(q.company) : null
  if (q.company && !companyId) { failed.push(q.slug + '（找不到公司 ' + q.company + '）'); continue }
  const payload = {
    slug: q.slug, companyId, position: q.position, round: q.round,
    difficulty: q.difficulty, questionType: q.questionType, title: q.title,
    body: q.body, answer: q.answer, followUps: q.followUps || [],
    sourceUrl: q.sourceUrl ?? null, askedYear: q.askedYear ?? null,
    status: 'published', tags: q.tags || [],
  }
  if (dryRun) { console.log('  [dry] 新建题目 ' + q.slug + '  ' + q.title); qCreated++; continue }
  try {
    await request('POST', '/api/admin/interview/questions', payload)
    qCreated++
  } catch (e) {
    failed.push(q.slug + '（' + e.message + '）')
  }
}

console.log('---')
console.log('公司：新建 ' + coCreated + ' / 已有跳过 ' + (seed.companies.length - coCreated))
console.log('题目：新建 ' + qCreated + ' / 已存在跳过 ' + qSkipped + ' / 总计 ' + seed.questions.length)
if (failed.length) {
  console.log('失败 ' + failed.length + ' 条：')
  for (const f of failed) console.log('  - ' + f)
  process.exit(1)
}
