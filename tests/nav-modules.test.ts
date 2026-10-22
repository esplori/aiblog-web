/**
 * 工作台侧边栏高亮 · 纯逻辑单测
 *
 * 回归背景：题库（questions）的 path 就是 /interview，
 * 旧实现用 startsWith('/interview') 做兜底且排在子项之前，
 * 导致点击「主题刷题 / 模拟考试」时高亮的永远是「题库」。
 */
import { describe, expect, it } from 'vitest'

import { MODULES, resolveActive, resolveModule } from '../app/utils/navModules'

const interviewModule = MODULES.find(m => m.key === 'interview')!
const interviewItems = interviewModule.groups.flatMap(g => g.items)

describe('resolveActive · 刷题模块', () => {
  it('主题刷题列表与详情都高亮 topics', () => {
    expect(resolveActive('/interview/topics')).toBe('topics')
    expect(resolveActive('/interview/topics/java')).toBe('topics')
  })

  it('模拟考试列表与详情都高亮 mock', () => {
    expect(resolveActive('/interview/exams')).toBe('mock')
    expect(resolveActive('/interview/exams/12')).toBe('mock')
    // 历史路径兼容
    expect(resolveActive('/interview/mock/12')).toBe('mock')
  })

  it('题库（含题目详情）高亮 questions', () => {
    expect(resolveActive('/interview')).toBe('questions')
    expect(resolveActive('/interview/42')).toBe('questions')
  })

  it('题目录入高亮 iq-admin，且不被 /interview 兜底抢走', () => {
    expect(resolveActive('/admin/interview-questions')).toBe('iq-admin')
    expect(resolveActive('/admin/interview-questions?page=2')).toBe('iq-admin')
  })

  it('每个刷题菜单项自身的 path 都能命中自己的 key（不串台）', () => {
    for (const item of interviewItems) {
      expect(resolveActive(item.path)).toBe(item.key)
    }
  })
})

describe('resolveActive · 其它模块不受影响', () => {
  it('首页与博客', () => {
    expect(resolveActive('/')).toBe('home')
    expect(resolveActive('/articles')).toBe('articles')
    expect(resolveActive('/admin')).toBe('admin')
  })

  it('AI 广场按 query.type 分项', () => {
    expect(resolveActive('/ai')).toBe('plaza')
    expect(resolveActive('/ai', 'mcp')).toBe('mcp')
    expect(resolveActive('/ai/123')).toBe('plaza')
  })
})

describe('resolveModule', () => {
  it('刷题相关路径都归属 interview 模块', () => {
    for (const path of ['/interview', '/interview/topics', '/interview/exams/1', '/admin/interview-questions']) {
      expect(resolveModule(path).key).toBe('interview')
    }
  })
})
