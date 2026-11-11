const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

async function loadPrefetch(stubs = {}) {
  const context = vm.createContext({
    console,
    setTimeout: (fn) => fn(),
    globalThis: { requestIdleCallback: undefined },
  })
  const cache = new Map()
  const calls = { auth: [], workspace: [], catalog: 0, overview: [], report: [], materials: 0 }

  const defaults = {
    '/config': {
      config: {
        useMock: false,
        prefetchMode: stubs.prefetchMode || 'current',
      },
    },
    '/api': {
      getSession: () => stubs.session || { token: 't', user: { id: 'A' }, accountType: 'parent' },
      getBootstrap: async () => { calls.auth.push('bootstrap'); return { businessContexts: [] } },
    },
    '/me-context': {
      loadMeContext: async () => { calls.auth.push('me'); return { profile: { id: 'A' } } },
    },
    '/commerce': {
      getCatalog: async () => { calls.catalog += 1; return { categories: [], items: [] } },
    },
    '/business': {
      getBusinessContexts: async () => stubs.contexts || [
        { id: 'w1', module: 'wholesale' },
        { id: 'a1', module: 'agency' },
        { id: 'c1', module: 'costore' },
      ],
      getBusinessOverview: async (module, id) => {
        calls.overview.push(`${module}:${id}`)
        return {
          context: { id, module },
          tools: stubs.tools || [{ id: 'income' }, { id: 'team' }, { id: 'materials' }],
          globalAwardEligibility: stubs.eligible ? { eligible: true } : { eligible: false },
          benefits: [],
        }
      },
      getBusinessReport: async (module, toolId, contextId) => {
        calls.report.push(`${module}/${toolId}@${contextId}`)
        return { items: [] }
      },
    },
    '/materials': {
      getMaterialCategories: async () => { calls.materials += 1; return [] },
      getMaterials: async () => { calls.materials += 1; return { items: [], hasMore: false, nextCursor: null } },
    },
    '/partner-catalog': {
      getWholesaleBenefitCatalog: async () => { calls.auth.push('benefits'); return [] },
    },
  }

  function get(file) {
    if (cache.has(file)) return cache.get(file)
    const normalized = file.replaceAll('\\', '/')
    const suffix = Object.keys(defaults).find(key => normalized.endsWith(key))
    let mod
    if (suffix) {
      const exports = { ...defaults[suffix], ...(stubs.overrides?.[suffix] || {}) }
      mod = new vm.SyntheticModule(Object.keys(exports), function () {
        for (const [key, value] of Object.entries(exports)) this.setExport(key, value)
      }, { context })
    } else {
      mod = new vm.SourceTextModule(fs.readFileSync(file + '.js', 'utf8'), { context, identifier: file })
    }
    cache.set(file, mod)
    return mod
  }

  const root = path.resolve(__dirname, '../src/services/prefetch').replaceAll('\\', '/')
  const mod = get(root)
  await mod.link((s, parent) => get(path.resolve(path.dirname(parent.identifier), s).replaceAll('\\', '/')))
  await mod.evaluate()
  return { api: mod.namespace, calls }
}

test('current mode warms only me + bootstrap after auth', async () => {
  const { api, calls } = await loadPrefetch({ prefetchMode: 'current' })
  const first = api.prefetchAfterAuth()
  const second = api.prefetchAfterAuth()
  assert.equal(first, second)
  await first
  assert.deepEqual(calls.auth.filter(item => item === 'me' || item === 'bootstrap').sort(), ['bootstrap', 'me'])
  assert.equal(calls.catalog, 0)
  assert.equal(calls.overview.length, 0)
  assert.ok(!calls.auth.includes('benefits'))
  assert.equal(api.resolvePrefetchMode(), 'current')

  await api.prefetchAfterAuth()
  assert.equal(calls.auth.filter(item => item === 'me').length, 1)

  api.clearPrefetchState()
  await api.prefetchAfterAuth()
  assert.equal(calls.auth.filter(item => item === 'me').length, 2)
})

test('full mode warms catalog and module overviews after auth', async () => {
  const { api, calls } = await loadPrefetch({ prefetchMode: 'full' })
  await api.prefetchAfterAuth()
  assert.equal(calls.catalog, 1)
  assert.ok(calls.overview.includes('wholesale:w1'))
  assert.ok(calls.overview.includes('agency:a1'))
  assert.ok(calls.overview.includes('costore:c1'))
  assert.ok(calls.auth.includes('benefits'))
  assert.equal(api.resolvePrefetchMode(), 'full')
})

test('prefetchAfterAuth skips non-parent accounts', async () => {
  const { api, calls } = await loadPrefetch({
    session: { token: 't', user: { id: 'C' }, accountType: 'coach' },
  })
  await api.prefetchAfterAuth()
  assert.equal(calls.catalog, 0)
  assert.equal(calls.overview.length, 0)
  assert.equal(calls.auth.length, 0)
})

test('current workspace prefetch only warms income', async () => {
  const { api, calls } = await loadPrefetch({ prefetchMode: 'current' })
  const overview = {
    context: { id: 'w1', module: 'wholesale' },
    tools: [{ id: 'income' }, { id: 'materials' }, { id: 'superior' }],
    globalAwardEligibility: { eligible: true },
  }
  await api.prefetchPartnerWorkspace(overview)
  await api.prefetchPartnerWorkspace(overview)
  assert.deepEqual(
    calls.report.filter(item => item.startsWith('wholesale/')),
    ['wholesale/income@w1'],
  )
  assert.equal(calls.materials, 0)

  const agency = {
    context: { id: 'a1', module: 'agency' },
    tools: [{ id: 'team' }, { id: 'income' }],
  }
  await api.prefetchPartnerWorkspace(agency)
  assert.deepEqual(
    calls.report.filter(item => item.startsWith('agency/')),
    ['agency/income@a1'],
  )
})

test('full workspace prefetch warms visible high-frequency tools', async () => {
  const { api, calls } = await loadPrefetch({ prefetchMode: 'full', eligible: true })
  const overview = {
    context: { id: 'w1', module: 'wholesale' },
    tools: [{ id: 'income' }, { id: 'materials' }, { id: 'superior' }],
    globalAwardEligibility: { eligible: true },
  }
  await api.prefetchPartnerWorkspace(overview)
  assert.deepEqual(
    calls.report.filter(item => item.startsWith('wholesale/')),
    ['wholesale/income@w1', 'wholesale/superior@w1'],
  )
  assert.equal(calls.materials, 2)

  const agency = {
    context: { id: 'a1', module: 'agency' },
    tools: [{ id: 'team' }, { id: 'income' }],
  }
  await api.prefetchPartnerWorkspace(agency)
  assert.ok(calls.report.includes('agency/team@a1'))
  assert.ok(calls.report.includes('agency/income@a1'))
})

test('workspace prefetch failures stay silent and allow retry after clear', async () => {
  const { api, calls } = await loadPrefetch({
    overrides: {
      '/business': {
        getBusinessContexts: async () => [{ id: 'w1', module: 'wholesale' }],
        getBusinessOverview: async () => ({ context: { id: 'w1', module: 'wholesale' }, tools: [], benefits: [] }),
        getBusinessReport: async () => { throw new Error('boom') },
      },
    },
  })
  await assert.doesNotReject(() => api.prefetchPartnerWorkspace({
    context: { id: 'w1', module: 'wholesale' },
    tools: [{ id: 'income' }],
  }))
  assert.equal(calls.report.length, 0)
})

test('scheduleIdle runs work without throwing to caller', async () => {
  const { api } = await loadPrefetch()
  let ran = false
  api.scheduleIdle(() => { ran = true }, 0)
  assert.equal(ran, true)
  assert.doesNotThrow(() => api.scheduleIdle(() => { throw new Error('idle fail') }, 0))
})
