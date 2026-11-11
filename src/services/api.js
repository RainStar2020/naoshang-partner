import { config } from '../config'
import { clearMeContext, loadMeContext } from './me-context'
import { bumpDataFreshness } from './freshness'
import { clearPrefetchState, prefetchAfterAuth, scheduleIdle } from './prefetch'
import { clearWholesaleBenefitCatalogCache } from './partner-catalog'
const SESSION_KEY = 'naoshang-session'
export const INVITE_CODE_CACHE_KEY = 'naoshang-personal-invite-code'
const DEFAULT_GET_TTL_MS = 30000
const ENTITLEMENT_GATE_EXEMPT_PATHS = new Set([
  '/partner/superior',
  '/partner/superior-bindings',
  '/partner/superior-bindings/unbind',
])
const skipsEntitlementGate = path => ENTITLEMENT_GATE_EXEMPT_PATHS.has(String(path).split('?')[0])
// One shared result (including concurrent callers) per authenticated session.
let bootstrapCache = null
/** In-memory GET cache: key -> { promise } | { value, expiresAt } */
const getRequestCache = new Map()
export function clearBootstrapCache() { bootstrapCache = null }
export function clearGetRequestCache() { getRequestCache.clear() }

/**
 * Drop GET cache entries whose request path matches any prefix.
 * Match rule: exact path or path starts with `${prefix}/`.
 * @param {string|string[]} prefixes
 * @returns {number} removed entry count
 */
export function invalidateGetRequestCache(prefixes = []) {
  const list = (Array.isArray(prefixes) ? prefixes : [prefixes])
    .map(item => String(item || '').split('?')[0].trim())
    .filter(Boolean)
  if (!list.length) return 0
  let removed = 0
  for (const key of [...getRequestCache.keys()]) {
    let requestPath = ''
    try {
      requestPath = String(JSON.parse(key)?.[1] || '')
    } catch {
      continue
    }
    const bare = requestPath.split('?')[0]
    if (!bare) continue
    if (list.some(prefix => bare === prefix || bare.startsWith(`${prefix}/`))) {
      getRequestCache.delete(key)
      removed += 1
    }
  }
  return removed
}

/** Map a mutating request path to cache invalidation scope. Unmapped → clear all. */
export function resolveMutationCachePlan(path) {
  const bare = String(path || '').split('?')[0]
  if (!bare || bare === '/auth' || bare.startsWith('/auth/')) {
    return { clearAll: true }
  }
  if (bare.startsWith('/partner/')) {
    return { prefixes: ['/partner', '/me/bootstrap'], clearBootstrap: true }
  }
  if (bare.startsWith('/agency/')) {
    return { prefixes: ['/agency', '/me/bootstrap'], clearBootstrap: true }
  }
  if (bare.startsWith('/costore/')) {
    return { prefixes: ['/costore', '/me/bootstrap'], clearBootstrap: true }
  }
  if (bare.startsWith('/income/')) {
    return { prefixes: ['/income', '/agency', '/partner'] }
  }
  if (bare.startsWith('/wallet/')) {
    return { prefixes: ['/wallet', '/partner', '/costore', '/agency'] }
  }
  if (bare === '/stores' || bare.startsWith('/stores/')) {
    return { prefixes: ['/stores', '/agency', '/me/bootstrap'], clearBootstrap: true }
  }
  if (bare.startsWith('/store-bindings') || bare.startsWith('/store-transfer') || bare.startsWith('/partner/store-binding')) {
    return { prefixes: ['/partner', '/me', '/me/bootstrap'], clearBootstrap: true, clearMe: true }
  }
  if (bare.startsWith('/orders') || bare.startsWith('/payments') || bare.startsWith('/checkout')) {
    return { prefixes: ['/orders', '/products', '/me'] }
  }
  if (bare.startsWith('/applications')) {
    return { prefixes: ['/applications', '/costore', '/agency', '/me/bootstrap'], clearBootstrap: true }
  }
  if (bare === '/me' || bare.startsWith('/me/')) {
    return { prefixes: ['/me', '/me/bootstrap'], clearBootstrap: true, clearMe: true }
  }
  if (bare.startsWith('/members') || bare.startsWith('/activations') || bare.startsWith('/training')) {
    return { prefixes: ['/members', '/me'], clearMe: true }
  }
  if (bare.startsWith('/addresses')) {
    return { prefixes: ['/addresses', '/me'], clearMe: true }
  }
  if (bare.startsWith('/materials')) {
    return { prefixes: ['/materials'] }
  }
  if (bare.startsWith('/assets') || bare.startsWith('/support/')) {
    return { prefixes: [] }
  }
  // Conservative default: unknown writes still flush the whole GET table.
  return { clearAll: true }
}

function applyMutationCacheInvalidation(path) {
  const plan = resolveMutationCachePlan(path)
  if (plan.clearAll) {
    clearGetRequestCache()
    clearBootstrapCache()
    clearMeContext()
  } else {
    if (plan.prefixes?.length) invalidateGetRequestCache(plan.prefixes)
    if (plan.clearBootstrap) clearBootstrapCache()
    if (plan.clearMe) clearMeContext()
  }
  bumpDataFreshness()
}

export function clearSessionCaches() {
  clearBootstrapCache()
  clearMeContext()
  clearGetRequestCache()
  clearPrefetchState()
  bumpDataFreshness()
}
export function getBootstrap() { return request('/me/bootstrap') }

function requestMethod(options = {}) {
  return String(options.method || 'GET').toUpperCase()
}

function getCacheKey(path, options = {}, session = getSession()) {
  return JSON.stringify([
    requestMethod(options),
    String(path || ''),
    options.data ?? null,
    session?.user?.id || '',
    session?.token || '',
  ])
}

/** Resolve TTL for GET caching. 0 disables cache for this call. */
function resolveGetCacheTtl(path, options = {}) {
  if (options.cache === false || options.cacheTtl === 0) return 0
  if (Number.isFinite(options.cacheTtl)) return Math.max(0, Number(options.cacheTtl))
  const bare = String(path || '').split('?')[0]
  if (
    bare.startsWith('/auth/')
    || bare.startsWith('/payment/')
    || bare.includes('/checkout/')
    || /\/quotes$/.test(bare)
    || bare.includes('cashier')
  ) return 0
  if (bare === '/api/hq/region-agents/check') return 10000
  return DEFAULT_GET_TTL_MS
}

function cachedGetRequest(path, options = {}) {
  const ttl = resolveGetCacheTtl(path, options)
  if (ttl <= 0) return sendRequest(path, options)
  const session = getSession()
  const key = getCacheKey(path, options, session)
  const now = Date.now()
  const hit = getRequestCache.get(key)
  if (hit && Object.hasOwn(hit, 'value') && hit.expiresAt > now) return Promise.resolve(hit.value)
  if (hit?.promise) return hit.promise
  const entry = { promise: null, expiresAt: 0 }
  entry.promise = sendRequest(path, options).then(result => {
    getRequestCache.set(key, { value: result, expiresAt: Date.now() + ttl })
    return result
  }).catch(error => {
    if (getRequestCache.get(key)?.promise === entry.promise) getRequestCache.delete(key)
    throw error
  })
  getRequestCache.set(key, entry)
  return entry.promise
}
export function normalizeEntitlementOpened(value, state) {
  if (value === 0 || value === '0') return 0
  if (value === 1 || value === '1') return 1
  if (['never_paid', 'active', 'expired'].includes(state)) return state === 'active' ? 1 : 0
  // Legacy accounts without entitlement_state are active by the server contract.
  return 1
}
export function normalizeEntitlement(entitlement) {
  const source = entitlement && typeof entitlement === 'object' ? entitlement : {}
  return {
    ...source,
    amount: Number.isFinite(Number(source.amount)) ? Number(source.amount) : 200,
    entitlementOpened: normalizeEntitlementOpened(source.entitlementOpened, source.state),
    canOpen: source.canOpen === true || source.canOpen === 1 || source.canOpen === '1',
    displayOnly: source.displayOnly === true || source.displayOnly === 1 || source.displayOnly === '1',
  }
}

export const getSession = () => {
  const session = uni.getStorageSync(SESSION_KEY) || null
  if (config.useMock && session?.user?.id === 'LC0001') session.user = { ...session.user, id: 'VIP0001', displayId: 'VIP0001' }
  if (session) session.entitlement = normalizeEntitlement(session.entitlement)
  return session
}
export const logout = async ({ revoke = true } = {}) => {
  const session = getSession()
  const accountId = session?.user?.id
  const revokePromise = revoke && !config.useMock && session?.token
    ? request('/auth/sessions/current', {
      method: 'DELETE',
      header: { Authorization: `Bearer ${session.token}` },
    }).catch(() => undefined)
    : null

  // Local logout must not wait for a slow or unavailable revoke endpoint.
  clearSessionCaches()
  clearWholesaleBenefitCatalogCache()
  if (accountId) uni.removeStorageSync(`naoshang-learning-identity:${accountId}`)
  uni.removeStorageSync(INVITE_CODE_CACHE_KEY)
  uni.removeStorageSync(SESSION_KEY)
  uni.reLaunch({ url: '/pages/login/index' })
  void revokePromise
  return true
}
function normalizePersonalInviteCode(result) {
  const inviteCode = String(result?.inviteCode || '').trim().toUpperCase()
  if (!/^[0-9A-HJKMNP-Z]{6}$/.test(inviteCode)) throw new Error('个人邀请码数据异常')
  const qrContent = String(result?.qrContent || result?.inviteLink || '').trim()
  if (!qrContent) throw new Error('邀请码链接数据异常')
  return { ...result, inviteCode, qrContent, inviteLink: String(result.inviteLink || qrContent) }
}
export async function cacheMyInviteCode(session = getSession()) {
  if (!session?.user?.id) throw new Error('请先登录')
  const result = config.useMock
    ? { inviteCode: '3RNV3F', inviteLink: 'http://localhost:5173/#/pages/register/index?invite=3RNV3F', h5BaseUrl: 'http://localhost:5173' }
    : await request('/me/invite-code')
  if (getSession()?.token !== session.token || getSession()?.user?.id !== session.user.id) throw new Error('登录账号已变化')
  const invite = normalizePersonalInviteCode(result)
  uni.setStorageSync(INVITE_CODE_CACHE_KEY, { accountId: session.user.id, ...invite })
  return invite
}
export function getCachedMyInviteCode() {
  const session = getSession(), cached = uni.getStorageSync(INVITE_CODE_CACHE_KEY)
  if (!session?.user?.id || cached?.accountId !== session.user.id) return null
  return cached
}
export function request(path, options = {}) {
  const method = requestMethod(options)
  if (path === '/me/bootstrap' && method === 'GET') {
    const session = getSession()
    if (!session?.token || !session?.user?.id) return Promise.reject(new Error('请先登录'))
    const key = JSON.stringify([session.user.id, session.token])
    if (bootstrapCache?.key === key) return bootstrapCache.promise
    const entry = { key, promise: null }
    bootstrapCache = entry
    entry.promise = sendRequest(path, options).then(result => {
      const current = getSession()
      if (bootstrapCache !== entry || current?.user?.id !== session.user.id || current?.token !== session.token) {
        throw new Error('登录状态已变化，请重新登录后继续')
      }
      return result
    }).catch(error => {
      if (bootstrapCache === entry) clearBootstrapCache()
      throw error
    })
    return entry.promise
  }
  if (method === 'GET') return cachedGetRequest(path, options)
  return sendRequest(path, options).then(result => {
    applyMutationCacheInvalidation(path)
    return result
  })
}
function sendRequest(path, options = {}) {
  if (!config.baseURL) return Promise.reject(new Error('服务暂不可用，请稍后重试'))
  return new Promise((resolve, reject) => uni.request({
    url: /^https?:\/\//i.test(path) ? path : config.baseURL + path, method: options.method || 'GET', data: options.data,
    timeout: config.timeout, header: { ...(getSession()?.token ? { Authorization: `Bearer ${getSession().token}` } : {}), ...options.header },
    success: res => {
      const body = res.data || {}
      const traceId = Object.entries(res.header || {}).find(([name]) => name.toLowerCase() === 'x-trace-id')?.[1]
      const isV2 = (body.status === 0 || body.status === 1) && Object.hasOwn(body, 'response')
      const rejectResponse = (message, extra = {}) => {
        const error = Object.assign(new Error(message), {
          statusCode: res.statusCode, code: body.code, requestId: body.requestId,
          traceId, errors: body.errors, fieldErrors: body.errors ?? body.fieldErrors,
          verifyFailCount: body.verifyFailCount, verifyLocked: body.verifyLocked,
          serverMessage: body.message || body.error, data: body,
          offlinePayHint: body.offlinePayHint, ...extra
        })
        console.error('API request failed', { path, statusCode: res.statusCode, code: body.code, traceId })
        reject(error)
      }
      if (res.statusCode === 401) { logout({ revoke: false }); rejectResponse(body.message || '登录已过期'); return }
      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (isV2) {
          if (body.status === 1) resolve(body.response)
          else rejectResponse(body.message || '请求未完成，请稍后重试')
          return
        }
        if (body.ok === false || body.success === false || (typeof body.code === 'number' && body.code !== 0)) {
          rejectResponse(body.message || body.error || '请求未完成，请稍后重试')
          return
        }
        // Bootstrap carries entitlement gates as normal account state. Rejecting
        // it here turns a successful login into a login failure for new users.
        if (res.data?.locked === true && res.data?.code === 'MEMBER_MODULE_ONLY') {
          reject(Object.assign(new Error(res.data.message || '当前账号仅可使用会员功能'), {
            statusCode: res.statusCode, code: 'MEMBER_MODULE_ONLY', data: res.data,
            childModuleAccess: { allowedModules: res.data.allowedModules || ['member'], lockedModules: res.data.lockedModules || [], open: false, reason: res.data.message || '' },
          }))
          return
        }
        if (path !== '/me/bootstrap' && !skipsEntitlementGate(path) && res.data?.locked === true && res.data?.entitlementState) {
          reject(Object.assign(new Error(res.data.message || res.data.error || '当前账号尚未开通此项权益，请先完成开通'), {
            statusCode: res.statusCode, code: 'ENTITLEMENT_REQUIRED',
            entitlementState: res.data.entitlementState, entitlement: normalizeEntitlement(res.data.entitlement)
          }))
          return
        }
        resolve(typeof body.code === 'number' && body.code === 0 && Object.hasOwn(body, 'data') ? body.data : res.data); return
      }
      const statusCode = res.statusCode
      const fallback = statusCode === 403 ? '暂无权限访问此内容' : statusCode === 404 ? '所需信息不存在或已更新，请刷新后重试' : statusCode === 408 || statusCode === 504 ? '请求超时，请稍后重试' : statusCode === 429 ? '操作过于频繁，请稍后再试' : statusCode >= 500 ? '服务暂时繁忙，请稍后再试' : '请求未完成，请检查填写内容后重试'
      const message = body.message || body.error || fallback
      rejectResponse(message)
    }, fail: error => reject(Object.assign(new Error('网络连接异常，请检查网络后重试'), { cause: error }))
  }))
}
export async function login(data) {
  if (config.useMock && data.channel === 'coach') throw new Error('请联系门店开通健脑官账号')
  const result = config.useMock ? { token: 'demo-local-token', user: { name: '脑商体验官', id: 'VIP0001', displayId: 'VIP0001', role: '家长' } } : await request('/auth/sessions', { method: 'POST', data })
  if (!result?.token || !result?.user?.id) throw new Error('登录未完成，请稍后重试')
  if (result.accountType && !['parent', 'coach'].includes(result.accountType)) throw new Error('当前账号暂不支持登录，请联系平台客服')
  const session = { ...result, entitlement: normalizeEntitlement(result.entitlement), accountType: result.accountType || 'parent' }
  uni.removeStorageSync(`naoshang-learning-identity:${session.user.id}`)
  clearSessionCaches()
  clearWholesaleBenefitCatalogCache()
  uni.setStorageSync(SESSION_KEY, session)
  // These requests enrich the session only. A gate or transient network error
  // must not turn an authenticated login into a failed login.
  try { await cacheMyInviteCode(session) }
  catch (error) { console.warn('[login] 邀请码缓存失败，已跳过：', error?.message || error) }
  try { await loadMeContext({ force: true }) }
  catch (error) { console.warn('[login] 个人中心预取失败，已跳过：', error?.message || error) }
  if (!config.useMock && session.accountType === 'parent') {
    try { await getBootstrap() }
    catch (error) { console.warn('[login] 首页数据预取失败，已跳过：', error?.message || error) }
  }
  // Warm partner/selection caches in idle time; never block login navigation.
  scheduleIdle(() => prefetchAfterAuth())
  return session
}
export const getLevels = () => config.useMock ? Promise.resolve(['超级记忆','实用记忆','语文系统','外语系统','百科系统','导图大师','速读大师','记忆大师','潜能开发','未来领袖'].map((name, i) => ({ id: i + 1, name, unlocked: false }))) : request('/member/levels')
export const getPartners = () => config.useMock ? Promise.resolve([{ title: '城市合伙人', desc: '连接优质教育资源，共建成长生态', tag: '合作共赢' }, { title: '学习中心', desc: '陪伴每一个家庭，发现更多可能', tag: '共同成长' }]) : request('/partners')
export const getProducts = () => config.useMock ? Promise.resolve([{ title: '记忆力启蒙体验课', type: '能力启蒙', desc: '从兴趣出发，开启记忆探索之旅' }, { title: '专注力成长计划', type: '成长训练', desc: '培养学习习惯，积累成长的力量' }]) : request('/products')
