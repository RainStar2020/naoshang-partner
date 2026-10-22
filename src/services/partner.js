import { config } from '../config'
import { request, getSession } from './api'
import { normalizeContent } from '../features/content/rich-content'
import { mockPartnerOverview } from './mock/partner'
export async function getPartnerOverview() {
  const user = getSession()?.user, accountId = user?.id
  if (!accountId) throw new Error('请先登录')
  const result = config.useMock ? mockPartnerOverview(user) : await request('/partner/overview')
  if (getSession()?.user?.id !== accountId) throw new Error('登录账号已变化，请重新加载')
  if (result?.accountId !== accountId || !Array.isArray(result.benefits) || !result.levelName) throw new Error('合伙人数据格式异常')
  return { ...result, benefits: result.benefits.map(item => ({ ...item, content: normalizeContent(item.content) })) }
}
