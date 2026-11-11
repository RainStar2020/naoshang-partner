import assert from 'node:assert/strict'
import test from 'node:test'
import { publicIdentityLabel, wholesaleLevelDisplay, vipQuotaUnitPrice } from '../src/features/business/account-rank.js'

test('none identity is shown as 群众, not the raw key', () => {
  assert.equal(publicIdentityLabel('none'), '群众')
  assert.equal(publicIdentityLabel('NONE'), '群众')
  assert.equal(publicIdentityLabel('None'), '群众')
  assert.equal(publicIdentityLabel(''), '')
  assert.equal(publicIdentityLabel('天使合伙人'), '天使合伙人')
  assert.equal(wholesaleLevelDisplay('none'), '群众')
  assert.equal(wholesaleLevelDisplay('NONE'), '群众')
  assert.equal(wholesaleLevelDisplay('vip'), '小批发商')
  assert.equal(wholesaleLevelDisplay('联创合伙人'), '总批发商')
  assert.equal(wholesaleLevelDisplay(''), '')
})

test('vip quota unit price uses recipient rank, and unknown or public identity is 9980', () => {
  assert.equal(vipQuotaUnitPrice('普通用户'), 9980)
  assert.equal(vipQuotaUnitPrice('群众'), 9980)
  assert.equal(vipQuotaUnitPrice('none'), 9980)
  assert.equal(vipQuotaUnitPrice('NONE'), 9980)
  assert.equal(vipQuotaUnitPrice(''), 9980)
  assert.equal(vipQuotaUnitPrice('unknown-tier'), 9980)
  assert.equal(vipQuotaUnitPrice('vip'), 7980)
  assert.equal(vipQuotaUnitPrice('小批发商'), 7980)
  assert.equal(vipQuotaUnitPrice('中批发商'), 7500)
  assert.equal(vipQuotaUnitPrice('大批发商'), 6980)
  assert.equal(vipQuotaUnitPrice('总批发商'), 6500)
})
