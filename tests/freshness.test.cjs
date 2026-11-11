const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

async function loadFreshness() {
  const context = vm.createContext({ console, Date })
  const file = path.resolve(__dirname, '../src/services/freshness.js').replaceAll('\\', '/')
  const mod = new vm.SourceTextModule(fs.readFileSync(file, 'utf8'), { context, identifier: file })
  await mod.link(async () => { throw new Error('unexpected import') })
  await mod.evaluate()
  return mod.namespace
}

test('createFreshnessTracker skips refresh inside TTL until generation bumps', async () => {
  const api = await loadFreshness()
  const tracker = api.createFreshnessTracker(30_000)
  assert.equal(tracker.shouldRefresh(), true)
  tracker.markLoaded()
  assert.equal(tracker.shouldRefresh(), false)
  assert.equal(tracker.shouldRefresh({ force: true }), true)
  api.bumpDataFreshness()
  assert.equal(tracker.shouldRefresh(), true)
  tracker.markLoaded()
  assert.equal(tracker.shouldRefresh(), false)
  tracker.markStale()
  assert.equal(tracker.shouldRefresh(), true)
})

test('createFreshnessTracker with ttl 0 always refreshes', async () => {
  const api = await loadFreshness()
  const tracker = api.createFreshnessTracker(0)
  tracker.markLoaded()
  assert.equal(tracker.shouldRefresh(), true)
})
