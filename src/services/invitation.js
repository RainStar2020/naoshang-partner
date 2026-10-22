const KEY = 'naoshang-invitation'
const WEEK = 7 * 24 * 60 * 60 * 1000
function decode(value) { try { return decodeURIComponent(value) } catch { return value } }
export function parseParams(value) {
  const result = {}
  String(value || '').replace(/^[?#]/, '').split('&').forEach(part => {
    const index = part.indexOf('=')
    if (index > 0) result[decode(part.slice(0, index))] = decode(part.slice(index + 1))
  })
  return result
}
function findCode(query = {}, depth = 0) {
  if (depth > 3) return ''
  for (const key of ['inviteCode', 'invitationCode', 'invite', 'inviter']) {
    const code = String(query[key] || '').trim()
    if (/^[a-zA-Z0-9_-]{1,64}$/.test(code)) return code
  }
  for (const key of ['scene', 'q']) {
    if (!query[key]) continue
    const value = decode(String(query[key]))
    const nested = findCode(parseParams(value.includes('?') ? value.slice(value.lastIndexOf('?') + 1) : value), depth + 1)
    if (nested) return nested
    if (key === 'scene' && /^[a-zA-Z0-9_-]{1,64}$/.test(value)) return value
  }
  return ''
}
export function getInvitation() {
  const saved = uni.getStorageSync(KEY)
  if (saved && saved.expiresAt > Date.now()) return saved.code
  uni.removeStorageSync(KEY)
  return ''
}
export function captureInvitation(options = {}) {
  let code = findCode(options.query || options)
  // #ifdef H5
  code = findCode(parseParams(window.location.hash.split('?')[1])) || findCode(parseParams(window.location.search)) || code
  // #endif
  if (code) uni.setStorageSync(KEY, { code, expiresAt: Date.now() + WEEK })
  return code || getInvitation()
}
export function clearInvitation() {
  uni.removeStorageSync(KEY)
  // #ifdef H5
  const url = new URL(window.location.href)
  const keys = ['inviteCode', 'invitationCode', 'invite', 'inviter']
  keys.forEach(key => url.searchParams.delete(key))
  for (const key of ['scene', 'q']) if (findCode({ [key]: url.searchParams.get(key) })) url.searchParams.delete(key)
  const [path, query] = url.hash.split('?')
  const params = new URLSearchParams(query || '')
  keys.forEach(key => params.delete(key))
  for (const key of ['scene', 'q']) if (findCode({ [key]: params.get(key) })) params.delete(key)
  url.hash = path + (params.toString() ? '?' + params.toString() : '')
  window.history.replaceState(null, '', url.toString())
  // #endif
}
