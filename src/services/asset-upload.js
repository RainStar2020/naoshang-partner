import {config} from '../config'
import {apiUrl} from './asset-url'
import {request,getSession,logout} from './api'

const PURPOSES = new Set([
  'avatar',
  'member-avatar',
  'feedback',
  'storefront',
  'material-qr',
  'consultant-qr',
  'training-file',
  'training-video',
])

function parseBody(raw) {
  if (raw && typeof raw === 'object') return raw
  try {
    return JSON.parse(String(raw || '') || '{}')
  } catch {
    return {}
  }
}

function uploadError(body, statusCode, fallback) {
  return Object.assign(new Error(body.message || body.error || fallback), {
    statusCode,
    serverMessage: body.message || body.error,
    data: body,
  })
}

export async function uploadAsset(file, {purpose, fileName} = {}) {
  const session = getSession()
  if (!session?.user?.id) throw new Error('请先登录')
  if (!file?.path) throw new Error('请选择有效文件')
  if (!PURPOSES.has(purpose)) throw new Error('不支持的上传类型')
  if (config.useMock) {
    const assetId = `mock-${purpose}-${Date.now()}`
    return {assetId, fileId: assetId, previewUrl: file.path}
  }
  if (!config.baseURL) throw new Error('服务暂不可用，请稍后重试')
  const header = session.token ? {Authorization: `Bearer ${session.token}`} : {}
  const formData = {purpose}
  if (fileName) formData.fileName = String(fileName)
  const body = await new Promise((resolve, reject) => {
    uni.uploadFile({
      url: apiUrl('/assets'),
      filePath: file.path,
      name: 'file',
      header,
      formData,
      success(result) {
        const data = parseBody(result.data)
        if (result.statusCode === 401) {
          logout({revoke: false})
          reject(uploadError(data, 401, '登录已过期'))
          return
        }
        const assetId = data.assetId || data.fileId
        if (result.statusCode >= 200 && result.statusCode < 300 && data.status === 'success' && assetId) {
          resolve(data)
          return
        }
        reject(uploadError(data, result.statusCode, '文件上传失败'))
      },
      fail(error) {
        reject(Object.assign(new Error('网络连接异常，请检查网络后重试'), {cause: error}))
      },
    })
  })
  if (getSession()?.token !== session.token || getSession()?.user?.id !== session.user.id) {
    throw new Error('账号已变化')
  }
  const assetId = body.assetId || body.fileId
  return {assetId, fileId: body.fileId || assetId, previewUrl: body.url || ''}
}

export function discardAsset(assetId) {
  const id = String(assetId || '').trim()
  if (!id || id.startsWith('mock-') || config.useMock) return Promise.resolve()
  return request(`/assets/${encodeURIComponent(id)}`, {method: 'DELETE'}).catch((reason) => {
    if (reason?.statusCode === 409) return {status: 'skipped'}
    return {status: 'failed', reason}
  })
}
