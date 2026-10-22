import { onBackPress } from '@dcloudio/uni-app'
// Direct links/refreshes do not necessarily retain an application page stack on H5.
export function useBusinessReturn() {
  onBackPress(() => {
    const pages = getCurrentPages(), previousRoute = pages[pages.length - 2]?.route
    if (previousRoute && !['pages/login/index','pages/register/index','pages/forgot-password/index'].includes(previousRoute)) return false
    uni.switchTab({ url: '/pages/partners/index' })
    return true
  })
}
