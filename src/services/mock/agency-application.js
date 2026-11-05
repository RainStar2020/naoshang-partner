// TODO(API): mock-only promotion and agency application fixtures, never grant real agency rights.
import { mockExclusiveState } from './exclusive'
import { mockProfileState } from './profile'
import { buildAgencyApplicationUrl } from '../agency-promotion-link'
import {
  agencyPricing,
  feeBreakdownNote,
  resolveAgencyFees,
  wanToYuan,
} from '../../features/agency/pricing'

export const promotionPayload = (type = 'STORE', id = 'local-invitation') =>
  buildAgencyApplicationUrl(id, type) || `#/pages/application/agency?promotionId=${encodeURIComponent(id)}&agencyType=${encodeURIComponent(type)}`

export function mockAgencyApplicationOptions(type, promotionId, cityTierId = null) {
  if (!agencyPricing[type] || !promotionId) throw new Error('推广邀请已失效')
  const { plan, fees, cityTierId: resolvedTier } = resolveAgencyFees(type, cityTierId)
  return {
    promotionId,
    agencyType: type,
    label: plan.label,
    regionLevels: plan.regionLevels,
    requiresAddress: plan.requiresAddress,
    requiresStorefront: plan.requiresStorefront,
    cityTiers: plan.tiers || null,
    cityTierId: resolvedTier,
    feeBreakdown: {
      tech: fees.tech,
      equipment: fees.equipment,
      deposit: fees.deposit,
      total: fees.total,
    },
    payableAmount: wanToYuan(fees.total),
    payableWan: fees.total,
    feeNote: feeBreakdownNote(fees),
    agreement: {
      version: 'local-agency-v1',
      content: {
        version: 1,
        format: 'nodes',
        nodes: [
          { name: 'p', children: [{ type: 'text', text: '一、总则' }] },
          { name: 'p', children: [{ type: 'text', text: '本协议由脑商平台与申请人就区域/门店代理合作事宜订立。申请人提交申请即表示已阅读、理解并同意本协议全部条款。' }] },
          { name: 'p', children: [{ type: 'text', text: '二、代理范围与费用' }] },
          { name: 'p', children: [{ type: 'text', text: '代理等级、代理区域及费用构成以申请页展示的价目为准，包含技术费、设备费与保证金。费用确认后，非因平台原因不得擅自变更代理区域或等级。' }] },
          { name: 'p', children: [{ type: 'text', text: '三、权利与义务' }] },
          { name: 'p', children: [{ type: 'text', text: '申请人应保证所填姓名、手机号、地区及门店资料真实有效，并按平台规范开展推广与服务；平台提供培训支持、系统权限与品牌物料指引。' }] },
          { name: 'p', children: [{ type: 'text', text: '四、审核与生效' }] },
          { name: 'p', children: [{ type: 'text', text: '申请提交后进入审核流程，审核通过并完成约定费用支付后代理权益生效。审核未通过的，平台将告知原因，申请人可按要求补正后再次提交。' }] },
          { name: 'p', children: [{ type: 'text', text: '五、其他' }] },
          { name: 'p', children: [{ type: 'text', text: '本协议为演示占位文本，正式上线以平台公示的最新版本为准。未尽事宜，双方可另行书面约定。' }] },
        ],
      },
    },
  }
}

export function mockSubmitAgency(user, options, draft, key) {
  const name = String(draft.name || '').trim()
  const phone = String(draft.phone || '').trim()
  const address = String(draft.address || '').trim()
  const levels = Number(options.regionLevels) || 3
  if (!name || name.length > 30 || !/^1\d{10}$/.test(phone)) {
    throw new Error('请完整填写姓名和手机号')
  }
  if (!Array.isArray(draft.regionNames) || draft.regionNames.length !== levels || !Array.isArray(draft.regionCodes) || draft.regionCodes.length !== levels) {
    throw new Error(levels === 1 ? '请选择省份' : levels === 2 ? '请选择省市' : '请选择完整地区')
  }
  if (options.agencyType === 'CITY') {
    const tierOk = (options.cityTiers || []).some(item => item.id === draft.cityTierId)
    if (!tierOk) throw new Error('请选择城市人口档位')
  }
  if (options.requiresAddress) {
    if (!address || address.length > 200) throw new Error('请填写门店详细地址')
  }
  if (options.requiresStorefront) {
    if (mockProfileState(user).assets.get(draft.storefrontAssetId)?.purpose !== 'storefront') {
      throw new Error('请上传门头照')
    }
  }
  if (!key) throw new Error('缺少申请编号')
  const state = mockExclusiveState(user)
  const fingerprint = JSON.stringify({ options, draft })
  const old = state.operations.get(key)
  if (old) {
    if (old.fingerprint !== fingerprint) throw new Error('重复提交参数不一致')
    return old.result
  }
  const application = {
    id: `agency-application-${state.applications.length + 1}`,
    title: `申请${options.label}`,
    applicationStatus: 'PENDING_REVIEW',
    paymentStatus: 'NOT_STARTED',
    contractStatus: 'NOT_SIGNED',
    entitlementStatus: 'NOT_OPEN',
    payableAmount: options.payableAmount,
    payableWan: options.payableWan,
    createdAt: new Date().toISOString(),
    store: { name, address: options.requiresAddress ? address : draft.regionNames.join('') },
    agencyType: options.agencyType,
    cityTierId: draft.cityTierId || null,
    regionCodes: [...draft.regionCodes],
    regionNames: [...draft.regionNames],
  }
  state.applications.unshift(application)
  const result = { application }
  state.operations.set(key, { fingerprint, result })
  return result
}
