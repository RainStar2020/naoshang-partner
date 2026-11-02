// Prices are yuan (same unit as live APIs / money()).
const ACCOUNT_RANKS = [
  { code: 'VIP', levelName: 'VIP合伙人', partner: true, benefits: 1, price: 9980 },
  { code: 'QZ', levelName: '普通用户', partner: false, benefits: 0, price: 0 },
  { code: 'TS', levelName: '天使合伙人', partner: true, benefits: 3, price: 29800 },
  { code: 'SD', levelName: '私董合伙人', partner: true, benefits: 6, price: 59800 },
  { code: 'LC', levelName: '联创合伙人', partner: true, benefits: 24, price: 239800 },
]

export function accountRank(id = '') {
  const value = String(id || '').toUpperCase()
  return ACCOUNT_RANKS.find(item => value.startsWith(item.code)) || null
}

export function isOrdinaryAccount(id, partnerStatus) {
  const rank = accountRank(id)
  if (rank) return !rank.partner
  return partnerStatus === 'NONE'
}

export function partnerLevelPrice(levelName) {
  const rank = ACCOUNT_RANKS.find(item => item.levelName === levelName)
  return Number.isInteger(rank?.price) ? rank.price : null
}

// Display copy for wholesale ranks. Keep API rank keys for permission checks.
const WHOLESALE_LEVEL_COPY = {
  vip: '小批发商',
  VIP: '小批发商',
  VIP合伙人: '小批发商',
  小批发商: '小批发商',
  angel: '中批发商',
  ANGEL: '中批发商',
  天使: '中批发商',
  天使合伙人: '中批发商',
  中批发商: '中批发商',
  private: '大批发商',
  PRIVATE: '大批发商',
  私董: '大批发商',
  私董合伙人: '大批发商',
  大批发商: '大批发商',
  cofounder: '总批发商',
  COFOUNDER: '总批发商',
  联创: '总批发商',
  联创合伙人: '总批发商',
  总批发商: '总批发商',
}

export function wholesaleLevelDisplay(value) {
  const key = String(value || '').trim()
  if (!key) return ''
  return WHOLESALE_LEVEL_COPY[key] || WHOLESALE_LEVEL_COPY[key.toLowerCase()] || key
}

// Per-VIP unit prices (yuan) used for purchase / transfer totals by recipient rank.
const VIP_QUOTA_PRICES = {
  VIP合伙人: 7980,
  天使合伙人: 7500,
  私董合伙人: 6980,
  联创合伙人: 6500,
}

export function vipQuotaUnitPrice(levelName) {
  if (Number.isInteger(VIP_QUOTA_PRICES[levelName])) return VIP_QUOTA_PRICES[levelName]
  return VIP_QUOTA_PRICES.VIP合伙人
}

export function partnerPromotion(id) {
  const ladder = ACCOUNT_RANKS.filter(item => item.partner)
  const rank = accountRank(id)
  const index = Math.max(0, ladder.findIndex(item => item.code === rank?.code))
  const before = ladder[index] || ladder[0]
  const after = ladder[Math.min(index + 1, ladder.length - 1)]
  return { beforeName: before.levelName, afterName: after.levelName, beforeQuota: before.benefits, afterQuota: after.benefits }
}

// Prefer wire fields (already normalized to fen by the business adapter). Fall back to the local ladder.
export function partnerUpgradeQuote(promotion = {}) {
  const paid = Number.isInteger(promotion.paidAmount) ? promotion.paidAmount : partnerLevelPrice(promotion.beforeName)
  const standard = Number.isInteger(promotion.standardAmount) ? promotion.standardAmount : partnerLevelPrice(promotion.afterName)
  const difference = Number.isInteger(promotion.differenceAmount)
    ? promotion.differenceAmount
    : (Number.isInteger(standard) && Number.isInteger(paid) ? standard - paid : null)
  return { paid, standard, difference }
}
