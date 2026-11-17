import { config } from '../config'
import { request } from './api'
import { emptyContent, normalizeContent } from '../features/content/rich-content'

const LEVELS = [
  ['province', '省代'],
  ['city', '市代'],
  ['district', '区县代理'],
  ['store', '单店代理'],
  ['costore_owner', '合店老板'],
]

const levelMeta = new Map(LEVELS)

function textContent(value) {
  const lines = String(value || '').replace(/\r\n?/g, '\n').split('\n').map(line => line.trim()).filter(Boolean)
  return {
    version: 1,
    format: 'nodes',
    nodes: lines.map(text => ({ name: 'p', children: [{ type: 'text', text }] })),
  }
}

function normalizeBenefit(item) {
  const agentLevel = String(item?.agentLevel || '').trim()
  if (!levelMeta.has(agentLevel)) throw new Error('代理权益数据格式异常')
  const content = typeof item.content === 'string'
    ? textContent(item.content)
    : normalizeContent(item?.content)
  return {
    id: agentLevel,
    agentLevel,
    label: levelMeta.get(agentLevel),
    title: String(item?.title || `${levelMeta.get(agentLevel)}权益`).trim(),
    content,
    version: item?.version ?? null,
  }
}

/** Shared H5/HQ agent-benefit catalog. The API always supplies the five levels. */
export async function getAgentBenefits() {
  if (config.useMock) {
    return LEVELS.map(([agentLevel, label]) => ({
      id: agentLevel, agentLevel, label, title: `${label}权益`, content: emptyContent(), version: null,
    }))
  }
  const payload = await request('/agent-benefits')
  if (!payload || !Array.isArray(payload.items)) throw new Error('代理权益数据格式异常')
  const byLevel = new Map(payload.items.map(item => [item?.agentLevel, normalizeBenefit(item)]))
  return LEVELS.map(([agentLevel]) => byLevel.get(agentLevel) || {
    id: agentLevel, agentLevel, label: levelMeta.get(agentLevel), title: `${levelMeta.get(agentLevel)}权益`, content: emptyContent(), version: null,
  })
}
