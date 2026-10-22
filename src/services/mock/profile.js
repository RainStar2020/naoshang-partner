// TODO(API): MOCK-ONLY. Replace fixtures and remove local state after API integration.
// mock-only data, isolated by account. Local edits are not sent to a server.
const accounts = new Map()
export function mockProfileState(user) {
  if (!accounts.has(user.id)) accounts.set(user.id, { profile: { id: user.id, nickname: user.name || '会员', phone: user.phone || '', regionNames: user.region || [], regionCodes: [], inviteCode: user.inviteCode || '', avatarUrl: '', wechatBound: false, version: 1 }, addresses: [], nextAddress: 1, feedback: new Map(), assets: new Map(), nextAsset: 1 })
  return accounts.get(user.id)
}
export const copy = value => JSON.parse(JSON.stringify(value))
