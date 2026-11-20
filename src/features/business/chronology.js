function timestamp(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value < 1e11 ? value * 1000 : value
  if (typeof value !== 'string' || !value.trim()) return NaN
  if (/^\d+$/.test(value.trim())) {
    const numeric = Number(value)
    return Number.isFinite(numeric) ? (numeric < 1e11 ? numeric * 1000 : numeric) : NaN
  }
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : NaN
}

function ordered(items, valueOf) {
  return [...(Array.isArray(items) ? items : [])]
    .map((item, index) => ({ item, index, value: valueOf(item) }))
    .sort((left, right) => {
      const leftValid = Number.isFinite(left.value)
      const rightValid = Number.isFinite(right.value)
      if (leftValid && rightValid && left.value !== right.value) return right.value - left.value
      if (leftValid !== rightValid) return leftValid ? -1 : 1
      return left.index - right.index
    })
    .map(({ item }) => item)
}

/** Sort records newest first, retaining source order for equal or missing timestamps. */
export function sortByRecent(items, fields = ['createdAt']) {
  return ordered(items, item => {
    for (const field of fields) {
      const value = timestamp(item?.[field])
      if (Number.isFinite(value)) return value
    }
    return NaN
  })
}

/** Sort period reports by YYYY-MM (or a parseable month string), newest first. */
export function sortByRecentMonth(items, field = 'month') {
  return ordered(items, item => {
    const value = String(item?.[field] ?? '').trim()
    const match = value.match(/^(\d{4})[-/](\d{1,2})$/)
    if (match) return Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)
    return timestamp(value)
  })
}
