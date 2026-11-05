import { config } from '../config'
import { getSession, request } from './api'
import { mockBoundStore } from './mock/profile'

const fail = message => { throw new Error(message) }

function snapshot() {
  const session = getSession()
  if (!session?.user?.id || !session.token) fail('请先登录')
  return { id: String(session.user.id), token: session.token }
}

function verify(current) {
  const session = getSession()
  if (session?.user?.id !== current.id || session?.token !== current.token) fail('登录账号已变化，请重新加载')
}

function normalizeStore(value) {
  if (!value || typeof value !== 'object' || !value.id) return null
  const manager = value.manager && typeof value.manager === 'object'
    ? { id: String(value.manager.id || ''), name: String(value.manager.name || ''), phone: String(value.manager.phone || '') }
    : null
  return { id: String(value.id), storeNo: String(value.storeNo || value.storeCode || value.regionCode || ''), name: String(value.name || value.storeName || ''), address: String(value.address || ''), imageUrl: String(value.imageUrl || value.storeImage || value.coverUrl || ''), isHeadquarters: value.isHeadquarters === true || value.id === 'HQ', manager }
}

function normalizeBinding(value) {
  if (!value || typeof value !== 'object') return { bound: false, label: '未绑定门店' }
  return { ...value, bound: value.bound === true, storeId: value.storeId == null ? null : String(value.storeId), storeNo: String(value.storeNo || value.storeCode || ''), storeName: String(value.storeName || ''), label: String(value.label || value.storeName || (value.bound ? '已绑定门店' : '未绑定门店')) }
}

export async function getCurrentStoreBinding() {
  const current = snapshot()
  const result = config.useMock
    ? (() => {
        const store = mockBoundStore()
        return {
          accountId: current.id,
          bound: true,
          required: true,
          storeId: store.id,
          storeNo: store.number,
          storeName: store.name,
          label: store.name,
          stores: [{
            id: store.id,
            storeNo: store.number,
            name: store.name,
            address: store.address,
            imageUrl: store.coverUrl,
            manager: { name: store.managerName, phone: store.managerPhone },
          }],
        }
      })()
    : await request('/store-binding')
  verify(current)
  if (!result || typeof result !== 'object') fail('门店绑定信息格式异常')
  const binding = normalizeBinding(result)
  return { ...binding, stores: (Array.isArray(result.stores) ? result.stores : []).map(normalizeStore).filter(Boolean) }
}

export async function getDownlineStoreBindingOptions(targetAccountId) {
  const current = snapshot(), target = String(targetAccountId || '').trim()
  if (!target) fail('请选择需要绑定门店的下级用户')
  const result = config.useMock
    ? { targetAccountId: target, target: { id: target, name: target }, stores: [], binding: { bound: false }, canBind: false, operatorBound: false, reason: '演示环境暂不支持代绑门店' }
    : await request('/store-binding-options', { data: { targetAccountId: target } })
  verify(current)
  if (!result || typeof result !== 'object' || !result.targetAccountId) fail('门店绑定选项格式异常')
  return { targetAccountId: String(result.targetAccountId), target: result.target && typeof result.target === 'object' ? { id: String(result.target.id || result.targetAccountId), name: String(result.target.name || result.target.display_id || result.targetAccountId), phone: String(result.target.phone || ''), tier: String(result.target.tier || '') } : { id: String(result.targetAccountId), name: String(result.targetAccountId), phone: '', tier: '' }, stores: (Array.isArray(result.stores) ? result.stores : []).map(normalizeStore).filter(Boolean), binding: normalizeBinding(result.binding), canBind: result.canBind === true, operatorBound: result.operatorBound === true, reason: String(result.reason || '') }
}

export async function bindDownlineStore({ targetAccountId, storeId, reason = '' }) {
  const current = snapshot(), target = String(targetAccountId || '').trim(), store = String(storeId || '').trim()
  if (!target) fail('请选择需要绑定门店的下级用户')
  if (!store) fail('请选择门店')
  if (config.useMock) fail('演示环境暂不支持代绑门店')
  const result = await request('/store-bindings', { method: 'POST', data: { targetAccountId: target, storeId: store, ...(String(reason).trim() ? { reason: String(reason).trim() } : {}) } })
  verify(current)
  if (!result || result.status !== 'BOUND') fail('门店绑定回执异常，请刷新后确认')
  return result
}

export function storeBindingErrorMessage(error) {
  const messages = { STORE_BINDING_REQUIRED: '你尚未绑定门店，请联系上级或总部处理', STORE_BINDING_REQUIRED_TARGET: '请先给该用户绑定门店', STORE_BIND_FORBIDDEN: '只有该用户的上级或总部可以操作', STORE_BIND_OPERATOR_UNBOUND: '你本人尚未绑定门店，请先联系上级处理', SELF_STORE_BINDING_FORBIDDEN: '不能自己绑定门店，请联系上级或总部', STORE_NOT_FOUND: '门店不存在或已更新，请刷新门店列表', USER_NOT_FOUND: '目标用户不存在或已更新，请刷新团队列表' }
  return messages[error?.code] || error?.message || '服务暂时繁忙，请稍后再试'
}
