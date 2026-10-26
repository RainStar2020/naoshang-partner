// TODO(API): MOCK-ONLY. Replace fixtures and remove local state after API integration.
// mock-only data, isolated by account. Local edits are not sent to a server.
const accounts = new Map()
export function mockBoundStore() {
  return { id: 'shop-1', name: '脑商训练营梧桐街店', number: 'NO.001', managerName: '李志远', managerPhone: '19919988991', address: '河南省郑州市管城回族区航海东路与中州大道交叉口西美景龙堂3c-1', coverUrl: '/static/agency/store-wutong.png' }
}
export function mockProfileState(user) {
  if (!accounts.has(user.id)) accounts.set(user.id, { profile: { id: user.id, nickname: user.name || '会员', phone: user.phone || '', regionNames: user.region || [], regionCodes: [], inviteCode: user.inviteCode || 'LXYA023', avatarUrl: user.avatarUrl || '/static/partner/avatar-nalan.png', wechatBound: false, version: 1 }, addresses: [], nextAddress: 1, feedback: new Map(), assets: new Map(), nextAsset: 1 })
  return accounts.get(user.id)
}
export const copy = value => JSON.parse(JSON.stringify(value))
