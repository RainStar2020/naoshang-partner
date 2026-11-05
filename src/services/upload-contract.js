/** fileId and assetId are aliases; only READY resources may be bound. */
export function normalizeUploadIntent(intent) {
  const id = intent?.assetId || intent?.fileId
  if (!id || (intent.assetId && intent.fileId && intent.assetId !== intent.fileId)) throw new Error('上传资源编号异常')
  return { ...intent, assetId: id, fileId: id }
}
export const isUploadReady = result => String(result?.status || '').toUpperCase() === 'READY'

const imageKinds = Object.freeze({
  png: { ext: 'png', mimeType: 'image/png' },
  jpg: { ext: 'jpg', mimeType: 'image/jpeg' },
  jpeg: { ext: 'jpg', mimeType: 'image/jpeg' },
  jpe: { ext: 'jpg', mimeType: 'image/jpeg' },
  pjpeg: { ext: 'jpg', mimeType: 'image/jpeg' },
})

function imageToken(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return ''
  if (raw.includes('/')) return raw.split('/').pop().split(';')[0].trim()
  const path = raw.split(/[?#]/)[0]
  const slash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  const name = slash >= 0 ? path.slice(slash + 1) : path
  const dot = name.lastIndexOf('.')
  if (dot >= 0) return name.slice(dot + 1)
  return name
}

/**
 * Resolve png/jpg from getImageInfo.type, chooseImage mime, or filename.
 * H5 often returns empty getImageInfo.type for valid JPEGs.
 */
export function resolveImageKind(file = {}, imageInfo = {}) {
  const hints = [imageInfo?.type, file?.type, file?.mimeType, file?.name, file?.path, file?.tempFilePath]
  for (const hint of hints) {
    const kind = imageKinds[imageToken(hint)]
    if (kind) return kind
  }
  return null
}
