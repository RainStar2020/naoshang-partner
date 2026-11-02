export const businessModules = [
  { id: 'wholesale', title: '脑商批发中心', label: '批发商', icon: '/static/partner/icon-wholesale.png' },
  { id: 'costore', title: '脑商合店中心', label: '合店老板', icon: '/static/partner/icon-costore.png' },
  { id: 'agency', title: '脑商代理中心', label: '区域代理', icon: '/static/partner/icon-agency.png' },
]
const tool = (id,module,label,path,icon,type,endpoint) => ({ id,module,label,path,icon:`/static/${icon}.png`,type,endpoint,capability:`${module}:${id}` })
export const businessTools = [
  tool('income','wholesale','积分','/pages/partner/income','partner/icon-income','income','/partner/income'),
  tool('superior','wholesale','运营商','/pages/partner/superior','partner/icon-superior','relations','/partner/superior'),
  tool('share','wholesale','分享码','/pages/partner/share','partner/icon-invitation','share','/promotion/share-code'),
  tool('materials','wholesale','素材库','/pages/partner/materials','partner/icon-materials','materials','/materials'),
  tool('global-awards','wholesale','总批补贴','/pages/partner/global-awards','partner/icon-global-award','report','/partner/global-awards'),
  tool('promotion','wholesale','晋升任务','/pages/partner/promotion','common/icon-activate','tasks','/partner/promotion-tasks'),
  tool('experience','wholesale','经验明细','/pages/partner/experience','common/icon-folder','ledger','/partner/experience-ledger'),
  tool('team','wholesale','查看明细','/pages/partner/team','partner/icon-team','team','/partner/team'),
  tool('quota-ledger','wholesale','进货明细','/pages/partner/quota-ledger','common/icon-folder','ledger','/partner/quota-ledger'),
  tool('quota-transfers','wholesale','划转明细','/pages/partner/quota-transfers','common/icon-switch-arrows','ledger','/partner/quota-ledger'),
  tool('quota-batches','wholesale','活动VIP','/pages/partner/quota-batches','partner/icon-membership-dividend','quota','/partner/quotas'),
  tool('quota-transfer','wholesale','划拨名额','/pages/partner/quota-transfer','common/icon-switch-arrows','operation','/partner/quota-transfer-quotes'),
  tool('quota-purchase','wholesale','购买VIP','/pages/partner/quota-purchase','profile/icon-order-payment','operation','/partner/quota-purchase-quotes'),
  tool('upgrade','wholesale','开通/升级','/pages/partner/upgrade','common/icon-activate','operation','/partner/upgrade-quotes'),
  tool('entitlement','wholesale','年度权益','/pages/partner/entitlement','partner/icon-membership-dividend','operation','/partner/entitlement-quotes'),
  tool('bind-store','wholesale','绑定门店','/pages/partner/bind-store','common/icon-store','operation','/partner/store-binding-options'),
  tool('income','costore','合店收益','/pages/costore/income','partner/icon-income','income','/income/entries'),
  tool('card-dividends','costore','会员卡分红','/pages/costore/card-dividends','partner/icon-membership-dividend','dividends','/costore/card-dividends'),
  tool('promotion-dividends','costore','推广分红','/pages/costore/promotion-dividends','partner/icon-promotion-dividend','dividends','/costore/promotion-dividends'),
  tool('team','agency','我的团队','/pages/agency/team','partner/icon-team','team','/agency/team'),
  tool('income','agency','代理收益','/pages/agency/income','partner/icon-agency-income','income','/income/entries'),
  tool('store-management','agency','门店管理','/pages/store/index','partner/icon-store-info','store','/stores'),
]
export const toolKey = item => `${item.module}/${item.id}`
export function findBusinessTool(module,id) { return businessTools.find(item=>item.module===module&&item.id===id) }
export function businessPreview(config) { return config.useMock === true && config.previewAllBusinessFeatures === true }
export function visibleBusinessTools(context,config) {
  return businessTools.filter(item=>{
    if(item.module!==context?.module)return false
    if(!(businessPreview(config)||context.capabilities?.includes(item.capability)))return false
    // Top rank has no further promotion path.
    if(item.id==='promotion'&&context.levelName==='联创合伙人')return false
    return true
  })
}

// Wholesale home shortcuts: base four always. Global award follows bootstrap eligibility when present; otherwise keep the legacy angel/non-angel split. Child pages keep the full capability set.
export const businessHomeTools=(tools,context,partnerStatus,globalAwardEligibility)=>{
  if(context?.module!=='wholesale')return tools
  const base=['income','superior','share','materials']
  const showGlobal=globalAwardEligibility!=null?globalAwardEligibility.eligible===true:partnerStatus!=='ANGEL'
  return tools.filter(item=>(showGlobal?[...base,'global-awards']:base).includes(item.id))
}
