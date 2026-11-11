import { ref, onUnmounted } from 'vue'
import { onShow, onUnload } from '@dcloudio/uni-app'
import { createFreshnessTracker, DEFAULT_FRESH_TTL_MS } from '../services/freshness'

/**
 * Normalize the second argument:
 * - boolean → { auto }
 * - object → options ({ auto, freshTtlMs })
 */
function resolveOptions(autoOrOptions = true) {
  if (typeof autoOrOptions === 'boolean') {
    return {
      auto: autoOrOptions,
      // Auto pages default to 30s freshness; auto:false has no onShow gate.
      freshTtlMs: autoOrOptions ? DEFAULT_FRESH_TTL_MS : 0,
    }
  }
  const options = autoOrOptions && typeof autoOrOptions === 'object' ? autoOrOptions : {}
  const auto = options.auto !== false
  const freshTtlMs = Number.isFinite(options.freshTtlMs)
    ? Math.max(0, Number(options.freshTtlMs))
    : (auto ? DEFAULT_FRESH_TTL_MS : 0)
  return { auto, freshTtlMs }
}

/**
 * Page data loader with silent refresh + optional freshness TTL on onShow.
 * - First load / force: full-page loading gate
 * - Return visits with existing data: keep ready and refresh in background
 * - auto onShow skips refresh while TTL fresh unless a write bumped freshness
 *
 * @param {(options?: object) => any} loader
 * @param {boolean | { auto?: boolean, freshTtlMs?: number }} [autoOrOptions=true]
 */
export function useAsyncPage(loader, autoOrOptions = true) {
  const { auto, freshTtlMs } = resolveOptions(autoOrOptions)
  const data = ref(null)
  const status = ref('loading')
  const error = ref('')
  const refreshing = ref(false)
  const tracker = createFreshnessTracker(freshTtlMs)
  let epoch = 0

  async function load(options = {}) {
    const force = options.force === true
    const silent = options.silent === true || (!force && data.value != null && status.value === 'ready')
    const current = ++epoch
    error.value = ''
    if (silent) refreshing.value = true
    else {
      status.value = 'loading'
      refreshing.value = false
    }
    try {
      const result = await loader(options)
      if (current !== epoch) return
      data.value = result
      status.value = 'ready'
      tracker.markLoaded()
    } catch (reason) {
      if (current !== epoch) return
      error.value = reason.message || '页面暂时无法加载，请点击重试'
      // Keep stale content on silent failure; only gate the page when empty or forced.
      if (!silent || data.value == null) {
        status.value = reason.code === 'FORBIDDEN' ? 'forbidden' : 'error'
      }
    } finally {
      if (current === epoch) refreshing.value = false
    }
  }

  onUnload(() => { ++epoch })
  onUnmounted(() => { ++epoch })
  if (auto) {
    onShow(() => {
      if (!tracker.shouldRefresh()) return
      load({ silent: data.value != null && status.value === 'ready' })
    })
  }
  return {
    data,
    status,
    error,
    refreshing,
    load,
    markLoaded: tracker.markLoaded,
    markStale: tracker.markStale,
    shouldRefresh: tracker.shouldRefresh,
  }
}
