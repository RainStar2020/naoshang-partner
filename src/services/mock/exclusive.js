// TODO(API): MOCK-ONLY. Replace fixtures and remove local state after API integration.
import { emptyContent } from '../../features/content/rich-content'
const states = new Map()
export function mockExclusiveState(user) {
  if (!states.has(user.id)) states.set(user.id, { quotes: new Map(), applications: [], operations: new Map() })
  return states.get(user.id)
}
export function mockCostoreOptions() {
  return { mockOnly: true, stores: [
    { id: 'demo-store-1', name: '测试门店一', number: 'NO.001', address: '仅用于本地流程测试', coverUrl: '' },
    { id: 'demo-store-2', name: '测试门店二', number: 'NO.002', address: '仅用于切换门店测试', coverUrl: '' },
  ], durations: [{ id: 'six-months', label: '6个月', months: 6 }, { id: 'twelve-months', label: '12个月', months: 12 }], agreement: { version: null, content: emptyContent() }, benefits: emptyContent() }
}
export function mockFounderAwards(month) {
  // Explicit demo report fixture, not a commission calculation or a formal rate.
  return { mockOnly: true, month, summary: { amount: 3500, identityLabel: '合伙人', vipCount: 10, rateBps: 10 }, items: [{ id: `demo-award-${month}`, month, vipCount: 10, rateBps: 10, amount: 3500 }], nextCursor: null, hasMore: false }
}
