import { config } from '../config'
const SESSION_KEY = 'naoshang-session'
export const getSession = () => uni.getStorageSync(SESSION_KEY) || null
export const logout = () => {
  const accountId = getSession()?.user?.id
  if (accountId) uni.removeStorageSync(`naoshang-learning-identity:${accountId}`)
  uni.removeStorageSync(SESSION_KEY)
  uni.reLaunch({ url: '/pages/login/index' })
}
export function request(path, options = {}) {
  if (!config.baseURL) return Promise.reject(new Error('请先配置 API 地址'))
  return new Promise((resolve, reject) => uni.request({
    url: config.baseURL + path, method: options.method || 'GET', data: options.data,
    timeout: config.timeout, header: { ...(getSession()?.token ? { Authorization: `Bearer ${getSession().token}` } : {}), ...options.header },
    success: res => { if (res.statusCode === 401) { logout(); reject(new Error('登录已过期')); return } res.statusCode >= 200 && res.statusCode < 300 ? resolve(res.data) : reject(Object.assign(new Error(res.data?.message || '请求失败'),{statusCode:res.statusCode,code:res.data?.code,requestId:res.data?.requestId})) }, fail: reject
  }))
}
export async function login(data) {
  const result = config.useMock ? { token: 'demo-local-token', user: { name: '脑商体验官', id: 'LC0001', role: '家长' } } : await request('/auth/login', { method: 'POST', data })
  uni.setStorageSync(SESSION_KEY, result)
  return result
}
export const getLevels = () => config.useMock ? Promise.resolve(['超级记忆','实用记忆','语文系统','外语系统','百科系统','导图大师','速读大师','记忆大师','潜能开发','未来领袖'].map((name, i) => ({ id: i + 1, name, unlocked: false }))) : request('/member/levels')
export const getPartners = () => config.useMock ? Promise.resolve([{ title: '城市合伙人', desc: '连接优质教育资源，共建成长生态', tag: '合作共赢' }, { title: '学习中心', desc: '陪伴每一个家庭，发现更多可能', tag: '共同成长' }]) : request('/partners')
export const getProducts = () => config.useMock ? Promise.resolve([{ title: '记忆力启蒙体验课', type: '能力启蒙', desc: '从兴趣出发，开启记忆探索之旅' }, { title: '专注力成长计划', type: '成长训练', desc: '培养学习习惯，积累成长的力量' }]) : request('/products')
