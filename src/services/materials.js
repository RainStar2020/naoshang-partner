import { normalizeUploadIntent, isUploadReady } from './upload-contract'
import { config } from '../config'
import { getSession, request } from './api'
import { normalizeContent, isMediaUrl } from '../features/content/rich-content'
import { mockMaterialCategories, mockMaterials, mockMaterialDetail } from './mock/partner'
const keepPreviewUrl = value => isMediaUrl(value) || (config.useMock && typeof value === 'string' && (value.startsWith('/static/') || /^https?:\/\//.test(value))) ? value : ''
export const materialTypes = [ { id: 'image', label: '图片素材' }, { id: 'article', label: '图文素材' }, { id: 'video', label: '视频素材' } ]
const checkType = type => { if (!materialTypes.some(item => item.id === type)) throw new Error('不支持的素材类型') }
async function scoped(operation) {
  const accountId = getSession()?.user?.id
  if (!accountId) throw new Error('请先登录')
  const result = await operation()
  if (getSession()?.user?.id !== accountId) throw new Error('登录账号已变化，请重新加载')
  return result
}
export function getMaterialCategories(type) {
  checkType(type)
  return scoped(async () => {
    const rows = config.useMock ? mockMaterialCategories(type) : (await request('/materials/categories', { data: { type } })).categories
    if (!Array.isArray(rows) || rows.some(item => !item.id || !item.name)) throw new Error('素材分类格式异常')
    return rows
  })
}
export function getMaterials(type, { categoryId, cursor = null } = {}) {
  checkType(type)
  return scoped(async () => {
    const result = config.useMock ? mockMaterials(type, categoryId) : await request('/materials', { data: { type, categoryId, cursor, pageSize: 20 } })
    if (!Array.isArray(result?.items) || typeof result.hasMore !== 'boolean' || (result.hasMore && !result.nextCursor)) throw new Error('素材列表格式异常')
    if (result.items.some(item => !item.id || !item.title || item.type !== type)) throw new Error('素材数据格式异常')
    return { ...result, items: result.items.map(item => ({ ...item, coverUrl: keepPreviewUrl(item.coverUrl) })) }
  })
}
export function getMaterial(id) {
  return scoped(async () => {
    if (!id) throw new Error('该素材不存在或已下线')
    const result = config.useMock ? mockMaterialDetail(id) : await request(`/materials/${encodeURIComponent(id)}`)
    checkType(result?.type)
    if (!result.id || !result.title || !Array.isArray(result.allowedOperations)) throw new Error('素材详情格式异常')
    return { ...result, content: normalizeContent(result.content), mediaUrl: keepPreviewUrl(result.mediaUrl), posterUrl: keepPreviewUrl(result.posterUrl), shareUrl: keepPreviewUrl(result.shareUrl) }
  })
}
export function renderMaterial(id, { qrAssetId, idempotencyKey }) {
  return scoped(async () => {
    if (config.useMock) throw new Error('当前没有可生成的素材')
    if (!id || !qrAssetId || !idempotencyKey) throw new Error('缺少素材、二维码或请求编号')
    const result = await request(`/materials/${encodeURIComponent(id)}/renders`, { method: 'POST', data: { qrAssetId, idempotencyKey } })
    if (!result?.jobId) throw new Error('未获取到生成任务，请重试')
    return result
  })
}
export function getMaterialJob(jobId) {
  return scoped(async () => {
    if (config.useMock) throw new Error('生成任务不存在')
    const result = await request(`/jobs/${encodeURIComponent(jobId)}`)
    if (!['queued','processing','succeeded','failed'].includes(result?.status)) throw new Error('生成任务状态异常')
    const downloadUrl = isMediaUrl(result.downloadUrl) ? result.downloadUrl : '', shareUrl = isMediaUrl(result.shareUrl) ? result.shareUrl : ''
    if (result.status === 'succeeded' && !downloadUrl && !shareUrl) throw new Error('生成结果缺少可用文件或链接')
    return { ...result, downloadUrl, shareUrl }
  })
}
export function uploadMaterialQr(file) {
  return scoped(async () => {
    if (config.useMock) {
      if (!file?.path || !Number.isFinite(file.size) || file.size <= 0) throw new Error('未获取到有效图片，请重新选择')
      return { assetId: 'mock-material-qr' }
    }
    if (!file?.path || !Number.isFinite(file.size) || file.size <= 0) throw new Error('未获取到有效图片，请重新选择')
    const info = await new Promise((resolve,reject) => uni.getImageInfo({ src: file.path, success: resolve, fail: reject }))
    if (!['png','jpg','jpeg'].includes(info.type)) throw new Error('请选择PNG或JPG二维码图片')
    const mimeType = info.type === 'png' ? 'image/png' : 'image/jpeg'
    const intent = normalizeUploadIntent(await request('/assets/upload-intents', { method: 'POST', data: { purpose: 'material-qr', fileName: `qr.${info.type === 'png' ? 'png' : 'jpg'}`, mimeType, size: file.size } }))
    // Contract proposal: explicitly signed multipart POST, not an assumed S3 PUT.
    if (!intent?.assetId || !isMediaUrl(intent.uploadUrl) || intent.mode !== 'multipart') throw new Error('暂不支持此上传方式，请联系服务人员')
    if (intent.limits?.maxSize && file.size > intent.limits.maxSize) throw new Error('图片超过上传大小限制')
    await new Promise((resolve,reject) => uni.uploadFile({ url: intent.uploadUrl, filePath: file.path, name: intent.fileField || 'file', header: intent.headers || {}, formData: intent.fields || {}, success: response => response.statusCode >= 200 && response.statusCode < 300 ? resolve() : reject(new Error('图片上传失败，请重试')), fail: reject }))
    const result = await request(`/assets/${encodeURIComponent(intent.assetId)}/completions`, { method: 'POST' })
    if (!isUploadReady(result)) throw new Error('图片尚未处理完成，请稍后重试')
    return { assetId: intent.assetId, fileId: intent.fileId }
  })
}
