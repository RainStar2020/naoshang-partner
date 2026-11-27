import { resolveImageKind } from './upload-contract'
import {uploadAsset} from './asset-upload'
import { config } from '../config'
import { getSession, request, requestPublic } from './api'
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
function parseQuery(text) {
  const values = {}
  String(text || '').replace(/^\?/, '').split('&').forEach(part => {
    if (!part) return
    const index = part.indexOf('=')
    const key = decodeURIComponent(index >= 0 ? part.slice(0, index) : part)
    if (!key) return
    values[key] = decodeURIComponent(index >= 0 ? part.slice(index + 1) : '')
  })
  return {
    get: key => values[key] || '',
    has: key => Object.prototype.hasOwnProperty.call(values, key),
  }
}
function parseUrlParts(value) {
  const url = keepShareUrl(value)
  if (!url) return null
  try {
    const hashIndex = url.indexOf('#')
    const hash = hashIndex >= 0 ? url.slice(hashIndex + 1) : ''
    const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url
    const schemeHost = withoutHash.match(/^https?:\/\/[^/?#]+/i)
    const afterHost = schemeHost ? withoutHash.slice(schemeHost[0].length) : withoutHash
    const searchIndex = afterHost.indexOf('?')
    const pathname = (searchIndex >= 0 ? afterHost.slice(0, searchIndex) : afterHost) || '/'
    const search = searchIndex >= 0 ? afterHost.slice(searchIndex + 1) : ''
    const hashSearchIndex = hash.indexOf('?')
    const hashRoute = (hashSearchIndex >= 0 ? hash.slice(0, hashSearchIndex) : hash).replace(/^\//, '')
    const query = parseQuery(hashSearchIndex >= 0 ? hash.slice(hashSearchIndex + 1) : search)
    const route = hashRoute || pathname.replace(/^\//, '')
    return { url, pathname, route, query }
  } catch {
    return null
  }
}
export function isInviteRegisterUrl(value) {
  const parts = parseUrlParts(value)
  if (!parts) return false
  const route = parts.route
  if (route === 'pages/register/index' || route.endsWith('/pages/register/index')) return true
  if (/\/invite\/?$/i.test(parts.pathname) && (parts.query.get('code') || parts.query.get('inviteCode'))) return true
  return parts.query.has('inviteCode') && /register/i.test(parts.url)
}
export function isContentShareUrl(value) {
  const parts = parseUrlParts(value)
  if (!parts) return false
  const route = parts.route
  const isArticle = route === 'pages/promo-content/article/index' || route.endsWith('/pages/promo-content/article/index')
  const isVideo = route === 'pages/promo-content/video/index' || route.endsWith('/pages/promo-content/video/index')
  if (!isArticle && !isVideo) return false
  const shareId = String(parts.query.get('shareId') || '').trim()
  if (!shareId) return false
  if (parts.query.get('inviteCode') || parts.query.get('materialId')) return false
  return true
}
export function keepContentShareUrl(value) {
  const url = keepShareUrl(value)
  return isContentShareUrl(url) ? url : ''
}
export function keepInviteUrl(value) {
  const url = keepShareUrl(value)
  if (!url) return ''
  if (isContentShareUrl(url)) return ''
  return url
}
export function normalizePartnerShareFields(item = {}) {
  const inviteFromField = keepInviteUrl(item.inviteUrl)
  const rawShare = keepShareUrl(item.shareUrl)
  const contentUrl = keepContentShareUrl(rawShare)
  const inviteFromLegacy = !inviteFromField && isInviteRegisterUrl(rawShare) ? keepInviteUrl(rawShare) : ''
  const contentShareId = typeof item.contentShareId === 'string' && item.contentShareId.trim() ? item.contentShareId.trim() : (contentUrl ? (parseUrlParts(contentUrl)?.query.get('shareId') || '') : '')
  return {
    inviteUrl: inviteFromField || inviteFromLegacy || '',
    shareUrl: contentUrl,
    contentShareId: contentShareId || null,
  }
}
export function isNotFoundError(error) {
  const status = error?.statusCode
  const code = error?.code
  if (status === 404 || code === 40400 || code === 'NOT_FOUND') return true
  return /不存在|已下线|已失效|已更新/.test(String(error?.message || error?.serverMessage || ''))
}
export function readErrorCode(error) {
  return error?.errorCode || error?.data?.errorCode || ''
}
export function describeContentShareError(error) {
  const code = readErrorCode(error)
  if (code === 'H5_ROUTE_NOT_READY') return '视频互动页面尚未就绪，暂时无法生成内容页分享'
  if (code === 'QR_SLOT_REQUIRED') return '该图文未启用文末码位，无法生成内容页分享'
  if (code === 'CONTENT_SHARE_REQUIRED') return '图文和视频请生成内容页分享，不要使用合图接口'
  if (code === 'INVALID_STATE') return '当前素材状态不允许生成内容页分享'
  if (code === 'IDEMPOTENCY_CONFLICT') return '重复提交冲突，请稍后重试'
  if (isNotFoundError(error)) return '该分享不存在或内容已下线'
  return error?.message || error?.serverMessage || '生成内容页分享失败，请重试'
}
export function describePublicShareError(error) {
  if (isNotFoundError(error)) return '该分享不存在或内容已下线'
  const status = error?.statusCode
  const code = readErrorCode(error)
  if (status === 401 || status === 403 || code === 40100 || code === 40300) {
    return '公开内容页接口尚未就绪，暂时无法匿名查看。不会跳转到邀请注册页。'
  }
  return error?.message || error?.serverMessage || '内容加载失败，请稍后重试'
}
export function describeContentShareBlocker(detail) {
  if (!detail || detail.type === 'image') return ''
  const operations = Array.isArray(detail.allowedOperations) ? detail.allowedOperations : []
  if (detail.type === 'article' && detail.qrSlotAtEnd !== true) return '该图文未启用文末码位，无法生成内容页分享'
  if (detail.type === 'video' && detail.h5RouteReady !== true) return '视频互动页面尚未就绪，暂时无法生成内容页分享'
  if (detail.type === 'video' && detail.videoDeliveryMode && detail.videoDeliveryMode !== 'INTERACTIVE_H5') {
    return '该视频不是互动 H5 形态，无法生成内容页分享'
  }
  if (!operations.includes('create-content-share') && !operations.includes('upload-qr')) {
    return '该素材暂不支持生成内容页分享'
  }
  return ''
}
export function copyLinkTarget(detail) {
  return keepContentShareUrl(detail?.shareUrl)
}
export function shouldRenderArticleEndQr(share) {
  return share?.type === 'article' && share?.qrSlotAtEnd === true && !!keepPreviewUrl(share?.qrImageUrl || '')
}
export function shouldRenderVideoChatQr(share) {
  return share?.type === 'video' && !!keepPreviewUrl(share?.qrImageUrl || '')
}
export function describePublicVideoReadiness(share) {
  if (!share || share.type !== 'video') return ''
  if (share.hasH5RouteReadyField && share.h5RouteReady !== true) {
    return '视频互动页面尚未就绪，暂时无法播放'
  }
  return ''
}
function normalizePublicShare(result) {
  if (!result || typeof result !== 'object') throw new Error('公开分享数据格式异常')
  if (!result.shareId || !result.title || !['article', 'video'].includes(result.type)) throw new Error('公开分享数据格式异常')
  const content = result.type === 'article' ? normalizeMaterialContent(result.content) : null
  return {
    shareId: String(result.shareId),
    type: result.type,
    title: result.title,
    summary: typeof result.summary === 'string' ? result.summary : '',
    coverUrl: keepPreviewUrl(result.coverUrl),
    content,
    qrSlotAtEnd: result.qrSlotAtEnd === true,
    qrImageUrl: keepPreviewUrl(result.qrImageUrl),
    mediaUrl: keepPreviewUrl(result.mediaUrl),
    posterUrl: keepPreviewUrl(result.posterUrl),
    videoDeliveryMode: result.videoDeliveryMode || null,
    h5RouteReady: result.h5RouteReady === true,
    hasH5RouteReadyField: Object.prototype.hasOwnProperty.call(result, 'h5RouteReady'),
  }
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
    return { ...page, hasMore: page.hasMore === true, nextCursor: page.nextCursor || null, items: page.items.map(item => ({ ...item, coverUrl: keepPreviewUrl(item.coverUrl), ...normalizePartnerShareFields(item) })) }
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
      ...normalizePartnerShareFields(result),
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
function normalizeContentShare(result) {
  if (!result?.shareId || !result?.shareUrl || !result?.materialId || !['article', 'video'].includes(result.type)) {
    throw new Error('内容分享结果格式异常')
  }
  const shareUrl = keepContentShareUrl(result.shareUrl)
  if (!shareUrl) throw new Error('返回的不是内容页链接，请勿当作邀请注册页使用')
  return {
    shareId: String(result.shareId),
    shareUrl,
    qrImageUrl: keepPreviewUrl(result.qrImageUrl),
    type: result.type,
    materialId: String(result.materialId),
  }
}
export function createContentShare(id, { qrAssetId, idempotencyKey }) {
  return scoped(async () => {
    if (config.useMock) throw new Error('当前无法生成内容页分享')
    if (!id || !qrAssetId || !idempotencyKey) throw new Error('缺少素材、二维码或请求编号')
    try {
      const result = await request(`/materials/${encodeURIComponent(id)}/content-shares`, { method: 'POST', data: { qrAssetId, idempotencyKey } })
      return normalizeContentShare(result)
    } catch (error) {
      throw Object.assign(new Error(describeContentShareError(error)), { cause: error, statusCode: error?.statusCode, code: error?.code, errorCode: readErrorCode(error), data: error?.data })
    }
  })
}
export function getCurrentContentShare(id) {
  return scoped(async () => {
    if (config.useMock) throw Object.assign(new Error('尚未生成内容页分享'), { statusCode: 404, code: 40400 })
    if (!id) throw new Error('该素材不存在或已下线')
    try {
      return normalizeContentShare(await request(`/materials/${encodeURIComponent(id)}/content-shares/current`))
    } catch (error) {
      if (isNotFoundError(error)) throw Object.assign(new Error('尚未生成内容页分享'), { cause: error, statusCode: error?.statusCode || 404, code: error?.code || 40400, errorCode: readErrorCode(error) })
      throw Object.assign(new Error(describeContentShareError(error)), { cause: error, statusCode: error?.statusCode, code: error?.code, errorCode: readErrorCode(error), data: error?.data })
    }
  })
}
export function getPublicPromoShare(shareId) {
  const id = String(shareId || '').trim()
  if (!id) return Promise.reject(new Error('缺少分享编号'))
  if (config.useMock) return Promise.reject(Object.assign(new Error('该分享不存在或内容已下线'), { statusCode: 404, code: 40400 }))
  return requestPublic(`/api/public/promo-shares/${encodeURIComponent(id)}`).then(normalizePublicShare).catch(error => {
    throw Object.assign(new Error(describePublicShareError(error)), { cause: error, statusCode: error?.statusCode, code: error?.code, errorCode: readErrorCode(error), data: error?.data })
  })
}
