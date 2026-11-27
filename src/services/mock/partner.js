// @deprecated 本目录 mock 数据已废弃（config.useMock 已关闭），禁止新增或继续使用，统一走真实接口；详见目录 README.md
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
const materialCategoryMap = {
  image: [
    { id: 'img-poster', name: '宣传海报' },
    { id: 'img-qr', name: '二维码图' },
  ],
  article: [
    { id: 'art-notice', name: '平台公告' },
    { id: 'art-course', name: '课程介绍' },
  ],
  video: [
    { id: 'vid-intro', name: '平台介绍' },
    { id: 'vid-course', name: '课程视频' },
  ],
}
function materialItem(type, categoryIndex, index) {
  const titles = materialTitles[type]
  const category = materialCategoryMap[type][categoryIndex - 1]
  return { id: `material-${type}-${categoryIndex}-${index}`, type, categoryId: category.id, title: titles[(index - 1) % titles.length], summary: type === 'article' ? materialSummary : '', coverUrl: materialCover }
}
export function mockMaterialCategories(type) { return materialCategoryMap[type].map(({ id, name }) => ({ id, name })) }
export function mockMaterials(type, categoryId) {
  const count = type === 'video' ? 2 : 3
  const items = [1, 2].flatMap(categoryIndex => Array.from({ length: count }, (_, index) => materialItem(type, categoryIndex, index + 1))).filter(item => !categoryId || item.categoryId === categoryId)
  return { items, nextCursor: null, hasMore: false }
}
export function mockMaterialDetail(id) {
  const match = /^material-(image|article|video)-(\d+)-(\d+)$/.exec(String(id || ''))
  if (!match) throw new Error('该素材不存在或已下线')
  const type = match[1], item = materialItem(type, Number(match[2]), Number(match[3]))
  return {
    ...item,
    allowedOperations: type === 'image' ? ['upload-qr', 'render', 'download'] : ['upload-qr', 'create-content-share', 'copy-link'],
    mediaUrl: type === 'video' ? 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' : materialCover,
    posterUrl: '/static/media/video-poster-background.png',
    inviteUrl: 'http://localhost:5173/#/pages/register/index?inviteCode=LXYA023',
    shareUrl: null,
    contentShareId: null,
    content: emptyContent(),
    qrRegion: type === 'image' ? { x: 0.7, y: 0.7, width: 0.22, height: 0.22 } : null,
    qrSlotAtEnd: type === 'article',
    videoDeliveryMode: type === 'video' ? 'INTERACTIVE_H5' : null,
    h5RouteReady: false,
  }
}
