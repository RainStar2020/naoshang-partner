import { getSession } from '../api'
import * as commerce from '../mock/commerce'
import { mockIdentities, mockLevels, mockLevelDetail, mockAnnouncements } from '../mock/learning'
import { mockBusinessContexts } from '../mock/business'
import { mockFamily, memberDictionaries } from '../mock/family'
import { mockProfileState } from '../mock/profile'
import { legacyMock, NO_LEGACY_MOCK } from './legacy-mock'

const copy = value => JSON.parse(JSON.stringify(value))
const page = items => ({ items, nextCursor: null, hasMore: false })
const handlers = new Map()
const states = new Map()
let sequence = 0
const nextId = prefix => `contract-${prefix}-${++sequence}`
const fail = (message, code = 'VALIDATION_ERROR', statusCode = 422) => { throw Object.assign(new Error(message), { code, statusCode }) }
const content = { format: 'nodes', version: 1, nodes: [] }
function fingerprint(value) {
  if (Array.isArray(value)) return value.map(fingerprint)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, fingerprint(value[key])]))
  return typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : value
}

/** Override a fixture to test empty lists, entitlement locks, errors or pending payments. */
export function registerContractMock(key, handler) { handlers.set(key, handler); return () => handlers.delete(key) }
export function resetContractMocks() { handlers.clear(); states.clear(); sequence = 0 }

function stateFor(user) {
  if (!states.has(user.id)) states.set(user.id, { once: new Map(), records: new Map(), payments: [], codes: [], entitlementState: 'active' })
  return states.get(user.id)
}

/** Mock writes are isolated by account and idempotent within this browser session. */
export async function mockEndpoint(endpoint, input) {
  const user = getSession()?.user || { id: 'contract-demo', name: '接口演示用户' }
  const state = stateFor(user)
  const key = `${endpoint.method} ${endpoint.path}`
  const data = input.data || {}, path = input.path || {}
  if (handlers.has(key)) return copy(await handlers.get(key)({ data, path, user }))
  const intentData = { ...data }
  delete intentData.idempotencyKey
  if (endpoint.path === '/payments/attempts' || endpoint.path.endsWith('/payment') || endpoint.path.endsWith('/entitlement-orders') || endpoint.path === '/partner/quota-orders') delete intentData.channel
  const signature = JSON.stringify(fingerprint({ key, path, data: intentData }))
  const saved = data.idempotencyKey && state.once.get(data.idempotencyKey)
  if (saved) {
    if (saved.signature !== signature) fail('同一幂等键不能用于不同参数', 'IDEMPOTENCY_CONFLICT', 409)
    return copy(await saved.promise)
  }
  const promise = fixture(endpoint, path, data, user, state)
  if (data.idempotencyKey) state.once.set(data.idempotencyKey, { signature, promise })
  try { return copy(await promise) }
  catch (error) {
    if (data.idempotencyKey) state.once.delete(data.idempotencyKey)
    throw error
  }
}

async function fixture(e, p, d, user, state) {
  const key = `${e.method} ${e.path}`
  const tierActivation = e.path.startsWith('/activations') && ['fs', 'jy', 'cj', 'xn', 'ys'].includes(d.targetType)
  const legacy = tierActivation ? NO_LEGACY_MOCK : legacyMock(key, p, d)
  if (legacy !== NO_LEGACY_MOCK) return legacy
  const entitlement = { state: state.entitlementState, amount: 20000, frozen: false, canExportBills: true }
  const id = p.id || p.memberId || nextId('fixture')
  const identity = { id: d.contextId, memberId: d.memberId || p.memberId, mode: d.memberId || p.memberId ? 'child' : 'parent', accountId: user.id }
  switch (key) {
    case 'GET /me/invite-codes': return page([...state.records.values()].filter(row => row.mockKind === 'invite' && (!d.type || row.type === d.type)))
    case 'POST /me/invite-codes': {
      if (!['register', 'agent'].includes(d.type) || !d.contextId) fail('请选择邀请码类型并提供 contextId')
      const code = `${d.type === 'register' ? 'R' : 'A'}${(++sequence).toString(36).padStart(8, '0').toUpperCase()}`
      const inviteCode = { code, type: d.type, ownerId: user.id, createdAt: Date.now(), expiresAt: Date.now() + (d.ttlDays ?? 30) * 86400000, maxUse: d.maxUse ?? 0, usedCount: 0, status: 'active', mockKind: 'invite' }
      state.records.set(code, inviteCode)
      return { inviteCode, shareUrl: '', mock: true, note: '仅演示生成记录，不生成可用于真实注册的分享链接' }
    }
    case 'GET /partner/experience/summary': return { promotionExperience: 0, productExperience: 0, total: 0, count: 0, rule: '标价多少加多少（1 元 = 1 经验值）', mock: true }
    case 'GET /partner/promotion-claims': return { taskId: '', status: 'NONE', achieved: false, claimable: false, claimed: false, mock: true }
    case 'POST /partner/promotion-claims': fail('演示模式没有可领取的晋升任务', 'NOT_ACHIEVED', 400); break
    case 'GET /partner/allocation-scheme': return { mode: 'self_assign', modeLabel: '可自行分配（演示）', kinds: [{ key: 'inspection', ownerAssignable: true }, { key: 'sales', ownerAssignable: true }], mock: true }
    case 'POST /orders/{id}/payment': return commerce.mockPay(user, p.id, d.channel, d.idempotencyKey)
    case 'GET /columns': return page(commerce.mockCatalog().items.filter(item => item.categoryId === 'column').map(item => ({ id: item.id, title: item.title, summary: item.summary, coverUrl: item.coverUrl, price: item.skus[0]?.amount == null ? null : item.skus[0].amount / 100, unlocked: false, chapterCount: commerce.mockColumn(user, item.id).chapters.length })))
    case 'POST /auth/sessions':
    case 'POST /auth/registrations': return { token: 'contract-demo-token', user: { ...user, displayId: 'LC0001', role: '家长' }, accountType: d.channel || 'parent', entitlement }
    case 'POST /auth/sms-challenges': return { retryAfter: 60, devCode: '123456' }
    case 'POST /auth/password-reset-verifications': return { resetTicket: 'contract-reset-ticket' }
    case 'POST /auth/password-resets':
    case 'DELETE /auth/sessions/current': return { success: true }
    case 'POST /me/password-changes': return { changed: true }
    case 'POST /auth/wechat/authorizations': return { url: '', state: 'contract-demo-state', mock: true, message: '本地 Mock 不跳转微信；使用手机号演示登录' }
    case 'POST /auth/wechat/exchanges': return { registrationTicket: 'contract-wechat-ticket' }
    case 'GET /me/bootstrap': return { displayId: 'LC0001', entitlement, contexts: mockIdentities(user), businessContexts: mockBusinessContexts(user) }
    case 'GET /members/options': return memberDictionaries
    case 'GET /members': return page(mockFamily(user).members)
    case 'GET /catalog': return commerce.mockCatalog()
    case 'GET /products/{id}': return commerce.mockProductAvailability(user, p.id)
    case 'GET /checkout/options': return commerce.mockCheckoutOptions(user)
    case 'POST /checkout/quotes': return commerce.mockCheckoutQuote(user, d)
    case 'POST /orders': return commerce.mockCreateOrder(user, d.quoteId, d.idempotencyKey)
    case 'GET /orders': return commerce.mockOrders(user, d)
    case 'GET /members/{id}/orders': return commerce.mockOrders(user, { ...d, memberId: p.id })
    case 'GET /orders/{id}': return commerce.mockOrder(user, p.id)
    case 'POST /orders/{id}/cancellations': return commerce.mockOrderAction(user, p.id, 'cancel', d.version, d.idempotencyKey)
    case 'POST /orders/{id}/receipts': return commerce.mockOrderAction(user, p.id, 'confirm-receipt', d.version, d.idempotencyKey)
    case 'GET /orders/{id}/payment-channels': return { items: commerce.mockPaymentChannelsFor(commerce.mockOrder(user, p.id).order) }
    case 'POST /payments/attempts': return commerce.mockPay(user, d.orderId, d.channel, d.idempotencyKey)
    case 'GET /payments/attempts/{id}': return commerce.mockPaymentResult(user, p.id)
    case 'GET /columns/{id}': return commerce.mockColumn(user, p.id)
    case 'GET /learning/levels': return { levels: mockLevels(identity) }
    case 'GET /members/{memberId}/levels': return { levels: mockLevels(identity) }
    case 'GET /learning/levels/{levelId}': return mockLevelDetail(identity, p.levelId)
    case 'GET /announcements': return page(mockAnnouncements)
    case 'GET /announcements/{id}': {
      const row = mockAnnouncements.find(item => item.id === p.id)
      if (!row) fail('公告不存在', 'NOT_FOUND', 404)
      return { ...row, content }
    }
    case 'GET /me': return { profile: mockProfileState(user).profile, orderCounts: { pendingPayment: 0, waitingShipment: 0, waitingReceipt: 0, completed: 0 }, support: { phone: '', description: '本地演示' }, exclusiveAccess: { accountId: user.id, capabilities: [] } }
    case 'GET /addresses': return page(mockProfileState(user).addresses)
    case 'GET /addresses/{id}': {
      const address = mockProfileState(user).addresses.find(row => row.id === p.id)
      if (!address) fail('地址不存在', 'NOT_FOUND', 404)
      return { address }
    }
    case 'GET /support/config': return { phone: '', description: '本地演示客服', feedback: { maxImages: 3 } }
    case 'POST /support/feedback': return { feedbackId: nextId('feedback') }
    case 'GET /agreements/{type}': return { title: p.type === 'privacy' ? '隐私协议（演示）' : '用户协议（演示）', version: 'demo-1', content }
    case 'PUT /members/{memberId}/learning-progress': return { positionSeconds: d.positionSeconds ?? 0, durationSeconds: d.durationSeconds ?? 0, completed: d.completed === true }
    case 'POST /me/entitlement-orders':
    case 'POST /partner/entitlement-orders':
    case 'POST /partner/quota-orders': {
      const quota = e.path.includes('quota')
      const channel = d.channel || (quota ? 'unionpay' : 'wechat')
      if (!(quota ? ['unionpay'] : ['wechat', 'alipay', 'bank_card']).includes(channel)) fail('该业务不支持此支付渠道')
      if (!d.idempotencyKey) fail('缺少 idempotencyKey')
      const annual = e.path === '/partner/entitlement-orders'
      const payment = { id: nextId('payment'), bizName: e.description, amount: quota ? null : annual ? 198000 : 20000, channelName: channel, status: 'SUCCEEDED', paidAt: new Date().toISOString() }
      state.payments.push(payment)
      if (e.path === '/me/entitlement-orders') state.entitlementState = 'active'
      return { status: 'SUCCEEDED', paymentId: payment.id, orderId: payment.id, displayId: 'LC0001', entitlement, paymentMode: 'sandbox', mock: true, note: quota ? '名额价格未冻结，amount=null；仅演示支付回执，不变更现有名额台账' : annual ? '1980 元为文档暂行演示值，不变更现有年度权益台账' : '本地演示，不扣款' }
    }
    case 'GET /me/payments': return { ...page(state.payments), paymentMode: 'sandbox' }
    case 'GET /me/payments/{id}': {
      const payment = state.payments.find(row => row.id === p.id)
      if (!payment) fail('支付单不存在', 'NOT_FOUND', 404)
      return { payment, paymentMode: 'sandbox' }
    }
    case 'POST /me/payments/{id}/sandbox-confirm': {
      const payment = state.payments.find(row => row.id === p.id)
      if (!payment) fail('支付单不存在', 'NOT_FOUND', 404)
      return { payment, effect: { mock: true } }
    }
    case 'POST /admin/activation-codes':
    case 'POST /agency/activation-codes':
    case 'POST /partner/gift-codes': {
      const count = d.count ?? 1
      if (!Number.isInteger(count) || count < 1 || count > 100) fail('发码数量须为 1—100')
      const records = Array.from({ length: count }, () => ({ code: `NS-${String(d.targetType || 'FS').toUpperCase()}-${String(++sequence).padStart(6, '0')}`, targetType: d.targetType || 'fs', status: 'active', uses: [] }))
      state.codes.push(...records)
      return { batchId: nextId('batch'), codes: records.map(row => row.code), records, storeId: d.storeId || 'demo-store', issuedTo: d.toUserId || d.issuedTo, mock: true }
    }
    case 'GET /admin/activation-codes':
    case 'GET /agency/activation-codes':
    case 'GET /partner/gift-codes':
    case 'GET /me/activation-codes': return { ...page(state.codes.filter(row => !d.status || row.status === d.status)), stats: { total: state.codes.length, active: state.codes.filter(row => row.status === 'active').length, used: state.codes.filter(row => row.status === 'used').length, void: state.codes.filter(row => row.status === 'void').length, expired: 0 }, mock: true }
    case 'POST /admin/activation-codes/{code}/void': {
      const row = state.codes.find(item => item.code === p.code)
      if (!row) fail('激活码不存在', 'NOT_FOUND', 404)
      row.status = 'void'
      return { code: row.code, status: row.status, mock: true }
    }
    case 'POST /activations/preview':
    case 'POST /activations': {
      const row = state.codes.find(item => item.code === d.code && item.targetType === d.targetType)
      if (!row || row.status !== 'active') fail('演示激活码不存在或已使用')
      if (!d.memberId) fail('缺少 memberId')
      if (e.path.endsWith('preview')) return { ...d, alreadyActivated: false, mock: true }
      if (!d.idempotencyKey) fail('缺少 idempotencyKey')
      row.status = 'used'; row.uses.push({ memberId: d.memberId, at: new Date().toISOString() })
      return { unlocked: true, memberId: d.memberId, targetType: d.targetType, mock: true }
    }
    case 'GET /me/income-export': return d.format === 'csv' ? 'id,amount\n' : { displayId: 'LC0001', total: 0, byType: {}, count: 0, items: [] }
    case 'POST /assets/upload-intents': return { assetId: nextId('asset'), mode: 'multipart', uploadUrl: '', fileField: 'file', fields: {}, headers: {}, limits: { maxSize: 30 * 1024 * 1024 }, mock: true, message: '本地模式仅演示上传意图；文件预览请使用现有 uploadProfileImage/uploadMaterialQr' }
    case 'POST /assets/{id}/completions': return { status: 'ready', mock: true }
    case 'POST /materials/{id}/renders': return { jobId: nextId('job') }
    case 'GET /jobs/{jobId}': return { status: 'failed', message: '本地未配置真实海报合成，请使用现有素材页面 Mock' }
  }

  // These routes have no frozen algorithm/DTO in the supplied documents.
  // Require explicit fixtures rather than returning a false financial success.
  if (e.path.startsWith('/api/') || e.path.startsWith('/admin/')) {
    return { ...page([]), mock: true, endpoint: key, result: null, message: '文档未定义引擎 DTO；此处仅为离线占位，请注册场景数据后调试计算结果' }
  }
  if (e.method === 'GET') {
    if (e.path.endsWith('options')) return { fields: [], balances: {}, allowedActions: [], version: 1, members: [], stores: [], durations: [], plans: [], mock: true }
    return { ...page([]), id, contextId: d.contextId, metrics: [], summary: {}, allowedActions: [], content, categories: [], mock: true }
  }
  // Unknown writes must not masquerade as committed business transactions.
  fail(`该操作请复用现有页面服务 Mock 或注册专用场景：${key}`, 'MOCK_NOT_CONFIGURED', 501)
}
