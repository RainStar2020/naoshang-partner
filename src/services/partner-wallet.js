import { getSession, request } from './api'

const fail = message => { throw new Error(message) }

function account() {
  const session = getSession(), user = session?.user
  if (!user?.id) fail('请先登录')
  return { id: user.id, token: session.token }
}

function checkAccount(snapshot) {
  const session = getSession()
  if (session?.user?.id !== snapshot.id || session?.token !== snapshot.token) fail('登录账号已变化，请重新加载')
}

export function partnerContextId() {
  return `partner:${account().id}`
}

export function identityOfContextId(contextId) {
  const prefix = String(contextId || '').split(':')[0]
  return ({ wholesale: 'partner', partner: 'partner', agency: 'agent', costore: 'costore' }[prefix] || 'partner')
}

export function redemptionContextIdOf(explicit) {
  const value = String(explicit || '').trim()
  if (value) return value
  const pages = globalThis.getCurrentPages?.()
  const pageContextId = pages?.[pages.length - 1]?.options?.contextId
  return String(pageContextId || '').trim() || partnerContextId()
}

export function withdrawalIdentityOf(item) {
  const identity = ['partner', 'agent', 'costore'].includes(item?.identity)
    ? item.identity
    : identityOfContextId(item?.contextId || item?.applicantRole)
  const labels = { partner: '合伙人', agent: '区域代理', costore: '合店老板' }
  return {
    identity,
    identityLabel: String(item?.identityLabel || item?.applicantRoleLabel || labels[identity]),
    identityScopeLabel: item?.identityScopeLabel ? String(item.identityScopeLabel) : '',
  }
}

export function redemptionNoOf(item) {
  return String(item?.redemptionNo || item?.redemptionId || item?.id || '')
}

function points(value) {
  const result = Number(value)
  return Number.isFinite(result) && result >= 0 ? result : null
}

function store(value) {
  if (!value || typeof value !== 'object' || !value.id || !value.name) return null
  return {
    id: String(value.id),
    storeNo: String(value.storeNo || value.regionCode || ''),
    name: String(value.name),
    address: String(value.address || ''),
    regionCode: String(value.regionCode || ''),
    imageUrl: String(value.imageUrl || value.storeImage || value.coverUrl || ''),
    manager: value.manager && typeof value.manager === 'object' ? {
      id: String(value.manager.id || ''), name: String(value.manager.name || ''), phone: String(value.manager.phone || ''),
    } : null,
  }
}

export async function getPartnerPointsOptions(contextId) {
  const current = account()
  const resolvedContextId = redemptionContextIdOf(contextId)
  const result = await request('/wallet/withdrawal-options', { data: { contextId: resolvedContextId } })
  checkAccount(current)
  if (!result || points(result.totalPoints ?? result.totalAvailable) == null || points(result.availablePoints) == null || !Array.isArray(result.categories) || !Array.isArray(result.pointRecords) || !Array.isArray(result.allowedActions)) fail('积分数据格式异常')
  return {
    contextId: String(result.contextId || resolvedContextId), identity: String(result.identity || identityOfContextId(resolvedContextId)), identityLabel: String(result.identityLabel || withdrawalIdentityOf({ contextId: resolvedContextId }).identityLabel),
    totalPoints: Number(result.totalPoints ?? result.totalAvailable), totalAvailable: points(result.totalAvailable) ?? Number(result.totalPoints ?? 0), availablePoints: Number(result.availablePoints), exchangeRate: Number(result.exchangeRate) || 1,
    rateNote: String(result.rateNote || ''), minPoints: points(result.minPoints), maxPoints: points(result.maxPoints),
    allowedActions: result.allowedActions,
    disabledReason: result.disabledReason ? String(result.disabledReason) : '',
    categories: result.categories.map(item => ({ key: String(item?.key || ''), label: String(item?.label || ''), points: points(item?.points) ?? 0 })),
    pointRecords: result.pointRecords.map(item => ({
      id: String(item?.id || ''), category: String(item?.category || ''), source: String(item?.source || ''), points: points(item?.points) ?? 0,
      user: item?.user && typeof item.user === 'object' ? { id: String(item.user.id || ''), name: String(item.user.name || ''), phone: String(item.user.phone || '') } : null,
      identity: String(item?.identity || identityOfContextId(resolvedContextId)), identityLabel: String(item?.identityLabel || withdrawalIdentityOf({ contextId: resolvedContextId }).identityLabel), createdAt: item?.createdAt || null,
    })),
    identityBalances: Array.isArray(result.identityBalances) ? result.identityBalances : [],
  }
}

export async function exchangePartnerPoints(pointsInput, idempotencyKey, contextId, identity) {
  const current = account()
  const resolvedContextId = redemptionContextIdOf(contextId)
  const amount = Number(pointsInput)
  if (!Number.isFinite(amount) || amount <= 0) fail('请输入兑换积分')
  if (!idempotencyKey) fail('提交编号缺失，请重试')
  const result = await request('/wallet/withdrawals', {
    method: 'POST',
    data: { points: amount, amount, idempotencyKey, contextId: resolvedContextId, identity: identity || identityOfContextId(resolvedContextId) },
  })
  checkAccount(current)
  if (!result || typeof result !== 'object') fail('兑换结果异常，请稍后查看记录')
  const status = String(result.status || '')
  if (!['PENDING_REVIEW', 'PENDING_SETTLEMENT', 'SUCCEEDED', 'COMPLETED', 'APPLIED', 'DEMO_APPLIED'].includes(status)) {
    fail('兑换结果待确认，请稍后查看记录')
  }
  const id = result.redemptionId || result.withdrawalId || result.id
  if (!id) fail('兑换回执不完整，请稍后查看记录')
  return { ...result, status, redemptionId: String(id), redemptionNo: redemptionNoOf({ ...result, redemptionId: id }), withdrawalId: String(id), contextId: String(result.contextId || resolvedContextId), identity: String(result.identity || identityOfContextId(resolvedContextId)), identityLabel: String(result.identityLabel || withdrawalIdentityOf({ contextId: resolvedContextId }).identityLabel) }
}

export async function getPartnerStoreBindingOptions() {
  const current = account(), contextId = `partner:${current.id}`
  const result = await request('/partner/store-binding-options', { data: { contextId } })
  checkAccount(current)
  if (!result || result.accountId !== current.id || result.contextId !== contextId || !Array.isArray(result.stores) || !Array.isArray(result.allowedActions)) fail('门店数据格式异常')
  const stores = result.stores.map(store).filter(Boolean)
  const boundStore = result.boundStore == null ? null : store(result.boundStore)
  if (result.boundStore != null && !boundStore) fail('已绑定门店数据格式异常')
  const headquarters = result.headquarters?.id
    ? {
        id: String(result.headquarters.id),
        name: String(result.headquarters.name || '总部服务'),
        note: String(result.headquarters.note || result.headquarters.description || '当前门店由总部统一服务'),
        imageUrl: String(result.headquarters.imageUrl || result.headquarters.storeImage || result.headquarters.coverUrl || ''),
        storeNo: String(result.headquarters.storeNo || ''),
        address: String(result.headquarters.address || ''),
        manager: result.headquarters.manager && typeof result.headquarters.manager === 'object'
          ? {
              id: String(result.headquarters.manager.id || ''),
              name: String(result.headquarters.manager.name || ''),
              phone: String(result.headquarters.manager.phone || ''),
            }
          : null,
      }
    : null
  return { contextId, headquarters, stores, boundStore, allowedActions: result.allowedActions }
}

export async function bindPartnerStore(storeId, idempotencyKey) {
  const current = account(), contextId = `partner:${current.id}`, target = String(storeId || '').trim()
  if (!target) fail('请选择门店')
  if (!idempotencyKey) fail('提交编号缺失，请重试')
  const result = await request('/partner/store-binding', { method: 'POST', data: { contextId, storeId: target, idempotencyKey } })
  checkAccount(current)
  const bound = store(result?.store)
  if (result?.status !== 'BOUND' || !result.bindingId || !result.operationId || !bound) fail('门店绑定回执异常，请稍后刷新确认')
  return { ...result, store: bound }
}
