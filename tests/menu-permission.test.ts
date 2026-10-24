/**
 * 菜单可见性按角色判，不只看登录状态。
 *
 * 回归背景：原来只判 isLoggedIn，任何登录用户都能看到「写文章」「后台首页」
 * 这些入口，点进去才被 403 挡住。菜单是承诺，给不出就不该摆出来。
 */
import { describe, expect, it } from 'vitest'
import { MODULES } from '../app/utils/navModules'
import type { NavItem, NavModule } from '../app/utils/navModules'

/** 复刻布局里的判定，避免为了测一个布尔去挂载整棵组件树 */
function visible(role: string | null, item: { auth?: boolean }): boolean {
  const canUseAdmin = role === 'admin'
  return !item.auth || canUseAdmin
}

const allItems = MODULES.flatMap(m => m.groups.flatMap(g => g.items))
const adminItems = allItems.filter(i => i.auth)
const publicItems = allItems.filter(i => !i.auth)

describe('菜单可见性', () => {
  it('存在需要权限的入口（否则这个测试没意义）', () => {
    expect(adminItems.length).toBeGreaterThan(0)
    expect(publicItems.length).toBeGreaterThan(0)
  })

  it('未登录：看得到公开入口，看不到需要权限的', () => {
    expect(publicItems.every(i => visible(null, i))).toBe(true)
    expect(adminItems.some(i => visible(null, i))).toBe(false)
  })

  it('普通登录用户：也不显示后台入口（这是这次的修复点）', () => {
    for (const i of adminItems) expect(visible('user', i)).toBe(false)
  })

  it('管理员：全部可见', () => {
    expect(allItems.every(i => visible('admin', i))).toBe(true)
  })

  it('模块级同样：需要权限的模块对普通用户整块收起', () => {
    const gated = MODULES.filter((m: NavModule) => m.auth)
    expect(gated.length).toBeGreaterThan(0)
    for (const m of gated) expect(visible('user', m)).toBe(false)
    for (const m of gated) expect(visible('admin', m)).toBe(true)
  })
})
