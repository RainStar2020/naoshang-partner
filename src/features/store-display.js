export function storePhotoUrl(store) {
  if (!store || typeof store !== 'object') return ''
  const value = store.storefrontUrl
    || store.storefrontPhotoUrl
    || store.coverUrl
    || store.imageUrl
    || store.storeImage
    || store.photoUrl
    || store.photo
    || store.cover
    || ''
  return typeof value === 'string' ? value.trim() : ''
}

export function storeDisplayAddress(store) {
  if (!store || typeof store !== 'object') return ''
  const full = store.fullAddress || store.full_address
  if (typeof full === 'string' && full.trim()) return full.trim()
  const region = Array.isArray(store.regionNames)
    ? store.regionNames.filter(Boolean).join('')
    : ''
  const street = String(store.address || store.storeAddress || '').trim()
  return `${region}${street}`
}

export function storeFeeAmount(store) {
  if (!store || typeof store !== 'object') return null
  const amount = Number(
    store.feeAmount
    ?? store.monthlyFee
    ?? store.monthlyFeeYuan
    ?? store.costoreFee
    ?? store.fee,
  )
  return Number.isFinite(amount) ? amount : null
}
