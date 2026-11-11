/**
 * Metric display helpers: pending metrics must not fall back to "0".
 * A real 0 is only shown when a finite number was provided by the API.
 */

/** First finite number among candidates; otherwise undefined (still pending / absent). */
export function pickMetricNumber(...values) {
  for (const value of values) {
    if (value == null || value === '') continue
    const n = typeof value === 'number' ? value : Number(value)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

/**
 * @param {unknown} value
 * @param {{ pending?: boolean, fallback?: string }} [options]
 * @returns {string|null} null means caller should render a skeleton
 */
export function formatMetricCount(value, options = {}) {
  if (options.pending) return null
  if (value == null || value === '') return options.fallback ?? '0'
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isFinite(n)) return String(n)
  if (typeof value === 'string' && value.trim()) return value.trim()
  return options.fallback ?? '0'
}

/**
 * Pending when no finite value yet and the page is still loading metrics.
 * Once `settled` (enrich finished / overview ready without pending flag), missing → show 0.
 */
export function isMetricPending(value, { settled = true } = {}) {
  if (pickMetricNumber(value) != null) return false
  return !settled
}

/**
 * Format count for report summary cells.
 * Returns null when caller should render MetricSkeleton.
 */
export function formatMetricCountOrNull(value, { settled = true, suffix = '' } = {}) {
  const n = pickMetricNumber(value)
  if (n != null) return `${n}${suffix}`
  if (!settled) return null
  return `0${suffix}`
}

/**
 * Signed money label for income rows/detail.
 * Returns null when amount is still unknown (caller → MetricSkeleton).
 */
export function formatSignedMetricMoney(value, moneyFn) {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return null
  const body = typeof moneyFn === 'function' ? moneyFn(Math.abs(n)) : String(Math.abs(n))
  if (n < 0) return `-${body}`
  return `+${body}`
}
