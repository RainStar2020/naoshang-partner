import { config } from '../config'
import * as api from './api'
import { mockBoundStore, mockProfileState, copy } from './mock/profile'
import { ensureRegionNames } from '../features/region'

// Session-scoped cache for GET /me (profile + bound store + exclusiveAccess).
let meCache = null

export function clearMeContext() {
  meCache = null
}

function resolveInviteCode(profile, user) {
  const cached = typeof api.getCachedMyInviteCode === 'function' ? api.getCachedMyInviteCode() : null
  const candidates = [profile?.inviteCode, user?.inviteCode, cached?.inviteCode]
  for (const value of candidates) {
    const code = String(value || '').trim()
    if (code) return code
  }
  return ''
}

function normalizeProfile(profile, user = api.getSession()?.user) {
  const regionCodes = Array.isArray(profile?.regionCodes) ? profile.regionCodes : []
  const inviteCode = resolveInviteCode(profile, user)
  return {
    ...profile,
    regionCodes,
    regionNames: ensureRegionNames(regionCodes, profile?.regionNames),
    ...(inviteCode ? { inviteCode } : {}),
  }
}

function normalizeMeStore(store) {
  if (!store || typeof store !== 'object' || store.id == null || store.id === '') return null
  const manager = store.manager && typeof store.manager === 'object' ? store.manager : null
  return {
    id: String(store.id),
    name: String(store.name || store.storeName || ''),
    number: String(store.number || store.storeNo || store.storeCode || ''),
    address: String(store.address || ''),
    managerName: String(store.managerName || manager?.name || ''),
    managerPhone: String(store.managerPhone || store.phone || manager?.phone || ''),
    phone: String(store.phone || store.managerPhone || manager?.phone || ''),
    coverUrl: String(store.coverUrl || store.imageUrl || ''),
  }
}

function normalizeMePayload(result, user) {
  if (!result || typeof result !== 'object' || result.profile?.id !== user.id) {
    throw new Error('个人资料格式异常')
  }
  return {
    ...result,
    profile: normalizeProfile(result.profile, user),
    store: normalizeMeStore(result.store),
  }
}

function mockMePayload(user) {
  return {
    profile: copy(mockProfileState(user).profile),
    store: mockBoundStore(),
    orderCounts: { pendingPayment: 0, waitingShipment: 0, waitingReceipt: 0, completed: 0 },
    support: { phone: '', description: '' },
    exclusiveAccess: {
      accountId: user.id,
      contextId: `account:${user.id}`,
      capabilities: ['agency-code:read', 'family-members:manage'],
    },
  }
}

export function getCachedMeContext() {
  const session = api.getSession()
  if (!session?.user?.id || !session?.token || !meCache) return null
  if (meCache.userId !== session.user.id || meCache.token !== session.token) return null
  return meCache.value
}

export function getCachedBoundStore() {
  return getCachedMeContext()?.store || null
}

/** Fetch GET /me once per session (shared by concurrent callers). Pass force to refresh. */
export function loadMeContext({ force = false } = {}) {
  const session = api.getSession()
  if (!session?.user?.id || !session?.token) return Promise.reject(new Error('请先登录'))
  const key = `${session.user.id}:${session.token}`
  if (!force && meCache?.key === key && meCache.promise) return meCache.promise
  if (!force && meCache?.key === key && meCache.value) return Promise.resolve(meCache.value)

  const entry = { key, userId: session.user.id, token: session.token, promise: null, value: null }
  meCache = entry
  entry.promise = Promise.resolve()
    .then(async () => {
      const raw = config.useMock ? mockMePayload(session.user) : await api.request('/me')
      const current = api.getSession()
      if (meCache !== entry || current?.user?.id !== session.user.id || current?.token !== session.token) {
        throw new Error('登录状态已变化，请重新登录后继续')
      }
      let payload = normalizeMePayload(raw, session.user)
      if (!payload.profile.inviteCode) {
        const invite = typeof api.getCachedMyInviteCode === 'function' ? api.getCachedMyInviteCode() : null
        if (invite?.inviteCode) payload = { ...payload, profile: { ...payload.profile, inviteCode: invite.inviteCode } }
      }
      entry.value = payload
      return payload
    })
    .catch(error => {
      if (meCache === entry) clearMeContext()
      throw error
    })
  return entry.promise
}

export function replaceMeContext(payload) {
  const session = api.getSession()
  if (!session?.user?.id || !session?.token || !payload?.profile?.id) return
  if (payload.profile.id !== session.user.id) return
  meCache = {
    key: `${session.user.id}:${session.token}`,
    userId: session.user.id,
    token: session.token,
    promise: Promise.resolve(payload),
    value: payload,
  }
}
