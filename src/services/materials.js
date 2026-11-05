import { resolveImageKind } from './upload-contract'
import {uploadAsset} from './asset-upload'
import { config } from '../config'
import { getSession, request } from './api'
import { normalizeContent, isMediaUrl } from '../features/content/rich-content'
import {assetUrl} from './asset-url'
import { mockMaterialCategories, mockMaterials, mockMaterialDetail } from './mock/partner'
const keepPreviewUrl = value => isMediaUrl(value) || (config.useMock && typeof value === 'string' && (value.startsWith('/static/') || /^https?:\/\//.test(value))) ? assetUrl(value) : ''
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
    const page = result == null || result.items == null ? { ...(result || {}), items: [], hasMore: false, nextCursor: null } : result
    if (!Array.isArray(page.items) || (page.hasMore != null && typeof page.hasMore !== 'boolean') || (page.hasMore && !page.nextCursor)) throw new Error('素材列表格式异常')
    if (page.items.some(item => !item.id || !item.title || item.type !== type)) throw new Error('素材数据格式异常')
    return { ...page, hasMore: page.hasMore === true, nextCursor: page.nextCursor || null, items: page.items.map(item => ({ ...item, coverUrl: keepPreviewUrl(item.coverUrl) })) }
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
    let info = {}
    try {
      info = await new Promise((resolve, reject) => uni.getImageInfo({ src: file.path, success: resolve, fail: reject }))
    } catch {
      info = {}
    }
    const kind = resolveImageKind(file, info)
    if (!kind) throw new Error('请选择PNG或JPG二维码图片')
    const result=await uploadAsset(file,{purpose:'material-qr',fileName:`qr.${kind.ext}`,mimeType:kind.mimeType})
    return {assetId:result.assetId,fileId:result.fileId}
  })
}
