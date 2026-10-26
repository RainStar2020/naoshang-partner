export const money = value => Number.isInteger(value) ? (value / 100).toFixed(2) : '—'
export const percent = value => Number.isFinite(value) ? `${Number((value / 100).toFixed(2))}%` : '—'
export const applicationStatus = value => ({ PENDING_PAYMENT: '待付款', PENDING_REVIEW: '待门店审核', APPROVED: '已通过', REJECTED: '已拒绝', CANCELLED: '已取消' }[value] || '状态待确认')
