// TODO(API): MOCK-ONLY. Replace fixtures and remove local state after API integration.
import { emptyContent } from '../../features/content/rich-content'
import { mockFamily } from './family'
import { mockChapterProgress } from './learning-progress'

// mock-only navigation metadata. CMS benefits/templates stay empty. TODO(API): sample course metadata lives only in this mock adapter.
const names = ['超级记忆', '实用记忆', '语文系统', '外语系统', '百科系统', '导图大师', '速读大师', '记忆大师', '潜能开发', '未来领袖']
const tiers = ['一阶菁英会员', '二阶行能会员', '三阶羿烁会员']
const states = new Map()
function accountState(accountId) {
  if (!states.has(accountId)) {
    const saved = uni.getStorageSync?.(`naoshang-mock-grants:${accountId}`)
    states.set(accountId, { grants: new Map((saved?.grants || []).map(([id, levels]) => [id, new Set(levels)])), codes: new Map(saved?.codes || []), operations: new Map(saved?.operations || []) })
  }
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
    unlocked: identity.mode === 'child' && (identity.memberId === `demo-${identity.accountId}-1` || [...granted].some(id => {
      const grantedIndex = names.findIndex((_, n) => id === `level-${n + 1}`)
      return grantedIndex >= 0 && (grantedIndex === 0 ? 1 : grantedIndex < 5 ? 2 : 3) === (index === 0 ? 1 : index < 5 ? 2 : 3)
    })),
  }))
}
export function mockLevelDetail(identity, levelId) {
  const level = mockLevels(identity).find(item => item.id === levelId)
  if (!level) throw new Error('该等级不存在')
  const chapters = [
    { id: `${levelId}-article`, title: '第1章：联想记忆入门', type: 'article' },
    { id: `${levelId}-video`, title: '第2章：观察与专注练习', type: 'video' },
    { id: `${levelId}-practice`, title: '第3章：建立自己的记忆故事', type: 'article' },
    { id: `${levelId}-review`, title: '第4章：复习与回忆训练', type: 'video' },
  ].map(chapter => ({ ...chapter, accessible: level.unlocked, progress: identity.mode === 'child' ? mockChapterProgress(identity, levelId, chapter.id) : null }))
  return { ...level, content: emptyContent(), summary: '', covers: [], chapters, activationEnabled: identity.mode === 'child', revision: null }
}
export function mockPreviewActivation(identity, code, levelId) {
  const level = mockLevelDetail(identity, levelId)
  if (identity.mode !== 'child') throw new Error('请先选择需要激活的会员')
  if (level.unlocked) throw new Error('该会员已解锁此等级')
  const legacyNumber = Number(/^DEMO-L(10|[1-9])$/.exec(code)?.[1])
  const codeTier = /^DEMO-T([1-3])$/.exec(code)?.[1] || (legacyNumber ? legacyNumber === 1 ? 1 : legacyNumber < 6 ? 2 : 3 : null)
  if (Number(codeTier) !== level.tier) throw new Error('激活码无效或不适用于此会员等级')
  if (accountState(identity.accountId).codes.has(code)) throw new Error('该激活码已使用')
  return { code, levelId, levelName: level.name, membershipTier: level.tier, membershipName: level.tierName, memberId: identity.memberId, memberName: identity.name }
}
export const mockAnnouncements = [
  { id: 'notice-learning', title: '本周学习安排', summary: '请按目录完成当前等级的图文和视频练习。', publishedAtLabel: '2026.10.20' },
  { id: 'notice-rights', title: '会员权益更新', summary: '等级权益说明由后台发布，这里只保留公告框架。', publishedAtLabel: '2026.10.08' },
  { id: 'notice-service', title: '服务时间提示', summary: '如需激活会员，请联系所属门店获取激活码。', publishedAtLabel: '2026.09.18' },
]
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
  const level = mockLevels(identity).find(item => item.id === levelId)
  const unlockedLevelIds = mockLevels(identity).filter(item => item.tier === level.tier).map(item => item.id)
  unlockedLevelIds.forEach(id => grants.add(id)); state.grants.set(identity.memberId, grants); state.codes.set(code, identity.memberId)
  const result = { activationId: `demo-activation-${state.operations.size + 1}`, levelId, membershipTier: level.tier, unlockedLevelIds, expiresAt: null, memberId: identity.memberId }
  state.operations.set(idempotencyKey, { payload, result })
  uni.setStorageSync(`naoshang-mock-grants:${identity.accountId}`, { grants: [...state.grants].map(([id, levels]) => [id, [...levels]]), codes: [...state.codes], operations: [...state.operations] })
  return result
}
