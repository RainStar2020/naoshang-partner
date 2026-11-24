import { resolveImageKind } from './upload-contract'
import {uploadAsset} from './asset-upload'
import { config } from '../config'
import { getSession, request } from './api'
import { normalizeContent, isMediaUrl, emptyContent } from '../features/content/rich-content'
import {assetUrl} from './asset-url'
import { mockMaterials, mockMaterialDetail } from './mock/partner'
const keepPreviewUrl = value => isMediaUrl(value) || (config.useMock && typeof value === 'string' && (value.startsWith('/static/') || /^https?:\/\//.test(value))) ? assetUrl(value) : ''
export const materialTypes = [ { id: 'image', label: '图片素材' }, { id: 'article', label: '图文素材' }, { id: 'video', label: '视频素材' } ]
export const materialCategories = [
  { id: 'img-poster', type: 'image', name: '宣传海报' },
  { id: 'img-qr', type: 'image', name: '二维码图' },
  { id: 'art-notice', type: 'article', name: '平台公告' },
  { id: 'art-course', type: 'article', name: '课程介绍' },
  { id: 'vid-intro', type: 'video', name: '平台介绍' },
  { id: 'vid-course', type: 'video', name: '课程视频' },
]
const checkType = type => { if (!materialTypes.some(item => item.id === type)) throw new Error('不支持的素材类型') }
export function categoriesForType(type) {
  checkType(type)
  return materialCategories.filter(item => item.type === type).map(({ id, name }) => ({ id, name }))
}
export function categoryName(categoryId, fallback = '') {
  return materialCategories.find(item => item.id === categoryId)?.name || fallback
}
function keepShareUrl(value) {
  const url = typeof value === 'string' ? value.trim() : ''
  if (!url) return ''
  if (/^https?:\/\//i.test(url) || url.startsWith('/')) return url
  return ''
}
function isNumeric(value) {
  return typeof value === 'number' ? Number.isFinite(value) : typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))
}
export function readQrRegion(detail) {
  const region = detail?.qrRegion
  if (!region || typeof region !== 'object' || Array.isArray(region)) return null
  const width = region.width ?? region.w
  const height = region.height ?? region.h
  const x = region.x ?? region.left ?? region.l
  const y = region.y ?? region.top ?? region.t
  if (![x, y, width, height].every(isNumeric)) return null
  const w = Number(width), h = Number(height)
  if (w <= 0 || h <= 0) return null
  return { x: Number(x), y: Number(y), width: w, height: h }
}
const JPEG_HINT = /(?:image\/jpeg|\.jpe?g(?:$|[?#]))/i
export function isJpegBaseImage(detail) {
  const hints = [
    detail?.mediaMime,
    detail?.mimeType,
    detail?.templateMime,
    detail?.imageMime,
    detail?.contentType,
    detail?.mediaContentType,
    detail?.baseImageMime,
    detail?.template?.mimeType,
    detail?.template?.mediaMime,
    detail?.mediaUrl,
  ]
  return hints.some(value => typeof value === 'string' && JPEG_HINT.test(value))
}
export function describeComposeBlocker(detail) {
  if (!detail || detail.type !== 'image') return ''
  const operations = Array.isArray(detail.allowedOperations) ? detail.allowedOperations : []
  if (!operations.includes('render')) return '该素材暂不支持合图保存'
  if (!operations.includes('download')) return '该素材暂不支持保存到相册'
  if (isJpegBaseImage(detail)) return '该海报底图为 JPG，当前服务端暂不支持合图，请使用 PNG 模板'
  if (!readQrRegion(detail)) return '该素材未配置二维码区域，暂时无法保存合图'
  return ''
}
function normalizeMaterialContent(content) {
  if (content == null || content === '') return emptyContent()
  if (typeof content === 'string') {
    const html = content.trim()
    return html ? { version: 1, format: 'html', html, nodes: [] } : emptyContent()
  }
  if (content && typeof content === 'object' && content.format === 'html' && typeof content.html === 'string') {
    return { version: 1, format: 'html', html: content.html, nodes: [] }
  }
  return normalizeContent(content)
}
async function scoped(operation) {
  const accountId = getSession()?.user?.id
  if (!accountId) throw new Error('请先登录')
  const result = await operation()
  if (getSession()?.user?.id !== accountId) throw new Error('登录账号已变化，请重新加载')
  return result
}
export function getMaterialCategories(type) {
  checkType(type)
  const official = categoriesForType(type)
  return scoped(async () => {
    if (config.useMock) return official
    const rows = (await request('/materials/categories', { data: { type } })).categories
    if (!Array.isArray(rows) || rows.some(item => !item.id || !item.name)) throw new Error('素材分类格式异常')
    const officialIds = new Set(official.map(item => item.id))
    const extras = []
    const seen = new Set()
    for (const row of rows) {
      if (officialIds.has(row.id) || seen.has(row.id)) continue
      seen.add(row.id)
      extras.push({ id: row.id, name: row.name })
    }
    return official.map(item => ({ id: item.id, name: item.name })).concat(extras)
  })
}
export function getMaterials(type, { categoryId, cursor = null } = {}) {
  checkType(type)
  return scoped(async () => {
    const result = config.useMock ? mockMaterials(type, categoryId) : await request('/materials', { data: { type, categoryId, cursor } })
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
    return {
      ...result,
      content: normalizeMaterialContent(result.content),
      mediaUrl: keepPreviewUrl(result.mediaUrl),
      posterUrl: keepPreviewUrl(result.posterUrl),
      shareUrl: keepShareUrl(result.shareUrl),
      qrSlotAtEnd: result.qrSlotAtEnd === true,
      h5RouteReady: result.h5RouteReady === true,
    }
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
    const downloadUrl = isMediaUrl(result.downloadUrl) ? assetUrl(result.downloadUrl) : ''
    const shareUrl = keepShareUrl(result.shareUrl)
    if (result.status === 'succeeded' && !downloadUrl) throw new Error('生成结果缺少可下载的图片，无法保存到相册')
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
