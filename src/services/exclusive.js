import { config } from '../config'
import { request, getSession } from './api'
import { visibleExclusiveFeatures } from '../features/exclusive/catalog'
import { normalizeContent, isMediaUrl } from '../features/content/rich-content'
import { mockExclusiveState, mockCostoreOptions, mockFounderAwards } from './mock/exclusive'
const copy = value => JSON.parse(JSON.stringify(value))
export function accountSnapshot() {
  const user = getSession()?.user
  if (!user?.id) throw new Error('请先登录')
  return { ...user }
}
export function checkAccount(user) { if (getSession()?.user?.id !== user.id) throw new Error('登录账号已变化，请重新加载') }
export function listResult(result) {
  if (!Array.isArray(result?.items) || typeof result.hasMore !== 'boolean' || (result.hasMore && (typeof result.nextCursor !== 'string' || !result.nextCursor))) throw new Error('列表数据格式异常')
  return result
}
export async function getExclusiveAccess(profileResult) {
  const user = accountSnapshot()
  const result = config.useMock ? { accountId: user.id, contextId: `account:${user.id}`, capabilities: [] } : (profileResult || await request('/me')).exclusiveAccess
  checkAccount(user)
  if (!result) return { accountId: user.id, contextId: null, capabilities: [] }
  if (result.accountId !== user.id || !Array.isArray(result.capabilities) || (result.capabilities.length && !result.contextId)) throw new Error('专属功能身份数据异常')
  return result
}
export async function withExclusive(featureId, operation) {
  const user = accountSnapshot(), access = await getExclusiveAccess()
  checkAccount(user)
  if (!visibleExclusiveFeatures(access, config).some(item => item.id === featureId)) {
    const error = new Error('当前身份暂不能使用此功能'); error.code = 'FORBIDDEN'; throw error
  }
  const result = await operation(user, access); checkAccount(user); return result
}
export function getVisibleExclusiveEntries(access) { return visibleExclusiveFeatures(access, config) }
export function getFounderAwards(month, cursor = null) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('请选择有效月份')
  return withExclusive('founder-awards', async (_user, access) => listResult(config.useMock ? mockFounderAwards(month) : await request('/founder-awards', { data: { month, cursor, pageSize: 20, contextId: access.contextId } })))
}
export function getCostoreOptions() {
  return withExclusive('costore-application', async (_user, access) => {
    const result = config.useMock ? mockCostoreOptions() : await request('/costore/application-options', { data: { contextId: access.contextId } })
    if (!Array.isArray(result?.stores) || !Array.isArray(result.durations)) throw new Error('合店申请选项异常')
    return { ...result, benefits: normalizeContent(result.benefits), agreement: { ...result.agreement, content: normalizeContent(result.agreement?.content) } }
  })
}
export function quoteCostore(storeId, durationId) {
  return withExclusive('costore-application', async (user, access) => {
    let result
    if (config.useMock) {
      const options = mockCostoreOptions(), store = options.stores.find(x => x.id === storeId), duration = options.durations.find(x => x.id === durationId)
      if (!store || !duration) throw new Error('请选择有效门店和开通时长')
      const state = mockExclusiveState(user), id = `demo-quote-${state.quotes.size + 1}`
      result = { id, storeId, durationId, store, durationLabel: duration.label, payableAmount: duration.months * 10000, currency: 'CNY', expiresAt: Date.now() + 300000, serverTime: Date.now(), mockOnly: true }
      state.quotes.set(id, copy(result))
    } else result = await request('/costore/application-quotes', { method: 'POST', data: { storeId, durationId, contextId: access.contextId } })
    if (!result?.id || !Number.isInteger(result.payableAmount) || result.payableAmount < 0 || !Number.isFinite(result.expiresAt) || !Number.isFinite(result.serverTime)) throw new Error('费用试算数据异常')
    return result
  })
}
export function submitCostoreApplication({ quoteId, idempotencyKey, agreementVersion }) {
  return withExclusive('costore-application', async (user, access) => {
    if (!quoteId || !idempotencyKey) throw new Error('请先获取有效报价')
    if (!config.useMock) {
      if (!agreementVersion) throw new Error('合店协议尚未发布，暂不能提交正式申请')
      return request('/applications/costore', { method: 'POST', data: { quoteId, idempotencyKey, agreementVersion, contextId: access.contextId } })
    }
    const state = mockExclusiveState(user), previous = state.operations.get(idempotencyKey)
    if (previous) { if (previous.quoteId !== quoteId) throw new Error('重复提交参数不一致'); return copy(previous.result) }
    const quote = state.quotes.get(quoteId)
    if (!quote || quote.expiresAt <= Date.now()) throw new Error('报价已失效，请重新试算')
    const application = { id: `demo-application-${state.applications.length + 1}`, title: `申请开通${quote.durationLabel}合店老板`, applicationStatus: 'PENDING_REVIEW', paymentStatus: 'NOT_STARTED', contractStatus: 'NOT_SIGNED', entitlementStatus: 'NOT_OPEN', store: quote.store, payableAmount: quote.payableAmount, createdAt: new Date().toISOString(), mockOnly: true }
    state.applications.unshift(application)
    const result = { application: copy(application), mockOnly: true }; state.operations.set(idempotencyKey, { quoteId, result }); return result
  })
}
export function getMyApplications(cursor = null) {
  return withExclusive('costore-application', async (user, access) => listResult(config.useMock ? { items: copy(mockExclusiveState(user).applications), hasMore: false, nextCursor: null } : await request('/applications', { data: { type: 'COSTORE', cursor, pageSize: 20, contextId: access.contextId } })))
}
export const agencyTypes = [{ id: 'STORE', label: '单店代理' }, { id: 'COUNTY', label: '区县代理' }, { id: 'CITY', label: '市代' }, { id: 'PROVINCE', label: '省代' }]
export function getAgencyPromotion(type) {
  if (!agencyTypes.some(item => item.id === type)) throw new Error('代理类型无效')
  return withExclusive('agency-code', async (user, access) => {
    const result = config.useMock ? { accountId: user.id, agencyType: type, promotionId: `local-${user.id}-${type}`, localPayload:`http://localhost:5173/#/pages/application/agency?promotionId=local-${encodeURIComponent(user.id)}-${type}&agencyType=${type}`, qrUrl: '', posterUrl: '', shareUrl: '', mockOnly: true } : await request('/promotion/agency-code', { data: { agencyType: type, contextId: access.contextId } })
    if (result?.accountId !== user.id || result.agencyType !== type) throw new Error('推广码身份不匹配')
    return { ...result, qrUrl: result.promotionId && isMediaUrl(result.qrUrl) ? result.qrUrl : '', posterUrl: result.promotionId && isMediaUrl(result.posterUrl) ? result.posterUrl : '', shareUrl: result.promotionId && isMediaUrl(result.shareUrl) ? result.shareUrl : '' }
  })
}
