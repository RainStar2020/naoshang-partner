import { getSession,request } from './api'
import {config} from '../config'
import { mockAgencyApplicationOptions, mockSubmitAgency } from './mock/agency-application'
import { feeBreakdownNote, resolveAgencyFees, wanToYuan } from '../features/agency/pricing'

async function scoped(operation) {
  const session = getSession()
  if (!session?.user?.id) throw new Error('请先登录')
  const result = await operation({ ...session.user })
  if (getSession()?.token !== session.token || getSession()?.user?.id !== session.user.id) {
    throw new Error('登录状态已变化')
  }
  return result
}

/** Temporary: local fee catalog only — do not call backend options/quote APIs. */
export function getAgencyApplicationOptions(type, promotionId, cityTierId = null) {
  return scoped(async () => mockAgencyApplicationOptions(type, promotionId, cityTierId))
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
    if (!draft.agreementAccepted) throw new Error('请先阅读并同意代理协议')
    if(config.useMock)return mockSubmitAgency(user, options, draft, key)
    const body={
      promotionId:options.promotionId,
      name:String(draft.name||'').trim(),
      phone:String(draft.phone||'').trim(),
      regionCodes:draft.regionCodes,
      regionNames:draft.regionNames,
      address:String(draft.address||'').trim(),
      storefrontAssetId:draft.storefrontAssetId||undefined,
      cityTierId:draft.cityTierId||undefined,
      agreementVersion:options.agreement?.version||undefined,
      idempotencyKey:key,
    }
    return request('/agency/applications',{method:'POST',data:body})
  })
}
