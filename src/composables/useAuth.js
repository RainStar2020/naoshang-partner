import { onShow } from '@dcloudio/uni-app'
import { getSession } from '../services/api'
import { accountHome, canOpenAccountPage } from '../services/account-channel'
export function useAuth() { onShow(() => {
  const session = getSession()
  if (!session) { uni.reLaunch({ url: '/pages/login/index' }); return }
  const route = getCurrentPages().slice(-1)[0]?.route
  if (route && !canOpenAccountPage(session, route)) uni.reLaunch({ url: accountHome(session) })
}) }
export const demoNotice = (title = '功能筹备中') => uni.showModal({ title, content: '该功能正在完善中，敬请期待。', showCancel: false, confirmText: '知道了' })
