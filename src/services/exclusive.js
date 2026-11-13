import { config } from '../config'
import { request, getSession } from './api'
import { isCoachAccount } from './account-channel'
import { visibleExclusiveFeatures } from '../features/exclusive/catalog'
import { emptyContent, normalizeContent, isMediaUrl } from '../features/content/rich-content'
import { mockExclusiveState, saveMockExclusiveState, mockCostoreOptions, mockFounderAwards } from './mock/exclusive'
import { mockCostorePaymentOrder } from './mock/commerce'
import { buildAgencyApplicationUrl } from './agency-promotion-link'
import { getCachedMeContext, loadMeContext } from './me-context'
import { resolveAgencyPromotionCodeFromMe, MISSING_AGENCY_PROMOTION_CODE_MESSAGE } from './agency-promotion-code'
import { storeDisplayAddress, storeFeeAmount, storePhotoUrl } from '../features/store-display'
export { buildAgencyApplicationUrl } from './agency-promotion-link'
const copy = value => JSON.parse(JSON.stringify(value))
function coerceRichContent(value) {
  if (value == null) return emptyContent()
  if (typeof value === 'string') {
    const text = value.trim()
    if (!text) return emptyContent()
    return normalizeContent({ version: 1, format: 'nodes', nodes: [{ name: 'p', children: [{ type: 'text', text }] }] })
  }
  return normalizeContent(value)
}
function mapCostoreStore(store) {
  if (!store || typeof store !== 'object') return null
  const id = store.id || store.storeAgentId
  if (!id) return null
  return {
    ...store,
    id,
    name: store.name || '',
    number: store.number || store.storeCode || '',
    address: storeDisplayAddress(store) || store.address || '',
    coverUrl: storePhotoUrl(store),
    ownerLabel: store.ownerLabel || '',
    managerName: store.managerName || store.manager?.name || '',
    phone: store.phone || store.manager?.phone || store.contact || '',
    monthlyFee: storeFeeAmount(store) ?? 0,
  }
}
export function accountSnapshot() {
  const user = getSession()?.user
  if (!user?.id) throw new Error('请先登录')
  return { ...user }
}
export function checkAccount(user) { if (getSession()?.user?.id !== user.id) throw new Error('登录账号已变化，请重新加载') }
export function listResult(result) {
  if (result == null) return { items: [], hasMore: false, nextCursor: null }
  if (!Array.isArray(result.items)) {
    if (result.items == null) return { ...result, items: [], hasMore: false, nextCursor: null }
    throw new Error('列表数据格式异常')
  }
  if (result.hasMore == null) return { ...result, hasMore: false, nextCursor: null }
  if (typeof result.hasMore !== 'boolean' || (result.hasMore && (typeof result.nextCursor !== 'string' || !result.nextCursor))) throw new Error('列表数据格式异常')
  return result
}
export async function getExclusiveAccess(profileResult) {
  const user = accountSnapshot()
  let source = profileResult
  if (!source) source = getCachedMeContext() || await loadMeContext().catch(() => null)
  if (!source && !config.useMock) source = await request('/me')
  const result = config.useMock
    ? (source?.exclusiveAccess || { accountId: user.id, contextId: `partner:${user.id}`, capabilities: ['agency-code:read', 'family-members:manage'] })
    : source?.exclusiveAccess
  checkAccount(user)
  if (!result) return { accountId: user.id, contextId: null, capabilities: [] }
  if (result.accountId !== user.id || !Array.isArray(result.capabilities) || (result.capabilities.length && !result.contextId)) throw new Error('专属功能身份数据异常')
  const capabilities = [...result.capabilities]
  // Product: every logged-in account can manage their own family members.
  if (!capabilities.includes('family-members:manage')) capabilities.push('family-members:manage')
  // Temporary compatibility for deployments that have not yet added costore:apply
  // to /me. The fallback is deliberately gated by the server's tier verdict.
  const isVipPlus = source?.identity?.isVipPlus === true || Number(source?.identity?.isVipPlus) === 1
  if (isVipPlus && !capabilities.includes('costore:apply')) capabilities.push('costore:apply')
  return {
    ...result,
    capabilities,
    contextId: result.contextId || null,
  }
}
export async function withExclusive(featureId, operation) {
  const user = accountSnapshot(), access = await getExclusiveAccess()
  checkAccount(user)
  if (!visibleExclusiveFeatures(access, config).some(item => item.id === featureId)) {
    const message = featureId === 'costore-application'
      ? 'VIP（小批发商）及以上身份才可以使用该功能'
      : '当前身份暂不能使用此功能'
    const error = new Error(message); error.code = 'FORBIDDEN'; throw error
  }
  const result = await operation(user, access); checkAccount(user); return result
}
export function getVisibleExclusiveEntries(access) {
  const entries = visibleExclusiveFeatures(access, config)
  if (isCoachAccount(getSession())) return entries
  return entries.filter(item => item.id !== 'coach')
}
export function getFounderAwards(month, cursor = null) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('请选择有效月份')
  return withExclusive('founder-awards', async (_user, access) => listResult(config.useMock ? mockFounderAwards(month) : await request('/founder-awards', { data: { month, cursor, pageSize: 20, contextId: access.contextId } })))
}
export function getCostoreOptions() {
  return withExclusive('costore-application', async (_user, access) => {
    const result = config.useMock ? mockCostoreOptions() : await request('/costore/application-options', { data: { contextId: access.contextId } })
    if (!Array.isArray(result?.stores) || !Array.isArray(result.durations)) throw new Error('合店申请选项异常')
    const stores = result.stores.map(mapCostoreStore).filter(Boolean)
    if (!stores.length && result.stores.length) throw new Error('合店申请选项异常')
    // Plain-string benefits are placeholders, not CMS node documents; keep empty state.
    const benefits = (result.benefits && typeof result.benefits === 'object')
      ? coerceRichContent(result.benefits)
      : emptyContent()
    return {
      ...result,
      stores,
      benefits,
      agreement: {
        ...(result.agreement || {}),
        version: result.agreement?.version || null,
        content: coerceRichContent(result.agreement?.content),
      },
    }
  })
}
export function quoteCostore(storeId, durationId, months) {
  return withExclusive('costore-application', async (user, access) => {
    let result
    if (config.useMock) {
      const options = mockCostoreOptions(), store = options.stores.find(x => x.id === storeId), duration = options.durations.find(x => String(x.id) === String(durationId))
      if (!store) throw new Error('请选择有效门店和开通时长')
      const state = mockExclusiveState(user), id = `demo-quote-${state.quotes.size + 1}`
      const actualMonths = Number(months ?? duration?.months ?? durationId)
      if (!Number.isInteger(actualMonths) || actualMonths < 6) throw new Error('开通时长至少为6个月')
      result = { id, storeId, durationId: String(actualMonths), months: actualMonths, store, durationLabel: `${actualMonths}个月`, payableAmount: actualMonths * store.monthlyFee, currency: 'CNY', expiresAt: Date.now() + 300000, serverTime: Date.now(), mockOnly: true }
      state.quotes.set(id, copy(result))
      saveMockExclusiveState(user)
    } else result = await request('/costore/application-quotes', { method: 'POST', data: { storeId, durationId: String(months ?? durationId), months: Number(months ?? durationId), contextId: access.contextId } })
    if (!result?.id || !Number.isInteger(result.payableAmount) || result.payableAmount < 0 || !Number.isFinite(result.expiresAt) || !Number.isFinite(result.serverTime)) throw new Error('费用试算数据异常')
    if (result.store) result = { ...result, store: mapCostoreStore(result.store) || result.store }
    return result
  })
}
const costoreIntentKey=id=>`naoshang-costore-application-intent:${id}`
export function getCostoreApplicationIntent(){const id=getSession()?.user?.id;return id?uni.getStorageSync(costoreIntentKey(id)) || null:null}
export function clearCostoreApplicationIntent(){uni.removeStorageSync(costoreIntentKey(accountSnapshot().id))}
export function rememberCostoreApplicationIntent(quote,idempotencyKey,agreementVersion){
  const key=costoreIntentKey(accountSnapshot().id),old=uni.getStorageSync(key)
  if(old&&(old.quoteId!==quote.id||old.idempotencyKey!==idempotencyKey||old.agreementVersion!==agreementVersion))throw new Error('上一笔合店申请结果待确认，请重试原申请')
  const intent={quoteId:quote.id,quote:copy(quote),idempotencyKey,agreementVersion};uni.setStorageSync(key,intent);return intent
}
export function submitCostoreApplication({ quoteId, idempotencyKey, agreementVersion }) {
  return withExclusive('costore-application', async (user, access) => {
    if (!quoteId || !idempotencyKey) throw new Error('请先获取有效报价')
    if (!config.useMock) {
      if (!agreementVersion) throw new Error('合店协议尚未发布，暂不能提交正式申请')
      const key=costoreIntentKey(user.id),old=uni.getStorageSync(key)
      if(old&&(old.quoteId!==quoteId||old.idempotencyKey!==idempotencyKey||old.agreementVersion!==agreementVersion))throw new Error('上一笔合店申请结果待确认，请重试原申请')
      uni.setStorageSync(key,old||{quoteId,idempotencyKey,agreementVersion})
      try{
        const result=await request('/applications/costore', { method: 'POST', data: { quoteId, idempotencyKey, agreementVersion, contextId: access.contextId } })
        checkAccount(user)
        if(!result?.application?.id)throw new Error('申请结果待确认，请重试原申请')
        const orderId=[result.orderId,result.application.orderId].find(value=>typeof value==='string'&&value.trim())||''
        const months=result.application.months??result.months
        const application={...result.application,orderId:result.application.orderId||orderId||result.application.orderId,...(months!=null?{months}:{})}
        uni.removeStorageSync(key);return {...result,orderId:orderId||result.orderId,application}
      }catch(error){if(getSession()?.user?.id===user.id&&([400,422].includes(error.statusCode)||(error.statusCode===409&&['QUOTE_EXPIRED','INVALID_QUOTE','VALIDATION_ERROR'].includes(error.code))))uni.removeStorageSync(key);throw error}
    }
    const state = mockExclusiveState(user), previous = state.operations.get(idempotencyKey)
    if (previous) { if (previous.quoteId !== quoteId) throw new Error('重复提交参数不一致'); return copy(previous.result) }
    const quote = state.quotes.get(quoteId)
    if (!quote || quote.expiresAt <= Date.now()) throw new Error('报价已失效，请重新试算')
    if (quote.consumed) throw new Error('该报价已创建申请，请到我的申请继续付款')
    const application = { id: `demo-application-${state.applications.length + 1}`, title: `申请开通${quote.durationLabel}合店老板`, applicationStatus: 'PENDING_PAYMENT', paymentStatus: 'PENDING', contractStatus: 'NOT_SIGNED', entitlementStatus: 'NOT_OPEN', store: quote.store, payableAmount: quote.payableAmount, createdAt: new Date().toISOString(), mockOnly: true }
    state.applications.unshift(application)
    application.orderId = mockCostorePaymentOrder(user, application)
    quote.consumed = true
    const result = { application: copy(application), orderId: application.orderId, mockOnly: true }; state.operations.set(idempotencyKey, { quoteId, result }); saveMockExclusiveState(user);uni.removeStorageSync(costoreIntentKey(user.id));return result
  })
}
export function getMyApplications(cursor = null) {
  return withExclusive('costore-application', async (user, access) => {
    const result = listResult(config.useMock ? { items: copy(mockExclusiveState(user).applications), hasMore: false, nextCursor: null } : await request('/applications', { data: { type: 'COSTORE', cursor, pageSize: 20, contextId: access.contextId } }))
    return {
      ...result,
      items: result.items.map((item) => (
        item?.store ? { ...item, store: mapCostoreStore(item.store) || item.store } : item
      )),
    }
  })
}
export const agencyTypes = [{ id: 'STORE', label: '单店代理' }, { id: 'COUNTY', label: '区县代理' }, { id: 'CITY', label: '市代' }, { id: 'PROVINCE', label: '省代' }]
const isHttpUrl = value => typeof value === 'string' && /^https?:\/\/[^\s<>"'\\]+$/i.test(value)
function resolveAgencyScanUrl(result, type) {
  const share = typeof result?.shareUrl === 'string' ? result.shareUrl.trim() : ''
  if (isHttpUrl(share) && /application\/agency/i.test(share)) return share
  if (result?.promotionId) return buildAgencyApplicationUrl(result.promotionId, type)
  return ''
}
export function getAgencyPromotion(type) {
  if (!agencyTypes.some(item => item.id === type)) throw new Error('代理类型无效')
  return withExclusive('agency-code', async (user) => {
    let me = getCachedMeContext()
    if (!me) me = await loadMeContext().catch(() => null)
    checkAccount(user)
    if (!me && !config.useMock) {
      me = await request('/me')
      checkAccount(user)
    }
    const code = resolveAgencyPromotionCodeFromMe(me)
    if (!code) throw new Error(MISSING_AGENCY_PROMOTION_CODE_MESSAGE)
    // Keep the selected agency type in the deep link. The agency promotion
    // code identifies the referring partner; do not substitute personal invite codes.
    const scanUrl = buildAgencyApplicationUrl(code, type)
    if (!scanUrl) throw new Error(MISSING_AGENCY_PROMOTION_CODE_MESSAGE)
    return {
      accountId: user.id,
      agencyType: type,
      promotionId: code,
      agencyPromotionCode: code,
      qrUrl: '',
      posterUrl: '',
      shareUrl: scanUrl,
      localPayload: scanUrl,
    }
  })
}
