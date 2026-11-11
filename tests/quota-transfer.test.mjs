import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildQuotaTransferPayload,
  clearQuotaTransferSnapshots,
  getQuotaTransferSnapshot,
  hydrateQuotaTransferSnapshot,
  normalizeTransferRecipient,
  rememberQuotaTransferSnapshot,
  resolveQuotaTransferModalState,
  transferUnitAmountFor,
} from '../src/features/business/quota-transfer.js'

test('transfer unit price uses the local table and never wholesalePerQuota', () => {
  assert.equal(transferUnitAmountFor({ levelLabel: '普通用户' }), 9980)
  assert.equal(transferUnitAmountFor({ levelLabel: 'none' }), 9980)
  assert.equal(transferUnitAmountFor({ tier: 'NONE' }), 9980)
  assert.equal(transferUnitAmountFor({ levelLabel: '' }), 9980)
  assert.equal(transferUnitAmountFor(null), 9980)
  assert.equal(transferUnitAmountFor({ levelLabel: 'unknown-tier', wholesalePerQuota: 7980 }), 9980)
  assert.equal(transferUnitAmountFor({ tier: 'vip', wholesalePerQuota: 1 }), 7980)
  assert.equal(transferUnitAmountFor({ levelLabel: '小批发商' }), 7980)
  assert.equal(transferUnitAmountFor({ levelLabel: '中批发商' }), 7500)
  assert.equal(transferUnitAmountFor({ tier: 'private' }), 6980)
  assert.equal(transferUnitAmountFor({ levelLabel: '总批发商' }), 6500)
})

test('submit payload has only contextId, targetAccountId, quantity and idempotencyKey', () => {
  const payload = buildQuotaTransferPayload({
    contextId: 'wholesale:A',
    targetAccountId: 'demo-person-1',
    quantity: '2',
    idempotencyKey: 'k1',
  })
  assert.deepEqual(payload, {
    contextId: 'wholesale:A',
    targetAccountId: 'demo-person-1',
    quantity: 2,
    idempotencyKey: 'k1',
  })
  assert.equal('quoteId' in payload, false)
  assert.throws(
    () => buildQuotaTransferPayload({ contextId: 'wholesale:A', quantity: '2', idempotencyKey: 'k1' }),
    /接收人/,
  )
  assert.throws(
    () =>
      buildQuotaTransferPayload({
        contextId: 'wholesale:A',
        targetAccountId: 'demo-person-1',
        quantity: '1.5',
        idempotencyKey: 'k1',
      }),
    /整数/,
  )
})

test('modal state is built from the local team snapshot and page remaining, not options prices', () => {
  clearQuotaTransferSnapshots()
  rememberQuotaTransferSnapshot('wholesale:A', {
    standardRemaining: 17,
    members: [
      { id: 'demo-person-1', name: '李志远', levelLabel: '普通用户', wholesalePerQuota: 7980 },
      { accountId: 'demo-person-2', name: '王好梦', tier: 'angel' },
    ],
  })
  const state = resolveQuotaTransferModalState('wholesale:A', 'demo-person-1')
  assert.equal(state.localOnly, true)
  assert.deepEqual(state.allowedActions, ['submit'])
  assert.equal(state.standardRemaining, 17)
  assert.equal(state.members[0].id, 'demo-person-1')
  assert.equal(state.members[0].levelLabel, '普通用户')
  assert.equal(transferUnitAmountFor(state.members[0]), 9980)
  assert.equal(transferUnitAmountFor(state.members[1]), 7500)
  assert.equal(state.fields.some((field) => field.key === 'targetAccountId'), true)
})

test('bootstrap only fills missing remaining or members, and never overwrites live snapshot values', () => {
  clearQuotaTransferSnapshots()
  rememberQuotaTransferSnapshot('wholesale:A', { standardRemaining: 11 })
  hydrateQuotaTransferSnapshot('wholesale:A', {
    vipDetails: { standardRemaining: 99 },
    team: { members: [{ id: 'from-bootstrap', name: 'bootstrap', tier: 'vip' }] },
  })
  const snap = getQuotaTransferSnapshot('wholesale:A')
  assert.equal(snap.standardRemaining, 11)
  assert.equal(snap.members[0].id, 'from-bootstrap')
  rememberQuotaTransferSnapshot('wholesale:A', {
    members: [{ id: 'live-member', name: 'live', levelLabel: '小批发商' }],
  })
  hydrateQuotaTransferSnapshot('wholesale:A', {
    vipDetails: { standardRemaining: 99 },
    team: { members: [{ id: 'from-bootstrap', name: 'bootstrap', tier: 'vip' }] },
  })
  const later = getQuotaTransferSnapshot('wholesale:A')
  assert.equal(later.standardRemaining, 11)
  assert.equal(later.members[0].id, 'live-member')
  assert.equal(later.members.length, 1)
})

test('opening without a cached team or selected recipient is rejected instead of inventing options', () => {
  clearQuotaTransferSnapshots()
  assert.throws(() => resolveQuotaTransferModalState('wholesale:missing', ''), /团队页/)
  const person = normalizeTransferRecipient({ id: 'only-id', tier: 'none' })
  assert.equal(person.id, 'only-id')
  assert.equal(transferUnitAmountFor(person), 9980)
})
