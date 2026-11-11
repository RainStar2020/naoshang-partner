import { vipQuotaUnitPrice, wholesaleLevelDisplay } from './account-rank.js'

const snapshots = new Map()

function pickRemaining(...values) {
  for (const value of values) {
    if (value == null || value === '') continue
    const n = typeof value === 'number' ? value : Number(value)
    if (Number.isFinite(n) && n >= 0) return n
  }
  return null
}

export function clearQuotaTransferSnapshots() {
  snapshots.clear()
}

export function normalizeTransferRecipient(item) {
  if (!item || typeof item !== 'object') return null
  const id = item.id || item.accountId || item.targetAccountId || item.memberId || item.value
  if (!id) return null
  const levelLabel =
    item.levelLabel || item.levelName || item.tierLabel || item.tier || item.level || ''
  return {
    ...item,
    id: String(id),
    name: item.name || item.label || '',
    phone: item.phone || '',
    displayId: item.displayId || '',
    avatarUrl: item.avatarUrl || '',
    levelLabel,
    displayLevelLabel: wholesaleLevelDisplay(levelLabel) || levelLabel || '普通用户',
  }
}

export function rememberQuotaTransferSnapshot(contextId, patch = {}) {
  const id = String(contextId || '').trim()
  if (!id) return getQuotaTransferSnapshot('')
  const prev = snapshots.get(id) || { standardRemaining: null, members: [] }
  const next = {
    standardRemaining: prev.standardRemaining,
    members: Array.isArray(prev.members) ? prev.members.slice() : [],
  }
  const remaining = pickRemaining(patch.standardRemaining)
  if (remaining != null) next.standardRemaining = remaining
  if (Array.isArray(patch.members)) {
    next.members = patch.members.map(normalizeTransferRecipient).filter(Boolean)
  }
  if (patch.person) {
    const person = normalizeTransferRecipient(patch.person)
    if (person) {
      const index = next.members.findIndex((item) => item.id === person.id)
      if (index >= 0) next.members[index] = { ...next.members[index], ...person }
      else next.members.push(person)
    }
  }
  snapshots.set(id, next)
  return next
}

export function getQuotaTransferSnapshot(contextId) {
  const id = String(contextId || '').trim()
  const current = snapshots.get(id)
  return {
    standardRemaining: current?.standardRemaining ?? null,
    members: Array.isArray(current?.members) ? current.members.slice() : [],
  }
}

export function hydrateQuotaTransferSnapshot(contextId, bootstrap) {
  const snap = getQuotaTransferSnapshot(contextId)
  if (!bootstrap || typeof bootstrap !== 'object') return snap
  const remaining = pickRemaining(
    snap.standardRemaining,
    bootstrap.vipDetails?.standardRemaining,
    bootstrap.vipDetails?.remainingCount,
    bootstrap.quota,
  )
  const members =
    snap.members.length
      ? snap.members
      : Array.isArray(bootstrap.team?.members)
        ? bootstrap.team.members
        : []
  return rememberQuotaTransferSnapshot(contextId, {
    ...(snap.standardRemaining == null && remaining != null ? { standardRemaining: remaining } : {}),
    ...(!snap.members.length && members.length ? { members } : {}),
  })
}

/** Local display price only. Never use API wholesalePerQuota; unknown / none / 普通用户 is 9980. */
export function transferUnitAmountFor(person) {
  if (!person) return vipQuotaUnitPrice('')
  return vipQuotaUnitPrice(
    person.levelLabel || person.tierLabel || person.tier || person.levelName || person.level || '',
  )
}

export function buildQuotaTransferPayload({ contextId, targetAccountId, quantity, idempotencyKey }) {
  const ctx = String(contextId || '').trim()
  const target = String(targetAccountId || '').trim()
  const key = String(idempotencyKey || '').trim()
  if (!ctx) throw new Error('缺少经营身份编号，请从工作台重新进入')
  if (!target) throw new Error('请选择接收人')
  if (!/^[1-9]\d{0,3}$/.test(String(quantity))) throw new Error('请输入 1–9999 的整数名额')
  if (!key) throw new Error('请先确认本次操作')
  return {
    contextId: ctx,
    targetAccountId: target,
    quantity: Number(quantity),
    idempotencyKey: key,
  }
}

export function resolveQuotaTransferModalState(contextId, targetAccountId, bootstrap) {
  const snap = hydrateQuotaTransferSnapshot(contextId, bootstrap)
  const target = String(targetAccountId || '').trim()
  let members = snap.members.slice()
  if (target && !members.some((item) => item.id === target)) {
    const person = normalizeTransferRecipient({ id: target })
    if (person) members = [person, ...members]
  }
  if (!members.length) throw new Error('请从团队页选择接收人')
  const memberOptions = members.map((item) => ({ value: item.id, label: item.name || item.id }))
  return {
    fields: [
      { key: 'targetAccountId', label: '受益成员', type: 'enum', options: memberOptions },
      { key: 'quantity', label: '名额数量', type: 'integer', max: 9999 },
    ],
    members,
    standardRemaining: snap.standardRemaining,
    allowedActions: ['submit'],
    localOnly: true,
  }
}
