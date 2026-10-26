const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

async function setup(useMock = true, remote = () => { throw new Error('Unexpected network') }, storage = new Map()) {
  const session = { user: { id: 'account-A', name: '体验家长' }, token: 'mock' }
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

test('child video progress resumes, never regresses completion, survives reload and is isolated from siblings', async () => {
  const {learning:api,storage}=await setup(),rows=await api.getLearningIdentities()
  const query={contextId:rows[1].id,levelId:'level-1',chapterId:'level-1-video'}
  assert.equal((await api.getLearningLevelDetail(query.contextId,query.levelId)).chapters[1].progress,null)
  assert.equal((await api.saveLearningProgress(query,{positionSeconds:24,durationSeconds:60})).percent,40)
  const rewound=await api.saveLearningProgress(query,{positionSeconds:8,durationSeconds:60})
  assert.equal(rewound.percent,40);assert.equal(rewound.positionSeconds,8)
  const reloaded=(await setup(true,undefined,storage)).learning
  const resumed=(await reloaded.getLearningLevelDetail(query.contextId,query.levelId)).chapters[1].progress
  assert.equal(resumed.positionSeconds,8);assert.ok(resumed.lastStudiedAt)
  await reloaded.saveLearningProgress(query,{positionSeconds:60,durationSeconds:60,ended:true})
  const replay=await reloaded.saveLearningProgress(query,{positionSeconds:3,durationSeconds:60})
  assert.equal(replay.percent,100);assert.equal(replay.completed,true)
  assert.equal((await reloaded.getLearningLevelDetail(rows[2].id,query.levelId)).chapters[1].progress,null)
})

test('article completion is explicit; progress rejects parents, locked children, invalid chapters and invalid numbers', async () => {
  const {learning:api}=await setup(),rows=await api.getLearningIdentities()
  const query={contextId:rows[1].id,levelId:'level-1',chapterId:'level-1-article'}
  assert.equal((await api.getLearningLevelDetail(query.contextId,query.levelId)).chapters[0].progress,null)
  assert.equal((await api.saveLearningProgress(query,{completed:true})).percent,100)
  await assert.rejects(api.saveLearningProgress({...query,contextId:rows[0].id},{completed:true}),/无权/)
  await assert.rejects(api.saveLearningProgress({...query,contextId:rows[2].id},{completed:true}),/无权/)
  await assert.rejects(api.saveLearningProgress({...query,chapterId:'forged'},{completed:true}),/无权/)
  await assert.rejects(api.saveLearningProgress(query,{positionSeconds:NaN}),/无效/)
  await assert.rejects(api.saveLearningProgress(query,{durationSeconds:-1}),/无效/)
})

test('same-account token replacement invalidates a late progress write', async () => {
  let finish
  const {learning:api,session}=await setup(false,()=>new Promise(resolve=>{finish=resolve}))
  const attempt=api.saveLearningProgress({contextId:'child:account-A:1',levelId:'level-1',chapterId:'video'},{positionSeconds:1,durationSeconds:60})
  session.token='new-login'
  finish({contexts:[{id:'child:account-A:1',accountId:'account-A',memberId:'m1',mode:'child'}]})
  await assert.rejects(attempt,/账号已变化/)
})

test('a membership activation unlocks every level in that tier permanently, without granting another tier or sibling', async () => {
  const {learning:api}=await setup(),rows=await api.getLearningIdentities(),child=rows[2]
  const preview=await api.previewLevelActivation(child.id,'DEMO-T2','level-4')
  assert.equal(preview.membershipTier,2)
  const result=await api.activateLearningLevel(child.id,{code:'DEMO-T2',levelId:'level-4',idempotencyKey:'tier-2'})
  assert.equal(result.expiresAt,null)
  const levels=await api.getLearningLevels(child)
  assert.ok(levels.filter(level=>level.tier===2).every(level=>level.unlocked))
  assert.ok(levels.filter(level=>level.tier!==2).every(level=>!level.unlocked))
  await assert.rejects(api.previewLevelActivation(child.id,'DEMO-L3','level-3'),/已解锁/)
})

test('announcement read receipts are idempotent and scoped to the login account', async () => {
  const {learning:api,session,storage}=await setup()
  await api.markAnnouncementRead('notice-learning');await api.markAnnouncementRead('notice-learning')
  assert.equal((await api.getAnnouncements()).items.find(x=>x.id==='notice-learning').read,true)
  assert.equal(Object.keys(storage.get('naoshang-announcement-reads:account-A')).length,1)
  session.user.id='account-B'
  assert.equal((await api.getAnnouncements()).items.find(x=>x.id==='notice-learning').read,false)
})

test('remote tier authorization works without the obsolete per-level unlocked field',async()=>{
 const remote=async url=>url==='/me/bootstrap'?{contexts:[{id:'child:account-A:1',accountId:'account-A',memberId:'member-1',mode:'child'}]}:{id:'level-2',membershipUnlocked:true,membershipTierId:'tier-2',chapters:[{id:'chapter',accessible:true}],content:null}
 const {learning:api}=await setup(false,remote)
 const detail=await api.getLearningLevelDetail('child:account-A:1','level-2')
 assert.equal(detail.unlocked,true);assert.equal(detail.chapters[0].accessible,true)
})
