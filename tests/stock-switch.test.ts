/**
 * 股票模块开关：后台「站点设置」里的开关 + .env 兜底一起决定入口是否可见。
 *
 * 背景：首页/工作台的「股票」入口需要一个能随时开关的选项。
 * 关掉后不该留下空模块标题，也不该让直接输 URL 的人摸进半空页面。
 */
import { describe, expect, it } from 'vitest'
import { MODULES, canSeeModule } from '../app/utils/navModules'
import { resolveStockEnabled } from '../app/utils/featureFlags'

const finance = MODULES.find(m => m.key === 'finance')!
const blog = MODULES.find(m => m.key === 'blog')!

describe('股票模块开关：菜单可见性', () => {
  it('开关打开 + 管理员：股票模块可见（默认行为不变）', () => {
    expect(canSeeModule(finance, { canUseAdmin: true, stockEnabled: true })).toBe(true)
  })

  it('开关关闭：连管理员也看不到股票模块', () => {
    expect(canSeeModule(finance, { canUseAdmin: true, stockEnabled: false })).toBe(false)
  })

  it('开关关闭不影响其他模块', () => {
    for (const mod of MODULES.filter(m => m.key !== 'finance')) {
      expect(canSeeModule(mod, { canUseAdmin: true, stockEnabled: false }))
        .toBe(canSeeModule(mod, { canUseAdmin: true, stockEnabled: true }))
    }
    expect(canSeeModule(blog, { canUseAdmin: false, stockEnabled: false })).toBe(true)
  })

  it('权限判定仍然生效：股票是 auth 模块，未登录/普通用户看不到', () => {
    expect(canSeeModule(finance, { canUseAdmin: false, stockEnabled: true })).toBe(false)
  })
})

describe('股票模块开关：取值归一化', () => {
  it('后端布尔 / 环境变量字符串 / 历史 null 都按「只有明确 false 才关闭」', () => {
    expect(resolveStockEnabled(true)).toBe(true)
    expect(resolveStockEnabled(false)).toBe(false)
    expect(resolveStockEnabled('true')).toBe(true)
    expect(resolveStockEnabled('false')).toBe(false)
    expect(resolveStockEnabled(null)).toBe(true)
    expect(resolveStockEnabled(undefined)).toBe(true)
  })
})
