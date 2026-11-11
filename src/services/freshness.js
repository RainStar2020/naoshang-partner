/** Bumped on mutating API success / logout so tab pages re-fetch after writes. */
let generation = 0

export const DEFAULT_FRESH_TTL_MS = 30000

export function dataFreshness() {
  return generation
}

export function bumpDataFreshness() {
  generation += 1
  return generation
}

/**
 * Shared TTL + generation gate used by useFreshOnShow and useAsyncPage.
 * @param {number} [ttlMs]
 */
export function createFreshnessTracker(ttlMs = DEFAULT_FRESH_TTL_MS) {
  const ttl = Number.isFinite(ttlMs) ? Math.max(0, Number(ttlMs)) : DEFAULT_FRESH_TTL_MS
  let lastLoadedAt = 0
  let seenGeneration = dataFreshness()

  function markLoaded() {
    lastLoadedAt = Date.now()
    seenGeneration = dataFreshness()
  }

  function markStale() {
    lastLoadedAt = 0
  }

  function shouldRefresh({ force = false } = {}) {
    if (force) return true
    // ttl <= 0 keeps legacy "refresh every onShow" behavior.
    if (ttl <= 0) return true
    if (seenGeneration !== dataFreshness()) return true
    if (!lastLoadedAt) return true
    return Date.now() - lastLoadedAt >= ttl
  }

  return { markLoaded, markStale, shouldRefresh, ttlMs: ttl }
}
