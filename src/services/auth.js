import { config } from '../config'
import { request } from './api'
import { clearInvitation, getInvitation, parseParams } from './invitation'
const codes = new Map()
let resetProof = null
let wechatBinding = null
export const validPhone = value => /^1\d{10}$/.test(value)
export function validatePassword(password, confirmation) {
  if (password.length < 6 || password.length > 32 || /\s/.test(password)) throw new Error('密码需为 6–32 位且不包含空格')
  if (password !== confirmation) throw new Error('两次输入的密码不一致')
}
const keyFor = (phone, purpose) => `${purpose}:${phone}`
export const smsRemaining = (phone, purpose) => Math.max(0, Math.ceil(((codes.get(keyFor(phone, purpose))?.retryAt || 0) - Date.now()) / 1000))
export async function sendSms(phone, purpose) {
  if (!validPhone(phone)) throw new Error('请输入正确的手机号')
  if (smsRemaining(phone, purpose)) throw new Error('请稍后再获取验证码')
  const result = config.useMock ? {} : await request('/auth/sms-challenges', { method: 'POST', data: { phone, purpose } })
  codes.set(keyFor(phone, purpose), { expiresAt: Date.now() + 5 * 60 * 1000, retryAt: Date.now() + (result.retryAfter || 60) * 1000 })
  if (config.useMock) uni.showModal({ title: '模拟短信验证码', content: '当前未发送真实短信。演示验证码为 123456，5 分钟内有效。', showCancel: false })
}
function checkMockCode(phone, purpose, code) {
  const entry = codes.get(keyFor(phone, purpose))
  if (!entry || entry.expiresAt < Date.now()) throw new Error('请先获取验证码，或重新获取已过期的验证码')
  if (code !== '123456') throw new Error('验证码不正确')
}
function saveSession(result) {
  const session = { ...result, accountType: result.accountType || 'parent' }
  if (session.user?.id) uni.removeStorageSync(`naoshang-learning-identity:${session.user.id}`)
  uni.setStorageSync('naoshang-session', session)
  return session
}
export function getWechatBinding() {
  if (wechatBinding?.expiresAt > Date.now()) return wechatBinding
  wechatBinding = null
  return null
}
function bindWechat(result) {
  if (!result.registrationTicket) throw new Error('微信授权结果缺少注册凭证')
  wechatBinding = { ticket: result.registrationTicket, expiresAt: Date.now() + 10 * 60 * 1000 }
}
export async function beginWechat() {
  if (config.useMock) {
    const accepted = await new Promise(resolve => uni.showModal({ title: '微信授权演示', content: '后端尚未接入，本次模拟微信授权，继续后前往注册页完善手机号、密码和地区。', success: res => resolve(res.confirm) }))
    if (!accepted) return false
    bindWechat({ registrationTicket: 'mock-wechat-registration' })
    return true
  }
  // #ifdef MP-WEIXIN
  const auth = await new Promise((resolve, reject) => uni.login({ provider: 'weixin', success: resolve, fail: () => reject(new Error('微信登录取消或失败，请重试')) }))
  if (!auth.code) throw new Error('未获取到微信登录凭证')
  bindWechat(await request('/auth/wechat/exchanges', { method: 'POST', data: { code: auth.code, platform: 'mp-weixin', inviteCode: getInvitation() } }))
  return true
  // #endif
  // #ifdef H5
  const redirectUri = window.location.origin + window.location.pathname + '#/pages/login/index'
  const result = await request('/auth/wechat/authorizations', { method: 'POST', data: { redirectUri, inviteCode: getInvitation() } })
  if (!result.url || !result.state || !/^https:\/\/(open\.weixin\.qq\.com|open\.weixin\.qq\.com\.cn)\//.test(result.url)) throw new Error('请先配置微信网页授权地址')
  uni.setStorageSync('naoshang-wechat-state', { state: result.state, expiresAt: Date.now() + 10 * 60 * 1000 })
  window.location.assign(result.url)
  return false
  // #endif
  throw new Error('当前平台暂不支持微信登录')
}
export async function finishWechatCallback() {
  // #ifdef H5
  const query = { ...parseParams(window.location.search), ...parseParams(window.location.hash.split('?')[1]) }
  if (!query.code) return false
  // Consume the one-time callback parameters without retaining the code in history.
  const url = new URL(window.location.href)
  url.searchParams.delete('code'); url.searchParams.delete('state')
  const [hashPath, hashQuery] = url.hash.split('?')
  const params = new URLSearchParams(hashQuery || '')
  params.delete('code'); params.delete('state')
  url.hash = hashPath + (params.toString() ? '?' + params.toString() : '')
  window.history.replaceState(null, '', url.toString())
  const pending = uni.getStorageSync('naoshang-wechat-state')
  uni.removeStorageSync('naoshang-wechat-state')
  if (!pending || pending.expiresAt < Date.now() || pending.state !== query.state) throw new Error('微信授权已过期，请重新登录')
  bindWechat(await request('/auth/wechat/exchanges', { method: 'POST', data: { code: query.code, state: query.state, platform: 'h5', inviteCode: getInvitation() } }))
  return true
  // #endif
  return false
}
export async function registerAccount(data) {
  if (!validPhone(data.phone)) throw new Error('请输入正确的手机号')
  if (!/^\d{6}$/.test(data.code)) throw new Error('请输入 6 位验证码')
  validatePassword(data.password, data.confirmation)
  if (!Array.isArray(data.regionCodes) || data.regionCodes.length !== 3) throw new Error('请选择所在地区')
  if (data.inviteCode && !/^[a-zA-Z0-9_-]{1,64}$/.test(data.inviteCode)) throw new Error('邀请码格式不正确')
  const binding = getWechatBinding()
  if (data.source === 'wechat' && !binding) throw new Error('微信授权已过期，请返回登录页重新授权')
  const { confirmation, source, ...payload } = data
  if (binding && source === 'wechat') payload.wechatTicket = binding.ticket
  let result
  if (config.useMock) {
    checkMockCode(data.phone, 'register', data.code)
    result = { token: 'demo-local-token', user: { name: '脑商体验官', id: 'VIP0001', displayId: 'VIP0001', role: '家长', region: data.region, inviteCode: data.inviteCode } }
  } else result = await request('/auth/registrations', { method: 'POST', data: payload })
  saveSession(result); codes.delete(keyFor(data.phone, 'register')); wechatBinding = null; clearInvitation()
  return result
}
export async function verifyReset(phone, code) {
  if (!validPhone(phone)) throw new Error('请输入正确的手机号')
  if (!/^\d{6}$/.test(code)) throw new Error('请输入 6 位验证码')
  let result
  if (config.useMock) { checkMockCode(phone, 'reset-password', code); result = { resetTicket: 'mock-reset-ticket' } }
  else result = await request('/auth/password-reset-verifications', { method: 'POST', data: { phone, code } })
  if (!result.resetTicket) throw new Error('未获取到重置密码凭证')
  resetProof = { ticket: result.resetTicket, phone, expiresAt: Date.now() + 5 * 60 * 1000 }
  codes.delete(keyFor(phone, 'reset-password'))
}
export async function resetPassword(password, confirmation) {
  validatePassword(password, confirmation)
  if (!resetProof || resetProof.expiresAt < Date.now()) throw new Error('身份验证已过期，请返回上一步重新验证')
  if (!config.useMock) await request('/auth/password-resets', { method: 'POST', data: { password, resetTicket: resetProof.ticket } })
  resetProof = null
  uni.removeStorageSync('naoshang-session')
}
export async function changePassword(oldPassword, password, confirmation) {
  if (!oldPassword) throw new Error('请输入原密码')
  validatePassword(password, confirmation)
  if (oldPassword === password) throw new Error('新密码不能与原密码相同')
  if (config.useMock) return { mockOnly: true, changed: false }
  const token = uni.getStorageSync('naoshang-session')?.token
  if (!token) throw new Error('请先登录')
  await request('/me/password-changes', { method: 'POST', data: { oldPassword, newPassword: password } })
  if (uni.getStorageSync('naoshang-session')?.token !== token) throw new Error('登录账号已变化，请重新登录确认')
  return { changed: true }
}
