import { emptyContent } from '../../features/content/rich-content'
export function mockPartnerOverview(user) {
  return { accountId: user.id, name: user.name, levelName: '普通用户', inviteCode: user.inviteCode || '',
    annualEntitlement: { active: false, validUntil: null },
    benefits: ['VIP', '天使', '私董', '联创'].map((label, i) => ({ id: `tier-${i + 1}`, label, content: emptyContent() })),
  }
}
// CMS rich text stays empty. List cards and edit chrome use local preview fixtures.
const materialCover = '/static/product/product-cover.png'
const materialTitles = {
  image: ['考试系统班，让孩子爱上课程', '这里是模板标题模板标题'],
  article: ['考试系统班，让孩子爱上课程'],
  video: ['考试系统培训班，让您的孩子爱上课程'],
}
const materialSummary = '这里是简介这里是简介，阿巴巴这里是简介本素材的一个文字简介'
function materialItem(type, categoryIndex, index) {
  const titles = materialTitles[type]
  return { id: `material-${type}-${categoryIndex}-${index}`, type, categoryId: `${type}-cat-${categoryIndex}`, title: titles[(index - 1) % titles.length], summary: type === 'article' ? materialSummary : '', coverUrl: materialCover }
}
export function mockMaterialCategories(type) { return [1, 2].map(index => ({ id: `${type}-cat-${index}`, name: '这里是一级分类' })) }
export function mockMaterials(type, categoryId) {
  const count = type === 'video' ? 2 : 3
  const items = [1, 2].flatMap(categoryIndex => Array.from({ length: count }, (_, index) => materialItem(type, categoryIndex, index + 1))).filter(item => !categoryId || item.categoryId === categoryId)
  return { items, nextCursor: null, hasMore: false }
}
export function mockMaterialDetail(id) {
  const match = /^material-(image|article|video)-(\d+)-(\d+)$/.exec(String(id || ''))
  if (!match) throw new Error('该素材不存在或已下线')
  const type = match[1], item = materialItem(type, Number(match[2]), Number(match[3]))
  return { ...item, allowedOperations: type === 'image' ? ['upload-qr', 'download'] : ['upload-qr', 'copy-link'], mediaUrl: type === 'video' ? 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' : materialCover, posterUrl: '/static/media/video-poster-background.png', shareUrl: 'http://localhost:5173/#/pages/register/index?inviteCode=LXYA023', content: emptyContent() }
}
