// TODO(API): MOCK-ONLY. Replace fixtures and remove local state after API integration.
import { emptyContent } from '../../features/content/rich-content'
import { mockFamily } from './family'

// mock-only navigation metadata. CMS benefits/templates stay empty. TODO(API): sample course metadata lives only in this mock adapter.
const names = ['超级记忆', '实用记忆', '语文系统', '外语系统', '百科系统', '导图大师', '速读大师', '记忆大师', '潜能开发', '未来领袖']
const tiers = ['一阶菁英会员', '二阶行能会员', '三阶羿烁会员']
const states = new Map()
function accountState(accountId) {
  if (!states.has(accountId)) states.set(accountId, { grants: new Map(), codes: new Map(), operations: new Map() })
  return states.get(accountId)
}
export function mockIdentities(user) {
  return [
    { id: `parent:${user.id}`, accountId: user.id, mode: 'parent', name: user.name || '家长', displayId: user.id, grade: '', badge: '家长' },
    ...mockFamily(user).members.map(member => ({ id: member.contextId, accountId: user.id, mode: 'child', memberId: member.id, name: member.name, displayId: member.displayId, grade: member.gradeLabel, badge: mockMemberBadge(user, member) })),
  ]
}
export function mockMemberBadge(user, member) {
  return member.badge === '未激活会员' && mockLevels({ accountId: user.id, memberId: member.id, mode: 'child' }).some(level => level.unlocked) ? '已激活学习权益' : member.badge
}
export function mockLevels(identity) {
  const granted = accountState(identity.accountId).grants.get(identity.memberId) || new Set()
  return names.map((name, index) => ({
    id: `level-${index + 1}`, number: index + 1, name,
    tier: index === 0 ? 1 : index < 5 ? 2 : 3,
    tierName: tiers[index === 0 ? 0 : index < 5 ? 1 : 2],
    unlocked: identity.mode === 'child' && (identity.memberId.endsWith('-1') || granted.has(`level-${index + 1}`)),
  }))
}
export function mockLevelDetail(identity, levelId) {
  const level = mockLevels(identity).find(item => item.id === levelId)
  if (!level) throw new Error('该等级不存在')
  return { ...level, content: emptyContent(), summary: '', covers: [], chapters: [{id:`${levelId}-article`,title:'联想记忆入门',type:'article',accessible:level.unlocked},{id:`${levelId}-video`,title:'观察与专注练习',type:'video',accessible:level.unlocked}], activationEnabled: identity.mode === 'child', revision: null }
}
export function mockPreviewActivation(identity, code, levelId) {
  const level = mockLevelDetail(identity, levelId)
  if (identity.mode !== 'child') throw new Error('请先选择需要激活的会员')
  if (level.unlocked) throw new Error('该会员已解锁此等级')
  if (code !== `DEMO-L${level.number}`) throw new Error('激活码无效或不适用于此等级')
  if (accountState(identity.accountId).codes.has(code)) throw new Error('该激活码已使用')
  return { code, levelId, levelName: level.name, memberId: identity.memberId, memberName: identity.name }
}
export function mockActivate(identity, { code, levelId, idempotencyKey }) {
  const state = accountState(identity.accountId)
  const payload = JSON.stringify({ code, levelId, memberId: identity.memberId })
  const previous = state.operations.get(idempotencyKey)
  if (previous) {
    if (previous.payload !== payload) throw new Error('重复请求参数不一致')
    return previous.result
  }
  mockPreviewActivation(identity, code, levelId)
  const grants = state.grants.get(identity.memberId) || new Set()
  grants.add(levelId); state.grants.set(identity.memberId, grants); state.codes.set(code, identity.memberId)
  const result = { activationId: `demo-activation-${state.operations.size + 1}`, levelId, memberId: identity.memberId }
  state.operations.set(idempotencyKey, { payload, result })
  return result
}
