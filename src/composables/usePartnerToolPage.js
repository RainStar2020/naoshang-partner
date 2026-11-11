import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useAuth } from './useAuth'
import { useBusinessReturn } from './useBusinessReturn'
import { useFreshOnShow } from './useFreshOnShow'

// Page lifecycle hooks must run from the page setup, not a child component.
export function usePartnerToolPage() {
  useAuth()
  useBusinessReturn()
  const page = ref(null)
  const query = ref(null)
  onLoad(options => { query.value = options })
  const fresh = useFreshOnShow(() => {
    if (!query.value) return null
    return opts => page.value?.refresh?.(opts)
  })
  return { page, query, markStale: fresh.markStale }
}
