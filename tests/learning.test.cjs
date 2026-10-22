const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

async function setup(useMock = true, remote = () => { throw new Error('Unexpected network') }) {
  const storage = new Map(), session = { user: { id: 'account-A', name: '体验家长' }, token: 'mock' }
  const context = vm.createContext({ console, uni: {
    getStorageSync: key => storage.get(key), setStorageSync: (key, value) => storage.set(key, value), removeStorageSync: key => storage.delete(key),
  } })
  const cache = new Map()
  async function load(file) {
    if (cache.has(file)) return cache.get(file)
    let module
    if (file.endsWith('/config')) module = new vm.SyntheticModule(['config'], function () { this.setExport('config', { useMock }) }, { context })
    else if (file.endsWith('/api')) module = new vm.SyntheticModule(['getSession', 'request'], function () { this.setExport('getSession', () => session); this.setExport('request', remote) }, { context })
    else module = new vm.SourceTextModule(fs.readFileSync(file + '.js', 'utf8'), { context, identifier: file })
    cache.set(file, module)
    await module.link((specifier, parent) => load(path.resolve(path.dirname(parent.identifier), specifier).replaceAll('\\', '/')))
    return module
  }
  const root = path.resolve(__dirname, '../src').replaceAll('\\', '/')
  const learning = await load(root + '/services/learning'); await learning.evaluate()
  const content = await load(root + '/features/content/rich-content')
  if (content.status !== 'evaluated') await content.evaluate()
  return { learning: learning.namespace, content: content.namespace, storage, session }
}
test('parent cannot inherit a child entitlement; CMS benefits remain blank for every level', async () => {
  const { learning: api } = await setup()
  const rows = await api.getLearningIdentities()
  assert.equal(api.getSelectedIdentity(rows).mode, 'parent')
  assert.ok((await api.getLearningLevels(rows[0])).every(level => !level.unlocked))
  assert.ok((await api.getLearningLevels(rows[1])).every(level => level.unlocked))
  for (const level of await api.getLearningLevels(rows[1])) {
    const detail = await api.getLearningLevelDetail(rows[1].id, level.id)
    assert.equal(detail.content.nodes.length, 0)
    assert.equal(detail.covers.length, 0)
    assert.ok(detail.chapters.length > 0); assert.ok(detail.chapters.every(x=>x.accessible===detail.unlocked))
  }
})
test('identity is account scoped; forged and stale contexts are rejected', async () => {
  const { learning: api, session } = await setup()
  const rows = await api.getLearningIdentities()
  api.selectLearningIdentity(rows[2].id, rows)
  assert.equal(api.getSelectedIdentity(rows).id, rows[2].id)
  await assert.rejects(api.getLearningLevelDetail('child:other-account:1', 'level-1'), /无权/)
  session.user.id = 'account-B'
  assert.equal(api.getSelectedIdentity(await api.getLearningIdentities()).mode, 'parent')
  assert.throws(() => api.selectLearningIdentity(rows[2].id, rows), /失效/)
  await assert.rejects(api.getLearningLevels(rows[2]), /无权/)
})
test('activation checks beneficiary and code; retries are idempotent without duplicating grants', async () => {
  const { learning: api } = await setup()
  const rows = await api.getLearningIdentities(), target = rows[2]
  await assert.rejects(api.previewLevelActivation(rows[0].id, 'DEMO-L1', 'level-1'), /选择/)
  await assert.rejects(api.previewLevelActivation(target.id, 'wrong', 'level-1'), /无效/)
  await assert.rejects(api.previewLevelActivation(target.id, 'DEMO-L1', 'level-2'), /无效/)
  assert.equal((await api.previewLevelActivation(target.id, 'DEMO-L1', 'level-1')).memberId, target.memberId)
  const payload = { code: 'DEMO-L1', levelId: 'level-1', idempotencyKey: 'one-intent' }
  const a = await api.activateLearningLevel(target.id, payload)
  const b = await api.activateLearningLevel(target.id, payload)
  assert.equal(a.activationId, b.activationId)
  await assert.rejects(api.activateLearningLevel(target.id, { ...payload, levelId: 'level-2' }), /参数不一致/)
  await assert.rejects(api.activateLearningLevel(target.id, { ...payload, idempotencyKey: 'duplicate-intent' }), /已解锁/)
  const detail = await api.getLearningLevelDetail(target.id, 'level-1')
  assert.equal(detail.unlocked, true)
  assert.equal(detail.content.nodes.length, 0)
})
test('rich nodes retain text and HTTPS images but strip executable content and arbitrary attributes', async () => {
  const { content } = await setup()
  const result = content.normalizeContent({ version: 1, format: 'nodes', nodes: [
    { name: 'script', children: [{ type: 'text', text: 'bad()' }] },
    { name: 'p', attrs: { onclick: 'bad()', style: 'position:fixed' }, children: [{ type: 'text', text: '客户文字' }] },
    { name: 'img', attrs: { src: 'javascript:bad()' } },
    { name: 'img', attrs: { src: 'https://cdn.example.com/photo.png', onerror: 'bad()' } },
  ] })
  assert.equal(result.nodes.length, 2)
  assert.equal(result.nodes[0].children[0].text, '客户文字')
  assert.equal(result.nodes[1].attrs.src, 'https://cdn.example.com/photo.png')
  assert.equal(result.nodes[1].attrs.onerror, undefined)
  assert.equal(result.nodes[0].attrs.onclick, undefined)
  assert.equal(JSON.stringify(result).includes('position:fixed'), false)
  assert.throws(() => content.normalizeContent({ format: 'html', html: '<b>text</b>' }), /格式/)
})
test('remote failure never falls back to mock content or authorization', async () => {
  const { learning: api } = await setup(false, () => Promise.reject(new Error('network-down')))
  await assert.rejects(api.getLearningIdentities(), /network-down/)
})
test('a late bootstrap response is rejected after the logged-in account changes', async () => {
  let finish
  const pending = new Promise(resolve => { finish = resolve })
  const { learning: api, session } = await setup(false, () => pending)
  const result = api.getLearningIdentities()
  session.user.id = 'account-B'
  finish({ contexts: [{ id: 'parent:account-A', accountId: 'account-A', mode: 'parent' }] })
  await assert.rejects(result, /账号已变化/)
})
