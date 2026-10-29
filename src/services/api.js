import { config } from '../config'
const SESSION_KEY = 'naoshang-session'
// One shared result (including concurrent callers) per authenticated session.
let bootstrapCache = null
export function clearBootstrapCache() { bootstrapCache = null }
export function getBootstrap() { return request('/me/bootstrap') }

export const getSession = () => {
  const session = uni.getStorageSync(SESSION_KEY) || null
  if (config.useMock && session?.user?.id === 'LC0001') session.user = { ...session.user, id: 'VIP0001', displayId: 'VIP0001' }
  return session
}
export const logout = async ({ revoke = true } = {}) => {
  const session = getSession()
  if (revoke && !config.useMock && session?.token) {
    try { await request('/auth/sessions/current', { method: 'DELETE' }) }
    catch (error) { if (error.statusCode !== 401) { uni.showToast?.({ title: '退出未完成，请稍后重试', icon: 'none' }); return false } }
    if (getSession()?.token && getSession()?.token !== session.token) return false
  }
  clearBootstrapCache()
  const accountId = getSession()?.user?.id
  if (accountId) uni.removeStorageSync(`naoshang-learning-identity:${accountId}`)
  uni.removeStorageSync(SESSION_KEY)
  uni.reLaunch({ url: '/pages/login/index' })
  return true
}
export function request(path, options = {}) {
  if (path !== '/me/bootstrap' || (options.method || 'GET') !== 'GET') return sendRequest(path, options)
  const session = getSession()
  if (!session?.token || !session?.user?.id) return Promise.reject(new Error('请先登录'))
  const key = JSON.stringify([session.user.id, session.token])
  if (bootstrapCache?.key === key) return bootstrapCache.promise
  const entry = { key, promise: null }
  bootstrapCache = entry
  entry.promise = sendRequest(path, options).then(result => {
    const current = getSession()
    if (bootstrapCache !== entry || current?.user?.id !== session.user.id || current?.token !== session.token) throw new Error('登录状态已变化，请重新登录后继续')
    return result
  }).catch(error => {
    if (bootstrapCache === entry) clearBootstrapCache()
    throw error
  })
  return entry.promise
}
function sendRequest(path, options = {}) {
  if (!config.baseURL) return Promise.reject(new Error('服务暂不可用，请稍后重试'))
  return new Promise((resolve, reject) => uni.request({
    url: config.baseURL + path, method: options.method || 'GET', data: options.data,
    timeout: config.timeout, header: { ...(getSession()?.token ? { Authorization: `Bearer ${getSession().token}` } : {}), ...options.header },
    success: res => {
      const body = res.data || {}
      const traceId = Object.entries(res.header || {}).find(([name]) => name.toLowerCase() === 'x-trace-id')?.[1]
      const isV2 = (body.status === 0 || body.status === 1) && Object.hasOwn(body, 'response')
      const rejectResponse = (message, extra = {}) => {
        const error = Object.assign(new Error(message), {
          statusCode: res.statusCode, code: body.code, requestId: body.requestId,
          traceId, errors: body.errors, fieldErrors: body.errors ?? body.fieldErrors,
          verifyFailCount: body.verifyFailCount, verifyLocked: body.verifyLocked,
          serverMessage: body.message || body.error, ...extra
        })
        console.error('API request failed', { path, statusCode: res.statusCode, code: body.code, traceId })
        reject(error)
      }
      if (res.statusCode === 401) { logout({ revoke: false }); rejectResponse(body.message || '登录已过期'); return }
      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (isV2) {
          if (body.status === 1) resolve(body.response)
          else rejectResponse(body.message || '请求未完成，请稍后重试')
          return
        }
        if (body.ok === false || body.success === false || (typeof body.code === 'number' && body.code !== 0)) {
          rejectResponse(body.message || body.error || '请求未完成，请稍后重试')
          return
        }
        if (res.data?.locked === true && res.data?.entitlementState) {
          reject(Object.assign(new Error(res.data.message || res.data.error || '当前账号尚未开通此项权益，请先完成开通'), {
            statusCode: res.statusCode, code: 'ENTITLEMENT_REQUIRED',
            entitlementState: res.data.entitlementState, entitlement: res.data.entitlement
          }))
          return
        }
        resolve(typeof body.code === 'number' && body.code === 0 && Object.hasOwn(body, 'data') ? body.data : res.data); return
      }
      const statusCode = res.statusCode
      const fallback = statusCode === 403 ? '暂无权限访问此内容' : statusCode === 404 ? '所需信息不存在或已更新，请刷新后重试' : statusCode === 408 || statusCode === 504 ? '请求超时，请稍后重试' : statusCode === 429 ? '操作过于频繁，请稍后再试' : statusCode >= 500 ? '服务暂时繁忙，请稍后再试' : '请求未完成，请检查填写内容后重试'
      const message = body.message || body.error || fallback
      rejectResponse(message)
    }, fail: error => reject(Object.assign(new Error('网络连接异常，请检查网络后重试'), { cause: error }))
  }))
}
export async function login(data) {
  if (config.useMock && data.channel === 'coach') throw new Error('请联系门店开通健脑官账号')
  const result = config.useMock ? { token: 'demo-local-token', user: { name: '脑商体验官', id: 'VIP0001', displayId: 'VIP0001', role: '家长' } } : await request('/auth/sessions', { method: 'POST', data })
  if (!result?.token || !result?.user?.id) throw new Error('登录未完成，请稍后重试')
  if (result.accountType && !['parent', 'coach'].includes(result.accountType)) throw new Error('当前账号暂不支持登录，请联系平台客服')
  const session = { ...result, accountType: result.accountType || 'parent' }
  uni.removeStorageSync(`naoshang-learning-identity:${session.user.id}`)
  clearBootstrapCache()
  uni.setStorageSync(SESSION_KEY, session)
  if (!config.useMock && session.accountType === 'parent') await getBootstrap()
  return session
}
export const getLevels = () => config.useMock ? Promise.resolve(['超级记忆','实用记忆','语文系统','外语系统','百科系统','导图大师','速读大师','记忆大师','潜能开发','未来领袖'].map((name, i) => ({ id: i + 1, name, unlocked: false }))) : request('/member/levels')
export const getPartners = () => config.useMock ? Promise.resolve([{ title: '城市合伙人', desc: '连接优质教育资源，共建成长生态', tag: '合作共赢' }, { title: '学习中心', desc: '陪伴每一个家庭，发现更多可能', tag: '共同成长' }]) : request('/partners')
export const getProducts = () => config.useMock ? Promise.resolve([{ title: '记忆力启蒙体验课', type: '能力启蒙', desc: '从兴趣出发，开启记忆探索之旅' }, { title: '专注力成长计划', type: '成长训练', desc: '培养学习习惯，积累成长的力量' }]) : request('/products')
