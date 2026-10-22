// Presentation capabilities are supplied by the backend context, never inferred from user.role.
export const exclusiveFeatures = Object.freeze([
  {id:'coach',label:'健脑官工作台',icon:'members',capability:'coach:read',path:'/pages/coach/index'},
  { id: 'founder-awards', label: '创始奖', icon: 'award', capability: 'founder-awards:read', path: '/pages/profile/founder-awards' },
  { id: 'costore-application', label: '申请合店', icon: 'costore', capability: 'costore:apply', path: '/pages/application/costore' },
  { id: 'agency-code', label: '代理推广码', icon: 'qr', capability: 'agency-code:read', path: '/pages/promotion/agency-code' },
  { id: 'members', label: '会员管理', icon: 'members', capability: 'family-members:manage', path: '/pages/members/list' },
])
export function visibleExclusiveFeatures(access, { useMock = false, previewAllExclusiveFeatures = false } = {}) {
  const preview = useMock === true && previewAllExclusiveFeatures === true
  const capabilities = Array.isArray(access?.capabilities) ? access.capabilities : []
  return exclusiveFeatures.filter(item => preview || capabilities.includes(item.capability))
}
