import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useAuth } from './useAuth'
import { useBusinessReturn } from './useBusinessReturn'

// Page lifecycle hooks must run from the page setup, not a child component.
export function usePartnerToolPage() {
  useAuth()
  useBusinessReturn()
  const page = ref(null)
  const query = ref(null)
  onLoad(options => { query.value = options })
  onShow(() => { if (query.value) page.value?.refresh() })
  return { page, query }
}
