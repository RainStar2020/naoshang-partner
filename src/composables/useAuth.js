import { onShow } from '@dcloudio/uni-app'
import { getSession } from '../services/api'
export function useAuth() { onShow(() => { if (!getSession()) uni.reLaunch({ url: '/pages/login/index' }) }) }
export const demoNotice = (title = '功能筹备中') => uni.showModal({ title, content: '当前为 UI 演示版本，具体功能及 API 将在后续接入。', showCancel: false, confirmText: '知道了' })
