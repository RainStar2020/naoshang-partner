import { config } from '../config'
import { getSession, request } from './api'
import { normalizeContent, isMediaUrl } from '../features/content/rich-content'
import { mockIdentities, mockLevels, mockLevelDetail, mockPreviewActivation, mockActivate } from './mock/learning'

const selectionKey = userId => `naoshang-learning-identity:${userId}`
function user() {
  const current = getSession()?.user
  if (!current?.id) throw new Error('请先登录')
  return { ...current }
}
export async function getLearningIdentities() {
  const current = user()
  const rows = config.useMock ? mockIdentities(current) : (await request('/me/bootstrap')).contexts
  if (getSession()?.user?.id !== current.id) throw new Error('登录账号已变化，请刷新后重试')
  if (!Array.isArray(rows)) throw new Error('身份数据格式异常')
  return rows.filter(item => item.accountId === current.id && ['parent', 'child'].includes(item.mode) && (item.mode !== 'child' || item.memberId))
}
export function getSelectedIdentity(identities) {
  const id = uni.getStorageSync(selectionKey(user().id))
  return identities.find(item => item.id === id) || identities.find(item => item.mode === 'parent') || null
}
export function selectLearningIdentity(id, identities) {
  const selected = identities.find(item => item.id === id && item.accountId === user().id)
  if (!selected) throw new Error('该身份已失效，请刷新后重试')
  uni.setStorageSync(selectionKey(user().id), selected.id)
  return selected
}
export function clearLearningIdentity(accountId) {
  if (accountId) uni.removeStorageSync(selectionKey(accountId))
}
async function identity(id) {
  const rows = await getLearningIdentities()
  const result = rows.find(item => item.id === id)
  if (!result) throw new Error('无权访问该会员，请重新选择身份')
  return result
}
export async function getLearningLevels(context) {
  const current = await identity(context.id)
  const result = config.useMock ? mockLevels(current) : await request(current.mode === 'child' ? `/members/${encodeURIComponent(current.memberId)}/levels` : '/learning/levels')
  const levels = config.useMock ? result : result.levels
  if (getSession()?.user?.id !== current.accountId) throw new Error('登录账号已变化，请刷新后重试')
  if (!Array.isArray(levels)) throw new Error('等级数据格式异常')
  return levels.map(item => ({ ...item, unlocked: current.mode === 'child' && item.unlocked === true }))
}
export async function getLearningLevelDetail(contextId, levelId) {
  const current = await identity(contextId)
  const result = config.useMock ? mockLevelDetail(current, levelId) : await request(`/learning/levels/${encodeURIComponent(levelId)}`, { data: { memberId: current.memberId } })
  if (getSession()?.user?.id !== current.accountId) throw new Error('登录账号已变化，请刷新后重试')
  if (!result?.id || typeof result.unlocked !== 'boolean' || !Array.isArray(result.chapters)) throw new Error('等级详情格式异常')
  return { ...result, unlocked: current.mode === 'child' && result.unlocked, content: normalizeContent(result.content), covers: (result.covers || []).filter(isMediaUrl), identity: current }
}
export async function getAnnouncements(cursor = null) {
  user()
  const result = config.useMock ? { items: [], nextCursor: null, hasMore: false } : await request('/announcements', { data: { cursor, pageSize: 20 } })
  if (!Array.isArray(result?.items)) throw new Error('公告数据格式异常')
  return result
}
export async function getAnnouncement(id) {
  user()
  if (!id || config.useMock) throw new Error('该公告不存在或已下线')
  const result = await request(`/announcements/${encodeURIComponent(id)}`)
  if (!result?.id || !result.title) throw new Error('公告详情格式异常')
  return { ...result, content: normalizeContent(result.content) }
}
export async function previewLevelActivation(contextId, code, levelId) {
  const current = await identity(contextId)
  if (current.mode !== 'child') throw new Error('请先选择需要激活的会员')
  if (!code.trim()) throw new Error('请输入激活码')
  return config.useMock ? mockPreviewActivation(current, code.trim(), levelId) : request('/activations/preview', { method: 'POST', data: { code: code.trim(), memberId: current.memberId, targetType: 'level', targetId: levelId } })
}
export async function activateLearningLevel(contextId, payload) {
  const current = await identity(contextId)
  if (current.mode !== 'child') throw new Error('请先选择需要激活的会员')
  if (!payload.idempotencyKey) throw new Error('缺少请求编号，请重试')
  return config.useMock ? mockActivate(current, payload) : request('/activations', { method: 'POST', data: { code: payload.code, memberId: current.memberId, targetType: 'level', targetId: payload.levelId, idempotencyKey: payload.idempotencyKey } })
}
