import { config } from '../../config'
import { request } from '../api'
import { endpoints } from './endpoints'
import { mockEndpoint } from './mock'

const registry = new Map(endpoints.map(endpoint => [`${endpoint.method} ${endpoint.path}`, endpoint]))
/** Separate switch permits gradual migration without changing existing page services. */
export const contractConfig = { useMock: true, delay: 80 }

/** @param {string} key @param {import('./types').EndpointInput} input */
export async function callEndpoint(key, input = {}) {
  const endpoint = registry.get(key)
  if (!endpoint) throw new Error(`未知接口：${key}`)
  if (endpoint.serverOnly) throw new Error('支付通知仅供服务端调用，前端不能模拟真实入账通知')
  const path = endpoint.path.replace(/\{(\w+)\}/g, (_, name) => {
    const value = input.path?.[name]
    if (value === undefined || value === null || value === '') throw new Error(`缺少路径参数：${name}`)
    return encodeURIComponent(String(value))
  })
  if (contractConfig.useMock) {
    if (contractConfig.delay) await new Promise(resolve => setTimeout(resolve, contractConfig.delay))
    return mockEndpoint(endpoint, input)
  }
  // Fail explicitly rather than treating demo server data as production results.
  if (!config.baseURL) throw new Error('请在 src/config/index.js 配置 baseURL')
  return request(path, { method: endpoint.method, data: input.data })
}

export const createIdempotencyKey = () => `intent-${Date.now()}-${Math.random().toString(36).slice(2)}`
