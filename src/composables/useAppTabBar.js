import { onShow } from '@dcloudio/uni-app'
// Keep native tab routes/caching for switchTab; render the design's capsule in Vue.
export function useAppTabBar() {
  onShow(() => uni.hideTabBar({ animation: false }))
}
