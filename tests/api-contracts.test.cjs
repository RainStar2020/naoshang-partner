const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm')

async function setup() {
  const storage = new Map()
  let session = { token: 'demo', user: { id: 'A', name: '测试用户' } }
  const calls = [], config = { useMock: true, baseURL: 'https://api.example.test' }
  const context = vm.createContext({ console, setTimeout, uni: { getStorageSync: k => storage.get(k), setStorageSync: (k,v) => storage.set(k,v), removeStorageSync: k => storage.delete(k) } })
  const cache = new Map()
  function load(file) {
    if (cache.has(file)) return cache.get(file)
    let mod
    if (file.endsWith('/config')) mod = new vm.SyntheticModule(['config'], function() { this.setExport('config', config) }, { context })
    else if (file.endsWith('/services/api')) mod = new vm.SyntheticModule(['request', 'getSession'], function() {
      this.setExport('getSession', () => session)
      this.setExport('request', async (url, options) => { calls.push({url, ...options}); return { ok: true } })
    }, { context })
    else mod = new vm.SourceTextModule(fs.readFileSync(file + '.js', 'utf8'), { context, identifier: file })
    cache.set(file, mod)
    return mod
  }
  const root = path.resolve(__dirname, '../src/services/contracts').replaceAll('\\', '/')
  const api = load(root + '/index')
  await api.link((specifier, parent) => load(path.resolve(path.dirname(parent.identifier), specifier).replaceAll('\\', '/')))
  await api.evaluate()
  const client = cache.get(root + '/client').namespace
  client.contractConfig.delay = 0
  return { api: api.namespace, client, calls, config, switchUser: id => { session = {token:id, user:{id, name:id}} } }
}

test('all documented wrappers load; URL path values are encoded; methods and bodies survive', async () => {
  const { api, client, calls } = await setup()
  assert.ok(Object.keys(api).length > 170)
  client.contractConfig.useMock = false
  await api.patchAddressesById({path:{id:'a/b ?'}, data:{version:2, detail:'地址'}})
  assert.equal(calls[0].url, '/addresses/a%2Fb%20%3F')
  assert.equal(calls[0].method, 'PATCH')
  assert.equal(calls[0].data.version, 2)
  await assert.rejects(api.getProductsById(), /缺少路径参数/)
  await assert.rejects(api.postPaymentsNotifyByChannel({path:{channel:'wechat'}}), /仅供服务端/)
})

test('mock checkout and payment keep the existing stateful transaction flow offline', async () => {
  const { api, calls } = await setup()
  const catalog = await api.getCatalog()
  assert.ok(catalog.items.length)
  const product = catalog.items.find(item => item.fulfillmentType !== 'PHYSICAL')
  const options = await api.getCheckoutOptions()
  const quote = await api.postCheckoutQuotes({data:{productId:product.id, skuId:product.skus[0].id, quantity:1, storeId:options.stores[0].id, memberId:options.members[0].id}})
  const created = await api.postOrders({data:{quoteId:quote.id,idempotencyKey:'checkout'}})
  const attempt = await api.postPaymentsAttempts({data:{orderId:created.order.id,channel:'wechat',idempotencyKey:'payment'}})
  const paid = await api.getPaymentsAttemptsById({path:{id:attempt.id}})
  assert.equal(paid.status, 'SUCCEEDED')
  const bootstrap = await api.getMeBootstrap()
  assert.ok(bootstrap.contexts.length)
  assert.equal(calls.length, 0)
})

test('payment fixtures validate channels, replay original intent and isolate accounts', async () => {
  const { api, calls, switchUser } = await setup()
  const input = {data:{idempotencyKey:'same', channel:'wechat'}}
  const [first, second] = await Promise.all([api.postMeEntitlementOrders(input), api.postMeEntitlementOrders(input)])
  assert.equal(first.paymentId, second.paymentId)
  assert.equal((await api.getMePayments()).items.length, 1)
  const replay = await api.postMeEntitlementOrders({data:{channel:'alipay',idempotencyKey:'same'}})
  assert.equal(replay.paymentId, first.paymentId)
  assert.equal((await api.getMePayments()).items[0].channelName, 'wechat')
  await assert.rejects(api.postMeEntitlementOrders({data:{idempotencyKey:'same',channel:'wechat',quoteId:'different'}}), /幂等键/)
  await assert.rejects(api.postPartnerQuotaOrders({data:{idempotencyKey:'other', channel:'wechat'}}), /不支持/)
  switchUser('B')
  assert.equal((await api.getMePayments()).items.length, 0)
  assert.equal(calls.length, 0)
})
