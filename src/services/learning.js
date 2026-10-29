import { config } from '../config'
import { getSession, request } from './api'
import { normalizeContent, isMediaUrl } from '../features/content/rich-content'
import { mockIdentities, mockLevels, mockLevelDetail, mockPreviewActivation, mockActivate, mockAnnouncements } from './mock/learning'
import { mockSaveChapterProgress } from './mock/learning-progress'
import { getColumn } from './commerce'

const selectionKey = userId => `naoshang-learning-identity:${userId}`
function user() {
  const current = getSession()?.user
  if (!current?.id) throw new Error('请先登录')
  return { ...current, sessionToken: getSession()?.token }
}
export async function getLearningIdentities() {
  const current = user()
  const rows = config.useMock ? mockIdentities(current) : (await request('/me/bootstrap')).contexts
  if (getSession()?.user?.id !== current.id || getSession()?.token !== current.sessionToken) throw new Error('登录账号已变化，请刷新后重试')
  if (!Array.isArray(rows)) throw new Error('身份数据格式异常')
  return rows.filter(item => item.accountId === current.id && ['parent', 'child'].includes(item.mode) && (item.mode !== 'child' || item.memberId))
}
// TODO(API): progress is scoped to the authenticated parent's child, level and
// chapter. The API must independently validate ownership and course entitlement.
export async function saveLearningProgress(query, update) {
  const session = user()
  if (!query?.chapterId || (query.columnId ? query.levelId || query.contextId : !query.contextId || !query.levelId)) throw new Error('缺少或混用了课程身份信息')
  const isColumn = Boolean(query.columnId)
  const detail = isColumn ? await getColumn(query.columnId) : await getLearningLevelDetail(query.contextId, query.levelId)
  const chapter = detail.chapters.find(item => item.id === query.chapterId && (isColumn || item.accessible))
  if ((!isColumn && detail.identity.mode !== 'child') || !detail.unlocked || !chapter) throw new Error('无权记录该课程进度')
  if (getSession()?.user?.id !== session.id || getSession()?.token !== session.sessionToken) throw new Error('登录账号已变化，请重新加载')
  const payload = { positionSeconds: update.positionSeconds ?? 0, durationSeconds: update.durationSeconds ?? 0, completed: chapter.type === 'article' && update.completed === true, ended: chapter.type === 'video' && update.ended === true }
  if (![payload.positionSeconds, payload.durationSeconds].every(value => Number.isFinite(value) && value >= 0)) throw new Error('学习进度数据无效')
  const progressIdentity = isColumn ? { accountId: session.id, memberId: 'account-column' } : detail.identity
  const scopeId = isColumn ? `column:${query.columnId}` : query.levelId
  // Proposed API: the same payload/reader flow; account columns never inherit a selected child.
  const result = config.useMock ? mockSaveChapterProgress(progressIdentity, scopeId, chapter, payload) : await request(isColumn ? `/columns/${encodeURIComponent(query.columnId)}/learning-progress` : `/members/${encodeURIComponent(detail.identity.memberId)}/learning-progress`, { method: 'PUT', data: { ...payload, ...(isColumn ? { columnId: query.columnId } : { contextId: query.contextId, levelId: query.levelId }), chapterId: chapter.id } })
  if (getSession()?.user?.id !== session.id || getSession()?.token !== session.sessionToken) throw new Error('登录账号已变化，请重新加载')
  return result
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
  const session = user()
  const current = await identity(context.id)
  const result = config.useMock ? mockLevels(current) : await request(current.mode === 'child' ? `/members/${encodeURIComponent(current.memberId)}/levels` : '/learning/levels')
  const levels = config.useMock ? result : result.levels
  if (getSession()?.user?.id !== current.accountId || getSession()?.token !== session.sessionToken) throw new Error('登录账号已变化，请刷新后重试')
  if (!Array.isArray(levels)) throw new Error('等级数据格式异常')
  return levels.map(item => ({ ...item, unlocked: current.mode === 'child' && (item.membershipUnlocked ?? item.unlocked) === true }))
}
export async function getLearningLevelDetail(contextId, levelId) {
  const session = user()
  const current = await identity(contextId)
  const result = config.useMock ? mockLevelDetail(current, levelId) : await request(`/learning/levels/${encodeURIComponent(levelId)}`, { data: { memberId: current.memberId } })
  if (getSession()?.user?.id !== current.accountId || getSession()?.token !== session.sessionToken) throw new Error('登录账号已变化，请刷新后重试')
  if (!result?.id || typeof (result.membershipUnlocked ?? result.unlocked) !== 'boolean' || !Array.isArray(result.chapters)) throw new Error('等级详情格式异常')
  const unlocked = current.mode === 'child' && (result.membershipUnlocked ?? result.unlocked) === true
  return { ...result, chapters: result.chapters.map(chapter => ({ ...chapter, accessible: unlocked && chapter.accessible === true, progress: current.mode === 'child' ? chapter.progress || null : null })), unlocked, content: normalizeContent(result.content), covers: (result.covers || []).filter(isMediaUrl), identity: current }
}
export async function getAnnouncements(cursor = null) {
  user()
  const current = user()
  const reads = uni.getStorageSync(`naoshang-announcement-reads:${current.id}`) || {}
  const result = config.useMock ? { items: mockAnnouncements.map(({ id, title, summary, publishedAtLabel, pinned }) => ({ id, title, summary, publishedAtLabel, pinned: !!pinned, read: !!reads[id] })).sort((a,b)=>Number(b.pinned)-Number(a.pinned)), nextCursor: null, hasMore: false } : await request('/announcements', { data: { cursor, pageSize: 20 } })
  if (result == null || result.items == null) return { ...(result || {}), items: [], hasMore: false, nextCursor: null }
  if (!Array.isArray(result.items)) throw new Error('公告数据格式异常')
  if (result.hasMore != null && typeof result.hasMore !== 'boolean') throw new Error('公告数据格式异常')
  return { ...result, hasMore: result.hasMore === true, nextCursor: result.nextCursor || null }
}
// Proposed idempotent read receipt. Targeting and scheduled publication are enforced by API.
export async function markAnnouncementRead(id){
  const current=user()
  if(!id)throw new Error('缺少公告编号')
  if(!config.useMock)return request(`/announcements/${encodeURIComponent(id)}/read`,{method:'PUT'})
  await getAnnouncement(id)
  if(getSession()?.user?.id!==current.id||getSession()?.token!==current.sessionToken)throw new Error('登录账号已变化')
  const key=`naoshang-announcement-reads:${current.id}`,reads=uni.getStorageSync(key)||{}
  uni.setStorageSync(key,{...reads,[id]:reads[id]||new Date().toISOString()});return {read:true}
}
export async function getAnnouncement(id) {
  user()
  if (!id) throw new Error('该公告不存在或已下线')
  if (config.useMock) {
    const item = mockAnnouncements.find(entry => entry.id === id)
    if (!item) throw new Error('该公告不存在或已下线')
    return { ...item, content: normalizeContent({ version: 1, format: 'nodes', nodes: [{ name: 'p', children: [{ type: 'text', text: item.summary }] }] }) }
  }
  const result = await request(`/announcements/${encodeURIComponent(id)}`)
  if (!result?.id || !result.title) throw new Error('公告详情格式异常')
  return { ...result, content: normalizeContent(result.content) }
}
export async function previewLevelActivation(contextId, code, levelId) {
  const current = await identity(contextId)
  if (current.mode !== 'child') throw new Error('请先选择需要激活的会员')
  if (!code.trim()) throw new Error('请输入激活码')
  if(config.useMock)return mockPreviewActivation(current, code.trim(), levelId)
  const detail=await getLearningLevelDetail(contextId,levelId)
  const tierId=detail.membershipTierId ?? detail.tier
  if(tierId==null)throw new Error('会员等级信息缺失，请联系门店')
  return request('/activations/preview', { method: 'POST', data: { code: code.trim(), memberId: current.memberId, targetType: 'membership-tier', targetId: tierId } })
}
export async function activateLearningLevel(contextId, payload) {
  const current = await identity(contextId)
  if (current.mode !== 'child') throw new Error('请先选择需要激活的会员')
  if (!payload.idempotencyKey) throw new Error('缺少请求编号，请重试')
  if(config.useMock)return mockActivate(current,payload)
  const detail=await getLearningLevelDetail(contextId,payload.levelId)
  const tierId=detail.membershipTierId ?? detail.tier
  if(tierId==null)throw new Error('会员等级信息缺失，请联系门店')
  return request('/activations', { method: 'POST', data: { code: payload.code, memberId: current.memberId, targetType: 'membership-tier', targetId: tierId, idempotencyKey: payload.idempotencyKey } })
}
