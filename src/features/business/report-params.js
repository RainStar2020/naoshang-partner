/** Query for wholesale report loads. Omit unused month/filter so GET cache matches prefetch. */
export function wholesaleReportParams(toolId, { month, filter, cursor } = {}) {
  const params = {}
  if (cursor) params.cursor = cursor
  if (toolId === 'global-awards' && month) params.month = month
  if (toolId === 'experience' && filter) params.filter = filter
  return params
}