import { config } from '../config'
import * as api from './api'
import { mockBoundStore, mockProfileState, copy } from './mock/profile'
import { ensureRegionNames } from '../features/region'
import { MOCK_PARTNER_AGENCY_PROMOTION_CODE, withNormalizedAgencyPromotionCode } from './agency-promotion-code'
import { storeDisplayAddress, storeFeeAmount, storePhotoUrl } from '../features/store-display'

// Session-scoped cache for GET /me (profile + bound store + exclusiveAccess).
let meCache = null
const ALL_CHILD_MODULES = ['member', 'training', 'learning', 'feedback', 'course-levels', 'edit']

export function normalizeChildModuleAccess(value) {
  const source = value && typeof value === 'object' ? value : null
  if (!source) return { open: true, allowedModules: ALL_CHILD_MODULES, lockedModules: [], reason: '' }
  const allowedModules = Array.isArray(source.allowedModules) ? source.allowedModules.map(String) : []
  const lockedModules = Array.isArray(source.lockedModules) ? source.lockedModules.map(String) : ALL_CHILD_MODULES.filter(item => !allowedModules.includes(item))
  return { ...source, open: source.open === true, allowedModules, lockedModules, reason: String(source.reason || '') }
}

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
    displayId: String(profile?.displayId || user?.displayId || ''),
    regionCodes,
    regionNames: ensureRegionNames(regionCodes, profile?.regionNames),
    ...(inviteCode ? { inviteCode } : {}),
  }
}

function normalizeMeStore(store) {
  if (!store || typeof store !== 'object' || store.id == null || store.id === '') return null
  const manager = store.manager && typeof store.manager === 'object' ? store.manager : null
  return {
    ...store,
    id: String(store.id),
    name: String(store.name || store.storeName || ''),
    number: String(store.number || store.storeNo || store.storeCode || ''),
    address: String(store.address || store.storeAddress || ''),
    fullAddress: String(storeDisplayAddress(store) || ''),
    managerName: String(store.managerName || manager?.name || ''),
    managerPhone: String(store.managerPhone || store.phone || manager?.phone || ''),
    phone: String(store.phone || store.managerPhone || manager?.phone || ''),
    coverUrl: String(storePhotoUrl(store) || ''),
    storefrontUrl: String(store.storefrontUrl || storePhotoUrl(store) || ''),
    storefrontAssetId: String(store.storefrontAssetId || ''),
    feeAmount: storeFeeAmount(store),
    regionNames: Array.isArray(store.regionNames) ? store.regionNames : [],
    regionCodes: Array.isArray(store.regionCodes) ? store.regionCodes : [],
    isHeadquarters: store.isHeadquarters === true,
    boundAt: store.boundAt ?? null,
  }
}

function normalizeMePayload(result, user) {
  const identity = result?.identity && typeof result.identity === 'object' ? result.identity : {}
  const rawProfile = result?.profile && typeof result.profile === 'object' ? result.profile : { ...identity, id: identity.id || user.id }
  if (!result || typeof result !== 'object' || rawProfile.id !== user.id) {
    throw new Error('个人资料格式异常')
  }
  const normalized = withNormalizedAgencyPromotionCode({
    ...result,
    profile: normalizeProfile(rawProfile, user),
    identity: { ...identity, childModuleAccess: normalizeChildModuleAccess(identity.childModuleAccess) },
    store: normalizeMeStore(result.store),
  })
  return normalized
}

function mockMePayload(user) {
  return {
    profile: copy(mockProfileState(user).profile),
    store: mockBoundStore(),
    orderCounts: { pendingPayment: 0, waitingShipment: 0, waitingReceipt: 0, completed: 0 },
    support: { phone: '', description: '' },
    exclusiveAccess: {
      accountId: user.id,
      contextId: `partner:${user.id}`,
      capabilities: ['agency-code:read', 'family-members:manage'],
    },
    agencyPromotionCode: MOCK_PARTNER_AGENCY_PROMOTION_CODE,
    identity: {
      isVipPlus: 1,
      canOpenEntitlement: 1,
      childModuleAccess: normalizeChildModuleAccess(null),
      agencyPromotionCode: MOCK_PARTNER_AGENCY_PROMOTION_CODE,
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

export async function requireChildModule(moduleId) {
  const access = normalizeChildModuleAccess((await loadMeContext()).identity?.childModuleAccess)
  if (access.open || access.allowedModules.includes(moduleId)) return access
  const error = new Error(access.reason || '普通用户仅可使用「会员」功能；升级为 VIP 及以上后开放其它功能')
  error.code = 'MEMBER_MODULE_ONLY'
  error.childModuleAccess = access
  throw error
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
