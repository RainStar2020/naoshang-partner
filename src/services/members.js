import {mockOrders} from './mock/commerce'
import {mockFeedbackList,mockFeedback} from './mock/training'
import { config } from '../config'
import { request, getSession } from './api'
import { listResult } from './exclusive'
import { mockFamily, persistMockFamily, memberDictionaries } from './mock/family'
import { mockProfileState } from './mock/profile'
import { mockLevels, mockPreviewActivation, mockActivate, mockMemberBadge } from './mock/learning'
import { normalizeContent } from '../features/content/rich-content'
const copy = value => JSON.parse(JSON.stringify(value))
async function scoped(operation) {
  const user = { ...getSession()?.user }
  if (!user.id) throw new Error('请先登录')
  const result = await operation(user)
  if (getSession()?.user?.id !== user.id) throw new Error('登录账号已变化，请重新加载')
  return result
}
function ownedMember(user, id) {
  const member = mockFamily(user).members.find(item => item.id === id)
  if (!member) throw new Error('会员不存在或无权访问')
  return member
}
const identity = (user, member) => ({ id: member.contextId, accountId: user.id, memberId: member.id, mode: 'child', name: member.name })
export function getMemberDictionaries() {
  return scoped(() => config.useMock ? copy(memberDictionaries) : request('/members/options'))
}
export function getFamilyMembers(cursor = null) {
  return scoped(async user => {
    const result = config.useMock ? { items: copy(mockFamily(user).members).map(member => ({ ...member, badge: mockMemberBadge(user,member), levels: mockLevels(identity(user,member)) })), nextCursor: null, hasMore: false } : await request('/members', { data: { cursor, pageSize: 20, scope: 'family' } })
    return listResult(result)
  })
}
export function saveFamilyMember(id, draft) {
  return scoped(async user => {
    const name = String(draft.name || '').trim()
    if (!name || Array.from(name).length > 24) throw new Error('请输入1–24字会员姓名')
    if (!draft.gradeCode || !draft.genderCode) throw new Error('请选择年级和性别')
    if (!id && !draft.idempotencyKey) throw new Error('缺少提交编号，请重新打开会员表单')
    const payload = { name, gradeCode: draft.gradeCode, genderCode: draft.genderCode, avatarAssetId: draft.avatarAssetId || undefined, version: draft.version, idempotencyKey: id ? undefined : draft.idempotencyKey }
    if (!config.useMock) return request(id ? `/members/${encodeURIComponent(id)}` : '/members', { method: id ? 'PATCH' : 'POST', data: payload })
    const family = mockFamily(user), old = id ? ownedMember(user,id) : null
    const fingerprint = JSON.stringify({ name, gradeCode: draft.gradeCode, genderCode: draft.genderCode, avatarAssetId: draft.avatarAssetId || null })
    const previous = !id && family.operations.get(draft.idempotencyKey)
    if (previous) { if (previous.fingerprint !== fingerprint) throw new Error('重复提交参数不一致'); return copy(previous.result) }
    if (old && old.version !== draft.version) throw new Error('会员资料已更新，请关闭后重新编辑')
    const grade = memberDictionaries.grades.find(item => item.code === draft.gradeCode), gender = memberDictionaries.genders.find(item => item.code === draft.genderCode)
    if (!grade || !gender) throw new Error('年级或性别选项已失效')
    const avatar = draft.avatarAssetId ? mockProfileState(user).assets.get(draft.avatarAssetId) : null
    if (draft.avatarAssetId && avatar?.purpose !== 'member-avatar') throw new Error('会员头像已失效，请重新选择')
    const number = old ? null : family.nextId++
    const result = { ...(old || { id: `demo-${user.id}-${number}`, contextId: `child:${user.id}:${number}`, displayId: `DEMO${String(number).padStart(3,'0')}`, badge: '未激活会员', training: null, selfStudyNote: '', campNote: '', remark: '' }), name, gradeCode: grade.code, gradeLabel: grade.label, genderCode: gender.code, genderLabel: gender.label, avatarUrl: avatar?.previewUrl || old?.avatarUrl || '', version: (old?.version || 0) + 1 }
    if (old) family.members[family.members.indexOf(old)] = result; else family.members.push(result)
    const response = { member: copy(result), mockOnly: true }
    if (!id) family.operations.set(draft.idempotencyKey, { fingerprint, result: copy(response) })
    persistMockFamily(user)
    return response
  })
}
export function previewMemberActivation(memberId, code) {
  return scoped(async user => {
    const value = String(code || '').trim()
    if (!value) throw new Error('请输入激活码')
    if (!config.useMock) return request('/activations/preview', { method: 'POST', data: { memberId, code: value } })
    const member = ownedMember(user,memberId), tier = Number(/^DEMO-T([1-3])$/.exec(value)?.[1]), number = /^DEMO-L(10|[1-9])$/.exec(value)?.[1] || ({1:1,2:2,3:6})[tier]
    if (!number) throw new Error('演示会员激活码为DEMO-T1至DEMO-T3')
    const result = mockPreviewActivation(identity(user,member), value, `level-${number}`)
    return { ...result, targetType: 'membership-tier', targetId: result.membershipTier, mockOnly: true }
  })
}
export function activateFamilyMember(memberId, preview, idempotencyKey) {
  return scoped(async user => {
    if (preview?.memberId !== memberId || !idempotencyKey || !preview.targetId || !preview.code) throw new Error('激活预览已失效，请重新校验')
    if (!config.useMock) return request('/activations', { method: 'POST', data: { memberId, code: preview.code, targetType: preview.targetType, targetId: preview.targetId, idempotencyKey } })
    const member = ownedMember(user,memberId)
    return { ...mockActivate(identity(user,member), { code: preview.code, levelId: preview.levelId, idempotencyKey }), mockOnly: true }
  })
}
export function getMemberRecords(memberId, kind, cursor = null) {
  if (!['orders','training','self-study','camp'].includes(kind)) throw new Error('记录类型无效')
  return scoped(async user => {
    if (config.useMock) { ownedMember(user,memberId); return kind==='orders'?mockOrders(user,{memberId}):mockFeedbackList(user,memberId,kind) }
    return listResult(await request(kind === 'orders' ? `/members/${encodeURIComponent(memberId)}/orders` : `/members/${encodeURIComponent(memberId)}/training-feedback`, { data: { kind: kind === 'orders' ? undefined : kind, cursor, pageSize: 20 } }))
  })
}
export function getMemberFeedback(memberId, feedbackId) {
  return scoped(async user => {
    if (config.useMock) { ownedMember(user,memberId); return mockFeedback(user,memberId,feedbackId) }
    const result = await request(`/training-feedback/${encodeURIComponent(feedbackId)}`, { data: { memberId } })
    if (result?.memberId !== memberId) throw new Error('反馈会员身份不匹配')
    return { ...result, content: normalizeContent(result.content) }
  })
}
