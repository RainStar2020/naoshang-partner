/** fileId and assetId are aliases; only READY resources may be bound. */
export function normalizeUploadIntent(intent) {
  const id = intent?.assetId || intent?.fileId
  if (!id || (intent.assetId && intent.fileId && intent.assetId !== intent.fileId)) throw new Error('上传资源编号异常')
  return { ...intent, assetId: id, fileId: id }
}
export const isUploadReady = result => String(result?.status || '').toUpperCase() === 'READY'
