// Money fields are yuan across live APIs and UI display.
// Integers omit trailing decimals; non-integers keep up to two places.
export const money = value => {
  const number = Number(value)
  if (!Number.isFinite(number)) return '—'
  const rounded = Number(number.toFixed(2))
  if (Number.isInteger(rounded)) return String(rounded)
  return rounded.toFixed(2)
}
// rateBps / percent values remain basis points (divide by 100 for display).
export const percent = value => Number.isFinite(value) ? `${Number((value / 100).toFixed(2))}%` : '—'
export const applicationStatus = value => ({ PENDING_PAYMENT: '待付款', PENDING_REVIEW: '待门店审核', APPROVED: '已通过', REJECTED: '已拒绝', CANCELLED: '已取消' }[value] || '状态待确认')
