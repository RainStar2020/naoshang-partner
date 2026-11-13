import { getSession,request } from './api'
import {config} from '../config'
import { mockAgencyApplicationOptions, mockCheckAgencyRegion, mockSubmitAgency } from './mock/agency-application'
import { feeBreakdownNote, resolveAgencyFees, wanToYuan } from '../features/agency/pricing'
import { assertUsableAgencyPromotionCode } from './agency-promotion-code'

async function scoped(operation) {
  const session = getSession()
  if (!session?.user?.id) throw new Error('请先登录')
  const result = await operation({ ...session.user })
  if (getSession()?.token !== session.token || getSession()?.user?.id !== session.user.id) {
    throw new Error('登录状态已变化')
  }
  return result
}

const agencyTypeWire = { STORE: 'store', COUNTY: 'district', CITY: 'city', PROVINCE: 'province' }
const cityTierIndex = { POP_GE_10M: 0, POP_5M_10M: 1, POP_LT_5M: 2 }

function wireAgencyRegionType(type) {
  const key = String(type || '').trim()
  return agencyTypeWire[key.toUpperCase()] || key.toLowerCase()
}

function resolveDraftRegionCode(draft) {
  if (Array.isArray(draft?.regionCodes) && draft.regionCodes.length) {
    return String(draft.regionCodes[draft.regionCodes.length - 1] || '').trim()
  }
  return String(draft?.regionCode || '').trim()
}

function resolveStoreName(draft) {
  return String(draft?.storeName || '').trim()
}

function assertStoreName(agencyType, draft) {
  if (agencyType !== 'store') return
  const storeName = resolveStoreName(draft)
  if (!storeName) throw new Error('请填写门店名称')
  if (storeName.length > 60) throw new Error('门店名称不能超过 60 个字')
}

/** Public occupancy check: GET /api/hq/region-agents/check */
export function checkAgencyRegionAvailability(regionType, regionCode) {
  return scoped(async () => {
    const type = wireAgencyRegionType(regionType)
    const code = String(regionCode || '').trim()
    if (!type || !code) throw new Error('请选择代理地区')
    if (config.useMock) return mockCheckAgencyRegion(type, code)
    const result = await request('/api/hq/region-agents/check', {
      data: { regionType: type, regionCode: code },
      cacheTtl: 10000,
    })
    return {
      regionType: String(result?.regionType || type).toLowerCase(),
      regionCode: String(result?.regionCode || code),
      available: result?.available === true,
    }
  })
}

export async function assertAgencyRegionAvailable(regionType, regionCode) {
  const result = await checkAgencyRegionAvailability(regionType, regionCode)
  if (!result.available) throw new Error('该区域已有有效代理')
  return result
}

function formatAgencyYuanLabel(amount) {
  const number = Number(amount)
  if (!Number.isFinite(number)) return ''
  return `¥${number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const API_FEE_KEYS = ['brandFee', 'extraFee', 'deviceFee', 'depositFee']
const API_FEE_NAMES = { brandFee: '品牌费', extraFee: '附加费', deviceFee: '设备费', depositFee: '保证金' }

export function hasApiAgencyFees(options) {
  const breakdown = options?.feeBreakdown
  if (!breakdown || typeof breakdown !== 'object') return false
  if (typeof breakdown.label === 'string' && breakdown.label.trim()) return true
  if (typeof breakdown.note === 'string' && breakdown.note.trim()) return true
  return API_FEE_KEYS.some(key => breakdown[key] != null)
}

export function agencyPayableLabel(options) {
  const label = options?.feeBreakdown?.label
  if (typeof label === 'string' && label.trim()) return label.trim()
  return formatAgencyYuanLabel(options?.payableAmount ?? options?.feeBreakdown?.total)
}

export function agencyFeeNote(options) {
  const breakdown = options?.feeBreakdown
  if (typeof breakdown?.note === 'string' && breakdown.note.trim()) return breakdown.note.trim()
  if (hasApiAgencyFees(options) && breakdown) {
    const items = []
    for (const key of API_FEE_KEYS) {
      const value = Number(breakdown[key])
      if (!Number.isFinite(value)) continue
      if (key === 'extraFee' && value === 0) continue
      items.push(`${API_FEE_NAMES[key]}${formatAgencyYuanLabel(value)}`)
    }
    return items.join(' + ')
  }
  return typeof options?.feeNote === 'string' ? options.feeNote : ''
}

function payableYuanFromOptions(result, fallback) {
  const total = Number(result?.feeBreakdown?.total)
  if (Number.isFinite(total)) return total
  const amount = Number(result?.payableAmount)
  if (Number.isFinite(amount)) return amount
  return fallback.payableAmount
}

function agreementFromOptions(result, fallback) {
  const required = Array.isArray(result?.requiredAgreements) ? result.requiredAgreements : []
  let version = ''
  let content = ''
  for (const item of required) {
    if (!version && item?.version != null && String(item.version).trim()) version = String(item.version).trim()
    if (!content && item?.content != null && String(item.content).trim()) content = item.content
  }
  if (!version && result?.agreement?.version != null && String(result.agreement.version).trim()) {
    version = String(result.agreement.version).trim()
  }
  if (!content && result?.agreement?.content != null) content = result.agreement.content
  if (!version) version = fallback?.agreement?.version
  if (!content) content = fallback?.agreement?.content
  return {
    ...(fallback.agreement || {}),
    ...(result?.agreement || {}),
    ...(version ? { version } : {}),
    ...(content ? { content } : {}),
  }
}

export function getAgencyApplicationOptions(type, promotionId, cityTierId = null, promotionCode = '') {
  return scoped(async () => {
    const code = assertUsableAgencyPromotionCode(promotionCode || promotionId)
    const fallback = mockAgencyApplicationOptions(type, code, cityTierId)
    if (config.useMock) return { ...fallback, promotionId: code, promotionCode: code }
    const result = await request('/agency/application-options', {
      data: {
        agencyType: agencyTypeWire[type] || 'store',
        tierIndex: cityTierIndex[cityTierId],
        promotionCode: code,
      },
    })
    const payableAmount = payableYuanFromOptions(result, fallback)
    const output = {
      ...fallback,
      ...result,
      promotionId: code,
      promotionCode: code,
      agencyType: String(result?.agencyType || type).toUpperCase(),
      requiresStorefront: result?.requiresStorefrontPhoto === true || result?.requiresStorefront === true,
      payableAmount,
      agreement: agreementFromOptions(result, fallback),
    }
    delete output.payableWan
    output.feeNote = agencyFeeNote(output)
    return output
  })
}

export function applyCityTier(options, cityTierId) {
  if (!options || options.agencyType !== 'CITY') return options
  // Live API fees are already in yuan; do not overwrite them with the local 万元 catalog.
  if (hasApiAgencyFees(options)) return { ...options, cityTierId }
  const { fees, cityTierId: resolved } = resolveAgencyFees('CITY', cityTierId)
  return {
    ...options,
    cityTierId: resolved,
    feeBreakdown: {
      tech: fees.tech,
      equipment: fees.equipment,
      deposit: fees.deposit,
      total: fees.total,
    },
    payableAmount: wanToYuan(fees.total),
    payableWan: fees.total,
    feeNote: feeBreakdownNote(fees),
  }
}

export function submitAgencyApplication(options, draft, key) {
  return scoped(async user => {
    if (!key) throw new Error('缺少申请编号')
    if (!draft.agreementAccepted) throw new Error('请先阅读并勾选代理协议')
    const promotionCode = assertUsableAgencyPromotionCode(draft.promotionCode || options.promotionCode || options.promotionId || draft.promotionId)
    const agencyType = agencyTypeWire[options.agencyType] || 'store'
    const regionCode = resolveDraftRegionCode(draft)
    if (!regionCode) throw new Error('请选择代理地区')
    assertStoreName(agencyType, draft)
    await assertAgencyRegionAvailable(agencyType, regionCode)
    if (config.useMock) return mockSubmitAgency(user, options, draft, key)
    if (agencyType === 'store' && !draft.storefrontFileId) throw new Error('请上传门头照')
    const body = {
      agencyType,
      name: String(draft.name || '').trim(),
      phone: String(draft.phone || '').trim(),
      regionCode,
      regionNames: draft.regionNames,
      address: String(draft.address || '').trim(),
      agreementAccepted: true,
      agreementVersion: options.agreement?.version || undefined,
      idempotencyKey: key,
    }
    if (agencyType === 'city') body.cityTierId = draft.cityTierId || undefined
    const referrerId = String(draft.referrerId || options.referrerId || '').trim()
    if (referrerId) body.referrerId = referrerId
    body.promotionCode = promotionCode
    body.promotionId = promotionCode
    if (agencyType === 'store') {
      body.storefrontFileId = draft.storefrontFileId
      body.storeName = resolveStoreName(draft)
    }
    return request('/agency/applications', { method: 'POST', data: body })
  })
}
