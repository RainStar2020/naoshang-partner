import { onShow } from '@dcloudio/uni-app'
import { createFreshnessTracker, DEFAULT_FRESH_TTL_MS } from '../services/freshness'

/**
 * Skip onShow refresh while data is still fresh (TTL) unless a write bumped freshness.
 * @param {() => (undefined | ((opts?: object) => any))} getRefresh
 * @param {{ ttlMs?: number }} [options]
 */
export function useFreshOnShow(getRefresh, options = {}) {
  const ttlMs = Number.isFinite(options.ttlMs) ? options.ttlMs : DEFAULT_FRESH_TTL_MS
  const tracker = createFreshnessTracker(ttlMs)

  async function refreshIfNeeded(opts = {}) {
    if (!tracker.shouldRefresh(opts)) return false
    const refresh = typeof getRefresh === 'function' ? getRefresh() : null
    if (!refresh) return false
    await Promise.resolve(refresh({ silent: true, ...opts }))
    tracker.markLoaded()
    return true
  }

  onShow(() => { refreshIfNeeded({ silent: true }) })

  return {
    markLoaded: tracker.markLoaded,
    markStale: tracker.markStale,
    shouldRefresh: tracker.shouldRefresh,
    refreshIfNeeded,
  }
}
