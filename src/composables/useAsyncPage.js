import { ref, onUnmounted } from 'vue'
import { onShow, onUnload } from '@dcloudio/uni-app'
export function useAsyncPage(loader, auto = true) {
  const data = ref(null), status = ref('loading'), error = ref('')
  let epoch = 0
  async function load() {
    const current = ++epoch; status.value = 'loading'; error.value = ''
    try { const result = await loader(); if (current === epoch) { data.value = result; status.value = 'ready' } }
    catch (reason) { if (current === epoch) { error.value = reason.message || '加载失败，请重试'; status.value = reason.code === 'FORBIDDEN' ? 'forbidden' : 'error' } }
  }
  onUnload(() => { ++epoch }); onUnmounted(() => { ++epoch }); if (auto) onShow(load)
  return { data, status, error, load }
}
