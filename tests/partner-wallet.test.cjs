const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm')

async function loadPartnerWallet(request) {
  const storage = new Map()
  const context = vm.createContext({ console, uni: {getStorageSync:k=>storage.get(k),setStorageSync:(k,v)=>storage.set(k,v),removeStorageSync:k=>storage.delete(k)} })
  const root = path.resolve(__dirname, '../src/services/partner-wallet').replaceAll('\\', '/')
  const api = new vm.SyntheticModule(['getSession', 'request'], function () {
    this.setExport('getSession', () => ({ token: 'token-A', user: { id: 'p1' } }))
    this.setExport('request', request)
  }, { context })
  const mod = new vm.SourceTextModule(fs.readFileSync(`${root}.js`, 'utf8'), { context, identifier: root })
  const display = new vm.SyntheticModule(['storeDisplayAddress','storePhotoUrl'],function(){this.setExport('storeDisplayAddress',s=>s.address||'');this.setExport('storePhotoUrl',s=>s.imageUrl||'')},{context})
  await mod.link(s=>s==='./api'?api:display); await api.evaluate(); await mod.evaluate()
  return mod.namespace
}

test('partner points adapter sends context and consumes identity balances', async () => {
  const api = await loadPartnerWallet(async (path, options) => {
    assert.equal(path, '/wallet/withdrawal-options')
    assert.equal(options.data.contextId, 'agency:p1:ra_1')
    return { totalPoints: 3880, totalAvailable: 2880, availablePoints: 1880, identity: 'agent', identityLabel: '区域代理', identityBalances: [], exchangeRate: 1, rateNote: '积分与金额 1:1 兑换', minPoints: 100, maxPoints: 1880, allowedActions: ['exchange'], categories: [{ key: 'B', label: 'B端', points: 480 }], pointRecords: [{ id: 'c1', category: 'B端', source: '直推奖', points: 480, identity: 'agent', identityLabel: '区域代理', user: null, createdAt: '2026-10-30T10:00:00.000Z' }] }
  })
  const result = await api.getPartnerPointsOptions('agency:p1:ra_1')
  assert.equal(result.availablePoints, 1880)
  assert.equal(result.identityLabel, '区域代理')
  assert.equal(result.categories[0].label, 'B端')
  assert.equal(result.pointRecords[0].source, '直推奖')
})

test('partner points adapter preserves negative balances and deduction details', async () => {
  const api = await loadPartnerWallet(async () => ({ totalPoints: -390, totalAvailable: -390, availablePoints: -390, identity: 'partner', identityBalances: [], minPoints: 100, maxPoints: 0, allowedActions: [], hasNegativeBalance: true, negativeBalanceHint: '当前积分为 -390，需先补齐欠款', categories: [], pointRecords: [{ id: 'c2', source: '平级奖扣回', points: -390, pointsLabel: '减去 390 积分', isNegative: true, direction: 'out' }] }))
  const result = await api.getPartnerPointsOptions('partner:p1')
  assert.equal(result.availablePoints, -390)
  assert.equal(result.hasNegativeBalance, true)
  assert.equal(result.pointRecords[0].points, -390)
  assert.equal(result.pointRecords[0].pointsLabel, '减去 390 积分')
  assert.equal(result.pointRecords[0].direction, 'out')
})

test('points exchange sends identity context and returns the redemption number', async () => {
  const api = await loadPartnerWallet(async (path, options) => {
    assert.equal(path, '/wallet/withdrawals')
    assert.deepEqual(JSON.parse(JSON.stringify(options.data)), { points: 100, amount: 100, idempotencyKey: 'idem-1', contextId: 'costore:p1:cs_1', identity: 'costore' })
    return { status: 'PENDING_REVIEW', redemptionId: 'rdp_1', redemptionNo: 'rdp_1', identity: 'costore', identityLabel: '合店老板' }
  })
  const result = await api.exchangePartnerPoints(100, 'idem-1', 'costore:p1:cs_1')
  assert.equal(result.redemptionNo, 'rdp_1')
  assert.equal(api.redemptionNoOf({ id: 'rdp_old' }), 'rdp_old')
  assert.equal(api.withdrawalIdentityOf({ contextId: 'agency:p1:ra_1' }).identityLabel, '俱乐部')
})

test('store binding uses the documented context, direct endpoint, and DTO', async () => {
  const calls = []
  const api = await loadPartnerWallet(async (path, options = {}) => {
    calls.push({ path, options })
    if (path.endsWith('options')) return { accountId: 'p1', contextId: 'partner:p1', headquarters: { id: 'HQ', name: '总部服务' }, stores: [{ id: 'ra_001', storeNo: 'NO.001', name: '北京店', address: '朝阳区', regionCode: 'NO.001', manager: { id: 'store_01', name: '张三', phone: '13800000011' } }], boundStore: null, allowedActions: ['bind'] }
    return { status: 'BOUND', bindingId: 'psb_1', storeId: 'ra_001', operationId: 'op_1', store: { id: 'ra_001', storeNo: 'NO.001', name: '北京店', address: '朝阳区', regionCode: 'NO.001', manager: { id: 'store_01', name: '张三', phone: '13800000011' } } }
  })
  const options = await api.getPartnerStoreBindingOptions()
  assert.equal(calls[0].path, '/partner/store-binding-options')
  assert.equal(calls[0].options.data.contextId, 'partner:p1')
  assert.equal(options.stores[0].manager.name, '张三')
  const result = await api.bindPartnerStore('NO.001', 'idem-1')
  assert.equal(calls[1].path, '/partner/store-binding')
  assert.deepEqual(JSON.parse(JSON.stringify(calls[1].options.data)), { contextId: 'partner:p1', storeId: 'NO.001', idempotencyKey: 'idem-1' })
  assert.equal(result.store.storeNo, 'NO.001')
})


test('visible income and available totals remain independent and unknown totals stay unknown', async()=>{
 let payload={totalPoints:1000,availablePoints:600,totalAvailable:500,categories:[],pointRecords:[],allowedActions:[]}
 const api=await loadPartnerWallet(async()=>payload)
 const result=await api.getPartnerPointsOptions('partner:p1')
 assert.equal(result.totalPoints,1000)
 assert.equal(result.totalAvailable,500)
 delete payload.totalAvailable
 assert.equal((await api.getPartnerPointsOptions('partner:p1')).totalAvailable,null)
 delete payload.totalPoints
 await assert.rejects(api.getPartnerPointsOptions('partner:p1'),/积分数据格式异常/)
})

test('unknown exchange result retains original request across retries and prevents changed amount',async()=>{
 let calls=0
 const api=await loadPartnerWallet(async()=>{calls++;if(calls===1)throw new Error('timeout');return {id:'redemption-1',status:'PENDING_REVIEW'}})
 await assert.rejects(api.exchangePartnerPoints(100,'original','costore:p1:s1'),/timeout/)
 assert.equal(api.getPendingPartnerExchange('costore:p1:s1').idempotencyKey,'original')
 assert.equal(api.getPendingPartnerExchange('costore:p1:s2'),null)
 await assert.rejects(api.exchangePartnerPoints(200,'new','costore:p1:s1'),/上一笔/)
 assert.equal(calls,1)
 await api.exchangePartnerPoints(100,'original','costore:p1:s1')
 assert.equal(api.getPendingPartnerExchange('costore:p1:s1'),null)
})
