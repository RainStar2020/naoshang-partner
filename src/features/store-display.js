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

export function storeManager(store) {
  if (!store || typeof store !== 'object') return { name: '', phone: '' }
  let name = String(store.managerName || store.manager?.name || '').trim()
  let phone = String(store.managerPhone || store.manager?.phone || '').trim()
  const raw = store.manager
  if (typeof raw === 'string' && raw.trim()) {
    const parts = raw.split('/').map(part => part.trim()).filter(Boolean)
    if (!name && parts.length > 1) name = parts[0]
    if (!phone && parts[1]) phone = parts[1]
    const phoneMatch = raw.match(/1[3-9]\d{9}/)
    if (!phone && phoneMatch) phone = phoneMatch[0]
    if (!name) name = raw.replace(phoneMatch?.[0] || '', '').replace(/\//g, '').trim()
  }
  return { name, phone }
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
