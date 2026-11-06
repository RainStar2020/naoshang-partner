import { config } from '../config'
import { emptyContent, normalizeContent } from '../features/content/rich-content'

const CACHE_KEY = 'naoshang-partner-benefits:v3'
const LEVELS = [
  ['DEMO-VIP', '小批'],
  ['DEMO-ANGEL', '中批'],
  ['DEMO-BOARD', '大批'],
  ['DEMO-FOUNDER', '总批'],
]
const LEVEL_ALIASES = {
  'DEMO-VIP': 'DEMO-VIP',
  VIP: 'DEMO-VIP',
  'VIP合伙人': 'DEMO-VIP',
  小批发商: 'DEMO-VIP',
  小批: 'DEMO-VIP',
  'DEMO-ANGEL': 'DEMO-ANGEL',
  ANGEL: 'DEMO-ANGEL',
  天使: 'DEMO-ANGEL',
  天使合伙人: 'DEMO-ANGEL',
  中批发商: 'DEMO-ANGEL',
  中批: 'DEMO-ANGEL',
  'DEMO-BOARD': 'DEMO-BOARD',
  BOARD: 'DEMO-BOARD',
  私董: 'DEMO-BOARD',
  私董合伙人: 'DEMO-BOARD',
  大批发商: 'DEMO-BOARD',
  大批: 'DEMO-BOARD',
  'DEMO-FOUNDER': 'DEMO-FOUNDER',
  FOUNDER: 'DEMO-FOUNDER',
  联创: 'DEMO-FOUNDER',
  联创合伙人: 'DEMO-FOUNDER',
  总批发商: 'DEMO-FOUNDER',
  总批: 'DEMO-FOUNDER',
}
let activeRequest = null

/** Resolve public HQ benefits URL from the shared project baseURL. */
export function partnerBenefitsURL(partnerLevel = '') {
  const base = String(config.baseURL || '').replace(/\/$/, '')
  const query = partnerLevel ? `?partnerLevel=${encodeURIComponent(partnerLevel)}` : ''
  return `${base}/api/hq/partners/benefits${query}`
}

function pickLevelCode(...values) {
  for (const value of values) {
    const raw = String(value || '').trim()
    if (!raw) continue
    const mapped = LEVEL_ALIASES[raw] || LEVEL_ALIASES[raw.toUpperCase()]
    if (mapped) return mapped
  }
  return ''
}

function wrapLooseTextNodes(nodes) {
  return (Array.isArray(nodes) ? nodes : []).flatMap((node) => {
    if (!node || typeof node !== 'object') return []
    if (node.type === 'text') {
      const text = String(node.text || '')
      return text ? [{ name: 'p', children: [{ type: 'text', text }] }] : []
    }
    return [node]
  })
}

function coerceBenefitContent(item) {
  const raw = item?.content ?? item?.body ?? item?.richContent
  const summary = String(item?.summary || item?.description || item?.brief || '').trim()
  try {
    if (raw == null || raw === '') {
      if (!summary) return emptyContent()
      return normalizeContent({ version: 1, format: 'nodes', nodes: [{ name: 'p', children: [{ type: 'text', text: summary }] }] })
    }
    if (typeof raw === 'string') {
      const text = raw.trim() || summary
      if (!text) return emptyContent()
      return normalizeContent({ version: 1, format: 'nodes', nodes: [{ name: 'p', children: [{ type: 'text', text }] }] })
    }
    if (typeof raw !== 'object') {
      if (!summary) return emptyContent()
      return normalizeContent({ version: 1, format: 'nodes', nodes: [{ name: 'p', children: [{ type: 'text', text: summary }] }] })
    }
    if (raw.format === 'nodes' && Array.isArray(raw.nodes)) {
      return normalizeContent({ version: 1, format: 'nodes', nodes: wrapLooseTextNodes(raw.nodes) })
    }
    const text = String(raw.html || raw.markdown || raw.text || summary || '').trim()
    if (!text) return emptyContent()
    return normalizeContent({ version: 1, format: 'nodes', nodes: [{ name: 'p', children: [{ type: 'text', text }] }] })
  } catch {
    if (!summary) return emptyContent()
    try {
      return normalizeContent({ version: 1, format: 'nodes', nodes: [{ name: 'p', children: [{ type: 'text', text: summary }] }] })
    } catch {
      return emptyContent()
    }
  }
}

function extractBenefitRows(payload) {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return null
  if (Array.isArray(payload.benefits)) return payload.benefits
  if (Array.isArray(payload.levels)) return payload.levels
  if (Array.isArray(payload.levelBenefits)) return payload.levelBenefits
  if (Array.isArray(payload.data)) return payload.data
  if (payload.data && typeof payload.data === 'object') return extractBenefitRows(payload.data)
  if (payload.response && typeof payload.response === 'object') return extractBenefitRows(payload.response)
  return null
}

function versionsFingerprint(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((item) => `${pickLevelCode(item?.partnerLevel, item?.level, item?.value) || item?.partnerLevel || ''}:${item?.version ?? 0}`)
    .filter(Boolean)
    .sort()
    .join('|')
}

function normalizeBenefits(payload) {
  const rows = extractBenefitRows(payload)
  if (!rows) throw new Error('合伙人等级权益数据格式异常')
  const byLevel = new Map()
  for (const item of rows) {
    const id = pickLevelCode(item?.partnerLevel, item?.level, item?.value, item?.code, item?.id)
    if (!id || byLevel.has(id)) continue
    byLevel.set(id, item)
  }
  return LEVELS.map(([id, label]) => {
    const item = byLevel.get(id)
    return {
      id,
      label,
      partnerLevel: id,
      summary: String(item?.summary || '').trim(),
      version: item?.version,
      content: coerceBenefitContent(item),
    }
  })
}

function readCache() {
  const cached = uni.getStorageSync(CACHE_KEY)
  if (!cached || !Array.isArray(cached.benefits) || !cached.benefits.length) return null
  return cached
}

function writeCache(benefits, fingerprint) {
  uni.setStorageSync(CACHE_KEY, {
    benefits,
    fingerprint,
    fetchedAt: Date.now(),
  })
}

/** Public HQ endpoint: no Authorization header. */
function fetchBenefitsRaw(partnerLevel = '') {
  const url = partnerBenefitsURL(partnerLevel)
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: 'GET',
      timeout: config.timeout,
      header: { Accept: 'application/json' },
      success: (res) => {
        const body = res.data || {}
        if (res.statusCode === 200 && body && typeof body.code === 'number' && body.code === 0) {
          resolve(body.data)
          return
        }
        if (res.statusCode >= 200 && res.statusCode < 300 && Array.isArray(body)) {
          resolve(body)
          return
        }
        reject(Object.assign(new Error(body.message || body.error || `HTTP ${res.statusCode}`), {
          statusCode: res.statusCode,
          code: body.code,
          data: body,
        }))
      },
      fail: (error) => reject(Object.assign(new Error('网络连接异常，请检查网络后重试'), { cause: error })),
    })
  })
}

/**
 * Load wholesale level-benefit copy for the dashboard tabs.
 * @param {string} [partnerLevel] optional DEMO-VIP / DEMO-ANGEL / DEMO-BOARD / DEMO-FOUNDER
 */
export async function getWholesaleBenefitCatalog(partnerLevel = '') {
  if (config.useMock) return null
  const level = String(partnerLevel || '').trim()
  const requestKey = level || '*'
  if (activeRequest?.key === requestKey) return activeRequest.promise

  const cached = readCache()
  const entry = { key: requestKey, promise: null }
  activeRequest = entry
  entry.promise = fetchBenefitsRaw(level)
    .then((payload) => {
      const benefits = normalizeBenefits(payload)
      const fingerprint = versionsFingerprint(Array.isArray(payload) ? payload : extractBenefitRows(payload) || [])
      // Full-list responses refresh cache; single-level responses merge into cache when present.
      if (!level) {
        writeCache(benefits, fingerprint)
        return benefits
      }
      if (cached?.benefits?.length) {
        const merged = cached.benefits.map((row) => {
          const next = benefits.find((item) => item.id === row.id)
          return next?.content?.nodes?.length ? next : row
        })
        writeCache(merged, versionsFingerprint(merged.map((item) => ({ partnerLevel: item.id, version: item.version }))))
        return merged
      }
      writeCache(benefits, fingerprint)
      return benefits
    })
    .catch((error) => {
      if (cached?.benefits?.length) return cached.benefits
      throw error
    })
    .finally(() => {
      if (activeRequest === entry) activeRequest = null
    })
  return entry.promise
}

export function clearWholesaleBenefitCatalogCache() {
  uni.removeStorageSync(CACHE_KEY)
}
