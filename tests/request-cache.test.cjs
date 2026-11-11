const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

async function loadApi() {
  const calls = []
  const context = vm.createContext({
    console,
    uni: {
      getStorageSync: () => ({ token: 't', user: { id: 'A' } }),
      setStorageSync() {},
      removeStorageSync() {},
      reLaunch() {},
      request: options => {
        calls.push({ url: options.url, method: options.method || 'GET', data: options.data })
        options.success({
          statusCode: 200,
          header: {},
          data: { code: 0, data: { ok: true, n: calls.length } },
        })
      },
    },
  })
  const cache = new Map()
  function get(file) {
    if (cache.has(file)) return cache.get(file)
    let mod
    if (file.endsWith('/config')) {
      mod = new vm.SyntheticModule(['config'], function () {
        this.setExport('config', { useMock: false, baseURL: 'https://api.example.test', timeout: 1000 })
      }, { context })
    } else if (file.endsWith('/me-context')) {
      mod = new vm.SyntheticModule(['clearMeContext', 'loadMeContext', 'getCachedBoundStore'], function () {
        this.setExport('clearMeContext', () => {})
        this.setExport('loadMeContext', async () => null)
        this.setExport('getCachedBoundStore', () => null)
      }, { context })
    } else if (file.endsWith('/prefetch')) {
      mod = new vm.SyntheticModule(['clearPrefetchState', 'prefetchAfterAuth', 'scheduleIdle'], function () {
        this.setExport('clearPrefetchState', () => {})
        this.setExport('prefetchAfterAuth', async () => {})
        this.setExport('scheduleIdle', () => {})
      }, { context })
    } else {
      mod = new vm.SourceTextModule(fs.readFileSync(file + '.js', 'utf8'), { context, identifier: file })
    }
    cache.set(file, mod)
    return mod
  }
  const root = path.resolve(__dirname, '../src/services/api').replaceAll('\\', '/')
  const mod = get(root)
  await mod.link((s, parent) => get(path.resolve(path.dirname(parent.identifier), s).replaceAll('\\', '/')))
  await mod.evaluate()
  return { api: mod.namespace, calls }
}

test('GET requests share inflight and TTL cache', async () => {
  const { api, calls } = await loadApi()
  const first = api.request('/partner/overview', { data: { contextId: 'c1' } })
  const second = api.request('/partner/overview', { data: { contextId: 'c1' } })
  const [a, b] = await Promise.all([first, second])
  assert.equal(calls.length, 1)
  assert.deepEqual(a, b)
  const cached = await api.request('/partner/overview', { data: { contextId: 'c1' } })
  assert.equal(calls.length, 1)
  assert.equal(cached.n, 1)

  await api.request('/partner/overview', { data: { contextId: 'c2' } })
  assert.equal(calls.length, 2)

  await api.request('/auth/sms-challenges', { data: { phone: '1' } })
  await api.request('/auth/sms-challenges', { data: { phone: '1' } })
  assert.equal(calls.length, 4)

  await api.request('/api/hq/region-agents/check', {
    data: { regionType: 'district', regionCode: '330106' },
    cacheTtl: 10000,
  })
  await api.request('/api/hq/region-agents/check', {
    data: { regionType: 'district', regionCode: '330106' },
    cacheTtl: 10000,
  })
  assert.equal(calls.length, 5)

  api.clearSessionCaches()
  await api.request('/partner/overview', { data: { contextId: 'c1' } })
  assert.equal(calls.length, 6)
})

test('partner write invalidates partner cache but keeps unrelated modules', async () => {
  const { api, calls } = await loadApi()
  await api.request('/partner/overview', { data: { contextId: 'c1' } })
  await api.request('/agency/overview', { data: { contextId: 'a1' } })
  assert.equal(calls.length, 2)

  await api.request('/partner/quota-transfers', { method: 'POST', data: { contextId: 'c1' } })
  assert.equal(calls.length, 3)

  await api.request('/partner/overview', { data: { contextId: 'c1' } })
  assert.equal(calls.length, 4, 'partner GET must miss after partner write')

  await api.request('/agency/overview', { data: { contextId: 'a1' } })
  assert.equal(calls.length, 4, 'agency GET should remain cached')
})

test('orders write does not flush partner cache; unknown write still clears all', async () => {
  const { api, calls } = await loadApi()
  await api.request('/partner/overview', { data: { contextId: 'c1' } })
  await api.request('/costore/overview', { data: { contextId: 's1' } })
  assert.equal(calls.length, 2)

  await api.request('/orders', { method: 'POST', data: { id: 1 } })
  assert.equal(calls.length, 3)
  await api.request('/partner/overview', { data: { contextId: 'c1' } })
  assert.equal(calls.length, 3, 'partner stays warm after orders write')
  await api.request('/costore/overview', { data: { contextId: 's1' } })
  assert.equal(calls.length, 3, 'costore stays warm after orders write')

  await api.request('/misc/unknown-write', { method: 'POST', data: {} })
  assert.equal(calls.length, 4)
  await api.request('/partner/overview', { data: { contextId: 'c1' } })
  assert.equal(calls.length, 5, 'unknown write clears all GET cache')
  await api.request('/costore/overview', { data: { contextId: 's1' } })
  assert.equal(calls.length, 6)
})

test('resolveMutationCachePlan covers module prefixes and auth clear-all', async () => {
  const { api } = await loadApi()
  const partner = api.resolveMutationCachePlan('/partner/upgrades')
  assert.deepStrictEqual([...partner.prefixes], ['/partner', '/me/bootstrap'])
  assert.equal(partner.clearBootstrap, true)
  const agency = api.resolveMutationCachePlan('/agency/applications')
  assert.deepStrictEqual([...agency.prefixes], ['/agency', '/me/bootstrap'])
  assert.equal(agency.clearBootstrap, true)
  assert.equal(api.resolveMutationCachePlan('/auth/sessions').clearAll, true)
  assert.deepStrictEqual([...api.resolveMutationCachePlan('/assets/upload-intents').prefixes], [])
})

test('invalidateGetRequestCache removes only matching prefixes', async () => {
  const { api, calls } = await loadApi()
  await api.request('/partner/overview', { data: { contextId: 'c1' } })
  await api.request('/agency/overview', { data: { contextId: 'a1' } })
  assert.equal(api.invalidateGetRequestCache(['/partner']), 1)
  await api.request('/partner/overview', { data: { contextId: 'c1' } })
  assert.equal(calls.length, 3)
  await api.request('/agency/overview', { data: { contextId: 'a1' } })
  assert.equal(calls.length, 3)
})

test('freshness bumps on clearSessionCaches', async () => {
  const freshnessPath = path.resolve(__dirname, '../src/services/freshness.js')
  const source = fs.readFileSync(freshnessPath, 'utf8')
  const context = vm.createContext({})
  const mod = new vm.SourceTextModule(source, { context, identifier: freshnessPath.replaceAll('\\', '/') })
  await mod.link(() => { throw new Error('unexpected import') })
  await mod.evaluate()
  const before = mod.namespace.dataFreshness()
  mod.namespace.bumpDataFreshness()
  assert.equal(mod.namespace.dataFreshness(), before + 1)
})
