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
  if (storeName.length > 255) throw new Error('门店名称不能超过 255 个字')
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
    const payableAmount = Number(result?.payableAmount)
    return {
      ...fallback,
      ...result,
      promotionId: code,
      promotionCode: code,
      agencyType: String(result?.agencyType || type).toUpperCase(),
      requiresStorefront: result?.requiresStorefrontPhoto === true || result?.requiresStorefront === true,
      payableAmount: Number.isFinite(payableAmount) ? payableAmount : fallback.payableAmount,
      payableWan: Number.isFinite(payableAmount) ? payableAmount / 10000 : fallback.payableWan,
    }
  })
}

export function applyCityTier(options, cityTierId) {
  if (!options || options.agencyType !== 'CITY') return options
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
