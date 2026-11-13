/** Income settlement / withdrawable display rules. Amounts stay in yuan. */

const UNSETTLED_CODES = new Set([
  'PENDING',
  'PENDING_SETTLEMENT',
  'PENDING_ALLOCATION',
])

export function isUnsettledIncomeStatus(value) {
  if (value == null || value === '') return false
  const text = String(value).trim()
  if (!text || text.toUpperCase() === 'NONE') return false
  const upper = text.toUpperCase().replace(/-/g, '_')
  if (upper === 'SETTLED' || upper === 'SUCCEEDED' || upper === 'PAID' || upper === 'COMPLETED') return false
  if (UNSETTLED_CODES.has(upper)) return true
  if (text.includes('待分配') || text.includes('待结算')) return true
  return false
}

function firstUnsettledValue(item) {
  if (isUnsettledIncomeStatus(item?.allocationStatus)) {
    const upper = String(item.allocationStatus).trim().toUpperCase().replace(/-/g, '_')
    if (upper === 'PENDING' || upper === 'PENDING_ALLOCATION') return 'PENDING_ALLOCATION'
    return item.allocationStatus
  }
  const fields = [item?.settlementStatus, item?.status, item?.settleStatus]
  for (const value of fields) {
    if (!isUnsettledIncomeStatus(value)) continue
    const upper = String(value).trim().toUpperCase().replace(/-/g, '_')
    if (upper === 'SETTLED') continue
    if (upper === 'PENDING') return 'PENDING_SETTLEMENT'
    return value
  }
  return 'PENDING_SETTLEMENT'
}

export function unsettledIncomeNote(item) {
  const settle = String(item?.settlementStatus || item?.allocationStatus || item?.status || '')
  const upper = settle.toUpperCase().replace(/-/g, '_')
  if (upper === 'PENDING_ALLOCATION' || settle.includes('待分配') || upper === 'PENDING' && item?.allocationStatus === 'PENDING') {
    return '待分配提成，暂不可提现'
  }
  return '待结算，暂不可提现'
}

export function normalizeIncomeEntry(item) {
  if (!item || typeof item !== 'object') return item
  const flags = [item.status, item.settlementStatus, item.allocationStatus, item.settleStatus]
  if (!flags.some(isUnsettledIncomeStatus)) return item
  const settlementStatus = isUnsettledIncomeStatus(item.settlementStatus) && String(item.settlementStatus).toUpperCase() !== 'SETTLED'
    ? item.settlementStatus
    : firstUnsettledValue(item)
  const next = {
    ...item,
    settlementStatus,
    withdrawable: false,
  }
  if (!next.pendingNote) next.pendingNote = unsettledIncomeNote(next)
  return next
}

function textTokens(item) {
  return [item?.category, item?.bizType, item?.bizTypeLabel, item?.title, item?.type, item?.incomeChannel, item?.id]
    .map(value => String(value || '').trim())
    .filter(Boolean)
}

export function isPeriodicAwardOrPoolEntry(item) {
  if (!item || typeof item !== 'object') return false
  const tokens = textTokens(item)
  const id = String(item.id || '')
  const match = pattern => tokens.some(text => pattern.test(text)) || pattern.test(id)
  if (match(/^(founding|founder)$/i) || match(/创始奖/) || /founder-award/i.test(id) || /^founding-/.test(id)) return true
  if (match(/^(global)$/i) || match(/全球奖/) || /global-award/i.test(id) || /^global-/.test(id)) return true
  if (match(/分红池/) || match(/dividendPool/i) || match(/^dividend[_-]?pool$/i)) return true
  return false
}

export function presentIncomeEntries(items) {
  const list = Array.isArray(items) ? items : []
  return list.map(normalizeIncomeEntry).filter(item => !isPeriodicAwardOrPoolEntry(item))
}
