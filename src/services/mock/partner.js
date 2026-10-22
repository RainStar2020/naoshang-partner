import { emptyContent } from '../../features/content/rich-content'
export function mockPartnerOverview(user) {
  return { accountId: user.id, name: user.name, levelName: '普通用户', inviteCode: user.inviteCode || '',
    annualEntitlement: { active: false, validUntil: null },
    benefits: ['小批', '中批', '大批', '总批'].map((label, i) => ({ id: `tier-${i + 1}`, label, content: emptyContent() })),
  }
}
// Client templates are populated by the customer CMS. No mock marketing copy or sample images.
export const mockMaterialCategories = () => []
export const mockMaterials = () => ({ items: [], nextCursor: null, hasMore: false })
