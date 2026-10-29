import { normalizeUploadIntent, isUploadReady } from './upload-contract'
import {mockCommerceState,mockOrders} from './mock/commerce'
import { normalizeRemoteOrderMoney } from './commerce'
import { config } from '../config'
import { request, getSession } from './api'
import { mockProfileState, mockBoundStore, copy } from './mock/profile'
import { normalizeContent } from '../features/content/rich-content'
const fail = message => { throw new Error(message) }
function pageResult(result, label) {
  if (result == null) return { items: [], hasMore: false, nextCursor: null }
  if (!Array.isArray(result.items)) {
    if (result.items == null) return { ...result, items: [], hasMore: false, nextCursor: null }
    fail(`${label}数据格式异常`)
  }
  if (result.hasMore == null) return { ...result, hasMore: false, nextCursor: null }
  if (typeof result.hasMore !== 'boolean' || (result.hasMore && (typeof result.nextCursor !== 'string' || !result.nextCursor))) fail(`${label}数据格式异常`)
  return result
}
async function scoped(operation) {
  const user = { ...getSession()?.user }
  if (!user.id) fail('请先登录')
  const result = await operation(user)
  if (getSession()?.user?.id !== user.id) fail('登录账号已变化，请重新加载')
  return result
}
export function getMyProfile() {
  return scoped(async user => {
    const result = config.useMock ? { profile: copy(mockProfileState(user).profile), store: mockBoundStore(), orderCounts: { pendingPayment: mockOrders(user,{filter:'pending-payment'}).items.length, waitingShipment: mockOrders(user,{filter:'waiting-shipment'}).items.length, waitingReceipt: mockOrders(user,{filter:'waiting-receipt'}).items.length, completed: mockOrders(user,{filter:'completed'}).items.length }, support: { phone: '', description: '' } } : await request('/me')
    if (result?.profile?.id !== user.id) fail('个人资料格式异常')
    return result
  })
}
export function updateMyProfile(payload) {
  return scoped(async user => {
    const nickname = String(payload.nickname || '').trim()
    if (!nickname || Array.from(nickname).length > 24) fail('请输入1–24字昵称')
    const codes = payload.regionCodes || [], names = payload.regionNames || []
    if (codes.length && (codes.length !== 3 || names.length !== 3)) fail('请选择完整地区')
    if (!config.useMock) {
      const result = await request('/me', { method: 'PATCH', data: { nickname, regionCodes: codes.length ? codes : undefined, avatarAssetId: payload.avatarAssetId || undefined, version: payload.version } })
      if (getSession()?.user?.id !== user.id) fail('登录账号已变化，请重新加载')
      if (result?.profile?.id !== user.id || !result.profile.nickname) fail('个人资料格式异常')
      const session = getSession(); uni.setStorageSync('naoshang-session', { ...session, user: { ...session.user, name: result.profile.nickname, region: result.profile.regionNames || [] } })
      return result
    }
    const state = mockProfileState(user), current = state.profile
    if (payload.version !== current.version) fail('资料已更新，请重新加载后再保存')
    const avatar = payload.avatarAssetId ? state.assets.get(payload.avatarAssetId) : null
    if (payload.avatarAssetId && (!avatar || avatar.purpose !== 'avatar')) fail('头像已失效，请重新选择')
    state.profile = { ...current, nickname, regionCodes: codes.length ? [...codes] : current.regionCodes, regionNames: codes.length ? [...names] : current.regionNames, avatarUrl: avatar?.previewUrl || current.avatarUrl, version: current.version + 1 }
    const session = getSession(); uni.setStorageSync('naoshang-session', { ...session, user: { ...session.user, name: nickname, region: state.profile.regionNames } })
    return { profile: copy(state.profile) }
  })
}
function validAddress(payload) {
  const recipient = String(payload.recipient || '').trim(), phone = String(payload.phone || '').trim(), detail = String(payload.detail || '').trim()
  if (!recipient || Array.from(recipient).length > 30) fail('请输入1–30字收货人姓名')
  if (!/^1\d{10}$/.test(phone)) fail('请输入正确的手机号')
  if (payload.regionCodes?.length !== 3 || payload.regionNames?.length !== 3) fail('请选择完整所在地区')
  if (!detail || Array.from(detail).length > 200) fail('请输入1–200字详细地址')
  return { recipient, phone, detail, regionCodes: [...payload.regionCodes], regionNames: [...payload.regionNames], isDefault: payload.isDefault === true }
}
export function getAddresses(cursor = null) {
  return scoped(async user => {
    const result = config.useMock ? { items: copy(mockProfileState(user).addresses), nextCursor: null, hasMore: false } : await request('/addresses', { data: { cursor, pageSize: 20 } })
    return pageResult(result, '地址')
  })
}
export function saveAddress(id, payload) {
  return scoped(async user => {
    const value = validAddress(payload)
    if (!config.useMock) return request(id ? `/addresses/${encodeURIComponent(id)}` : '/addresses', { method: id ? 'PATCH' : 'POST', data: { ...value, version: payload.version } })
    const state = mockProfileState(user), existing = state.addresses.find(item => item.id === id)
    if (id && !existing) fail('地址不存在或已删除')
    if (existing && payload.version !== existing.version) fail('地址已更新，请返回列表后重新编辑')
    if (value.isDefault) for (const address of state.addresses) if (address.id !== id && address.isDefault) { address.isDefault = false; address.version++ }
    const result = { ...value, id: id || `address-${state.nextAddress++}`, version: (existing?.version || 0) + 1 }
    if (existing) state.addresses[state.addresses.indexOf(existing)] = result
    else state.addresses.push(result)
    return { address: copy(result) }
  })
}
export function getAddress(id) {
  return scoped(async user => {
    if (!config.useMock) return request(`/addresses/${encodeURIComponent(id)}`)
    const value = mockProfileState(user).addresses.find(item => item.id === id)
    if (!value) fail('地址不存在或已删除')
    return { address: copy(value) }
  })
}
export function setDefaultAddress(id, version) {
  return scoped(async user => {
    if (!config.useMock) return request('/addresses/default', { method: 'PUT', data: { addressId: id, version } })
    const state = mockProfileState(user), target = state.addresses.find(item => item.id === id)
    if (!target) fail('地址不存在或已删除')
    if (target.version !== version) fail('地址已更新，请刷新后重试')
    for (const address of state.addresses) if (address.isDefault !== (address.id === id)) { address.isDefault = address.id === id; address.version++ }
    return { defaultAddressId: id }
  })
}
export function deleteAddress(id, version) {
  return scoped(async user => {
    if (!config.useMock) return request(`/addresses/${encodeURIComponent(id)}`, { method: 'DELETE', data: { version } })
    const state = mockProfileState(user), index = state.addresses.findIndex(item => item.id === id)
    if (index < 0) fail('地址不存在或已删除')
    if (state.addresses[index].version !== version) fail('地址已更新，请刷新后重试')
    state.addresses.splice(index, 1)
    return { success: true }
  })
}
export function getCoupons(status, cursor = null) {
  if (!['available','used','void'].includes(status)) fail('优惠券状态无效')
  return scoped(async user => {
    const result = config.useMock ? { items: copy(mockCommerceState(user).coupons.filter(item=>item.status===status).map(item=>({...item,discountAmount:item.amount,thresholdText:item.thresholdLabel||(item.minAmount?`满${item.minAmount/100}可用`:'无门槛'),validUntilLabel:`有效期至${String(item.expiresAt||'').slice(0,10).replaceAll('-','/')}`,scopeLabel:item.scopeLabel||'全部商品可用'}))), nextCursor: null, hasMore: false } : await request('/coupons', { data: { status, cursor, pageSize: 20 } })
    return pageResult(result, '优惠券')
  })
}
export function getMyOrders(filter = 'all', cursor = null, keyword = '') {
  const filters = { all: {}, 'pending-payment': { status: 'PENDING_PAYMENT' }, 'waiting-shipment': { status: 'PAID', fulfillmentStatus: 'WAIT_SHIP' }, 'waiting-receipt': { status: 'PAID', fulfillmentStatus: 'SHIPPED' }, completed: { status: 'COMPLETED' } }
  if (!filters[filter]) fail('订单筛选条件无效')
  return scoped(async user => {
    const result = pageResult(config.useMock ? mockOrders(user,{filter,keyword}) : await request('/orders', { data: { ...filters[filter], cursor, keyword, pageSize: 20 } }), '订单')
    if (config.useMock) return result
    return { ...result, items: result.items.map(normalizeRemoteOrderMoney) }
  })
}
export function getSupportConfig() {
  return scoped(() => config.useMock ? { phone: '', description: '', feedback: { maxImages: 3 } } : request('/support/config'))
}
export function uploadProfileImage(file, purpose) {
  return scoped(async user => {
    if (!['avatar','feedback','member-avatar','storefront'].includes(purpose) || !file?.path || !Number.isFinite(file.size) || file.size <= 0) fail('请选择有效图片')
    if (config.useMock) {
      const state = mockProfileState(user), assetId = `mock-${purpose}-${state.nextAsset++}`
      state.assets.set(assetId, { purpose, previewUrl: file.path })
      return { assetId, previewUrl: file.path, mockOnly: true }
    }
    const info = await new Promise((resolve, reject) => uni.getImageInfo({ src: file.path, success: resolve, fail: reject }))
    if (!['png','jpg','jpeg'].includes(info.type)) fail('请选择PNG或JPG图片')
    const intent = normalizeUploadIntent(await request('/assets/upload-intents', { method: 'POST', data: { purpose, size: file.size, mimeType: info.type === 'png' ? 'image/png' : 'image/jpeg', fileName: `image.${info.type === 'png' ? 'png' : 'jpg'}` } }))
    if (!intent?.assetId || !/^https:\/\//.test(intent.uploadUrl) || intent.mode !== 'multipart') fail('上传配置暂不可用，请稍后重试')
    if (intent.limits?.maxSize && file.size > intent.limits.maxSize) fail('图片超过允许大小')
    await new Promise((resolve,reject) => uni.uploadFile({ url: intent.uploadUrl, filePath: file.path, name: intent.fileField || 'file', header: intent.headers || {}, formData: intent.fields || {}, success: result => result.statusCode >= 200 && result.statusCode < 300 ? resolve() : reject(new Error('图片上传失败')), fail: reject }))
    const result = await request(`/assets/${encodeURIComponent(intent.assetId)}/completions`, { method: 'POST' })
    if (!isUploadReady(result)) fail('图片尚未处理完成，请稍后重试')
    return { assetId: intent.assetId, fileId: intent.fileId, previewUrl: result.previewUrl || file.path }
  })
}
export function submitSupportFeedback({ content, imageAssetIds = [], idempotencyKey }) {
  return scoped(async user => {
    const text = String(content || '').trim()
    if (!text || Array.from(text).length > 500) fail('请填写1–500字反馈内容')
    if (!idempotencyKey) fail('缺少提交编号，请重试')
    if (!config.useMock) return request('/support/feedback', { method: 'POST', data: { content: text, imageAssetIds, idempotencyKey } })
    const state = mockProfileState(user)
    if (imageAssetIds.length > 3 || imageAssetIds.some(id => state.assets.get(id)?.purpose !== 'feedback')) fail('反馈图片无效，请重新选择')
    const payload = JSON.stringify({ text, imageAssetIds }), previous = state.feedback.get(idempotencyKey)
    if (previous) { if (previous.payload !== payload) fail('重复提交参数不一致'); return copy(previous.result) }
    const result = { feedbackId: `mock-feedback-${state.feedback.size + 1}`, mockOnly: true }
    state.feedback.set(idempotencyKey, { payload, result }); return result
  })
}
export async function getAgreement(type) {
  if (!['user','privacy'].includes(type)) fail('协议类型无效')
  const result = config.useMock ? { title: type === 'user' ? '用户协议' : '隐私政策', content: null, version: null } : await request(`/agreements/${type}`)
  return { ...result, content: normalizeContent(result.content) }
}
