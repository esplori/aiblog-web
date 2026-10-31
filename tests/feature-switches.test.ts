/**
 * 登录入口 / 评论功能开关：默认关闭，管理员在后台「站点设置」里打开。
 *
 * 与股票开关的差别只有一个方向 —— 这两个默认是**关**的，
 * 所以归一化必须只认明确的 true，否则历史数据里一个 null 就能把入口重新放出来。
 */
import { describe, expect, it } from 'vitest'
import { resolveOffByDefault, resolveStockEnabled } from '../app/utils/featureFlags'

describe('默认关闭的开关归一化', () => {
  it('明确 true 才算开', () => {
    expect(resolveOffByDefault(true)).toBe(true)
    expect(resolveOffByDefault('true')).toBe(true)
  })

  it('false / 字符串 false 都算关', () => {
    expect(resolveOffByDefault(false)).toBe(false)
    expect(resolveOffByDefault('false')).toBe(false)
  })

  it('null / undefined / 空串按关处理（历史数据与缺列的安全默认）', () => {
    expect(resolveOffByDefault(null)).toBe(false)
    expect(resolveOffByDefault(undefined)).toBe(false)
    expect(resolveOffByDefault('')).toBe(false)
  })

  it('与股票开关方向相反，不能混用', () => {
    expect(resolveStockEnabled(null)).toBe(true)
    expect(resolveOffByDefault(null)).toBe(false)
    expect(resolveStockEnabled(false)).toBe(false)
    expect(resolveOffByDefault(true)).toBe(true)
  })
})
