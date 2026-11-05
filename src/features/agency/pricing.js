/** Agency application fee catalog in 万元 (temporary local source of truth). */
export const agencyLabels = Object.freeze({
  STORE: '单店代理',
  COUNTY: '区县代理',
  CITY: '市代',
  PROVINCE: '省代',
})

const wan = (tech, equipment, deposit) => ({
  tech,
  equipment,
  deposit,
  total: tech + equipment + deposit,
})

export const cityPopulationTiers = Object.freeze([
  { id: 'POP_GE_10M', label: '人口≥1000万', ...wan(35, 5, 5) },
  { id: 'POP_5M_10M', label: '500万≤人口<1000万', ...wan(30, 5, 5) },
  { id: 'POP_LT_5M', label: '人口<500万', ...wan(25, 5, 5) },
])

export const agencyPricing = Object.freeze({
  PROVINCE: {
    label: agencyLabels.PROVINCE,
    regionLevels: 1,
    requiresAddress: false,
    requiresStorefront: false,
    ...wan(200, 30, 30),
  },
  CITY: {
    label: agencyLabels.CITY,
    regionLevels: 2,
    requiresAddress: false,
    requiresStorefront: false,
    tiers: cityPopulationTiers,
  },
  COUNTY: {
    label: agencyLabels.COUNTY,
    regionLevels: 3,
    requiresAddress: false,
    requiresStorefront: false,
    ...wan(10, 3, 3),
  },
  STORE: {
    label: agencyLabels.STORE,
    regionLevels: 3,
    requiresAddress: true,
    requiresStorefront: true,
    ...wan(4, 2, 2),
  },
})

export function feeBreakdownNote(fees) {
  if (!fees) return ''
  return `${fees.tech}万技术费 + ${fees.equipment}万设备费 + ${fees.deposit}万保证金`
}

/** Convert 万元 catalog totals to yuan for shared money helpers. */
export function wanToYuan(totalWan) {
  return Number(totalWan) * 10000
}

export function resolveAgencyFees(type, cityTierId) {
  const plan = agencyPricing[type]
  if (!plan) throw new Error('代理类型无效')
  if (plan.tiers) {
    const tier = plan.tiers.find(item => item.id === cityTierId) || plan.tiers[0]
    return { plan, fees: tier, cityTierId: tier.id }
  }
  return { plan, fees: plan, cityTierId: null }
}
