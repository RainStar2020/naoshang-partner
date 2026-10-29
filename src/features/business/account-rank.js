const ACCOUNT_RANKS = [
  { code: 'VIP', levelName: 'VIP合伙人', partner: true, benefits: 1, price: 998000 },
  { code: 'QZ', levelName: '普通用户', partner: false, benefits: 0, price: 0 },
  { code: 'TS', levelName: '天使合伙人', partner: true, benefits: 3, price: 2980000 },
  { code: 'SD', levelName: '私董合伙人', partner: true, benefits: 6, price: 5980000 },
  { code: 'LC', levelName: '联创合伙人', partner: true, benefits: 24, price: 23980000 },
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

// Per-VIP unit prices (fen) used for purchase / transfer totals by recipient rank.
const VIP_QUOTA_PRICES = {
  VIP合伙人: 798000,
  天使合伙人: 750000,
  私董合伙人: 698000,
  联创合伙人: 650000,
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
