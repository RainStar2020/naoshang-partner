// MOCK-ONLY / TODO(API): remove this adapter when the member progress API is connected.
const key = identity => `naoshang-mock-learning-progress:${identity.accountId}:${identity.memberId}`
export function mockChapterProgress(identity, levelId, chapterId) {
  return uni.getStorageSync?.(key(identity))?.[`${levelId}/${chapterId}`] || null
}
export function mockSaveChapterProgress(identity, levelId, chapter, update) {
  const records = { ...(uni.getStorageSync?.(key(identity)) || {}) }, id = `${levelId}/${chapter.id}`
  const old = records[id] || { percent: 0, positionSeconds: 0, maxPositionSeconds: 0, durationSeconds: 0, completed: false }
  const duration = update.durationSeconds || old.durationSeconds
  const position = Math.min(update.positionSeconds || 0, duration || Infinity)
  const maxPosition = Math.max(old.maxPositionSeconds, position)
  const completed = old.completed || (chapter.type === 'article' ? update.completed === true : update.ended === true && duration > 0 && position >= duration - .5)
  const percent = completed ? 100 : Math.max(old.percent, duration ? Math.min(99, Math.floor(maxPosition / duration * 100)) : 0)
  const result = { percent, positionSeconds: chapter.type === 'video' ? position : 0, maxPositionSeconds: maxPosition, durationSeconds: duration, completed, lastStudiedAt: new Date().toISOString() }
  records[id] = result; uni.setStorageSync(key(identity), records)
  return result
}
