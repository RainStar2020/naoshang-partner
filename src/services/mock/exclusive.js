// TODO(API): MOCK-ONLY. Replace fixtures and remove local state after API integration.
import { emptyContent } from '../../features/content/rich-content'
const states = new Map()
export function mockExclusiveState(user) {
  if (!states.has(user.id)) {
    const saved=uni.getStorageSync(`naoshang-mock-exclusive-v2:${user.id}`)
    states.set(user.id, { quotes: new Map(saved?.quotes || []), applications: saved?.applications || [], operations: new Map(saved?.operations || []) })
  }
  return states.get(user.id)
}
export function saveMockExclusiveState(user){const state=mockExclusiveState(user);uni.setStorageSync(`naoshang-mock-exclusive-v2:${user.id}`,JSON.parse(JSON.stringify({quotes:[...state.quotes],applications:state.applications,operations:[...state.operations]})))}
const costoreShop = { coverUrl: '/static/agency/store-wutong.png', managerName: '李志远', phone: '19919988991', monthlyFee: 69800, ownerLabel: '当前已有8位合店老板', address: '河南省郑州市管城回族区航海东路与中州大道交叉口西美景龙堂3c-1' }
export function mockCostoreOptions() {
  // Mock quotation uses the same monthly fee as the store card; real prices come from API.
  return { mockOnly: true, stores: [
    { id: 'demo-store-1', name: '脑商训练营梧桐街店', number: 'NO.001', ...costoreShop },
    { id: 'demo-store-2', name: '脑商训练营文化路店', number: 'NO.002', ...costoreShop, ownerLabel: '当前已有3位合店老板' },
  ], durations: [{ id: 'six-months', label: '6个月', months: 6 }, { id: 'twelve-months', label: '12个月', months: 12 }], agreement: { version: null, content: emptyContent() }, benefits: emptyContent() }
}
export function mockFounderAwards(month) {
  // Explicit demo report fixture, not a commission calculation or a formal rate.
  const row = index => ({ id: `demo-award-${month}-${index}`, month, vipCount: 10, rateBps: 10, amount: 3500 })
  return { mockOnly: true, month, summary: { amount: 3500, identityLabel: '50联席', vipCount: 10, rateBps: 10 }, items: [1, 2, 3, 4, 5, 6, 7, 8].map(row), nextCursor: null, hasMore: false }
}
