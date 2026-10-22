const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm')
async function setup({useMock=true,preview=true,remote=()=>{throw new Error('Unexpected network')}}={}){
  const session={token:'demo',user:{id:'A',name:'测试家长'}},storage=new Map(),context=vm.createContext({console,uni:{getStorageSync:key=>storage.get(key),setStorageSync:(key,value)=>storage.set(key,value)}}),cache=new Map()
  async function load(file){if(cache.has(file))return cache.get(file);let module
    if(file.endsWith('/config'))module=new vm.SyntheticModule(['config'],function(){this.setExport('config',{useMock,previewAllExclusiveFeatures:preview})},{context})
    else if(file.endsWith('/api'))module=new vm.SyntheticModule(['getSession','request'],function(){this.setExport('getSession',()=>session);this.setExport('request',remote)},{context})
    else module=new vm.SourceTextModule(fs.readFileSync(file+'.js','utf8'),{context,identifier:file})
    cache.set(file,module);return module
  }
  const root=path.resolve(__dirname,'../src').replaceAll('\\','/')
  async function get(relative){const module=await load(root+'/'+relative);if(module.status==='unlinked')await module.link((specifier,parent)=>load(path.resolve(path.dirname(parent.identifier),specifier).replaceAll('\\','/')));if(module.status!=='evaluated')await module.evaluate();return module.namespace}
  return {exclusive:await get('services/exclusive'),members:await get('services/members'),learning:await get('services/learning'),catalog:await get('features/exclusive/catalog'),format:await get('features/exclusive/format'),session}
}
test('all exclusive entries appear only in explicit mock preview; real contexts use capabilities, never role labels',async()=>{
  const {exclusive,catalog}=await setup();assert.equal(exclusive.getVisibleExclusiveEntries(await exclusive.getExclusiveAccess()).length,5)
  assert.equal(catalog.visibleExclusiveFeatures({capabilities:[],role:'省代'},{useMock:false,previewAllExclusiveFeatures:true}).length,0)
  const rows=catalog.visibleExclusiveFeatures({capabilities:['family-members:manage']},{useMock:false,previewAllExclusiveFeatures:true})
  assert.equal(rows.length,1);assert.equal(rows[0].id,'members')
  const restricted=await setup({preview:false});await assert.rejects(restricted.members.getFamilyMembers(),/不能使用/)
})
test('costore quote validates options, keeps CMS blank, and submission is idempotent without granting payment or entitlement',async()=>{
  const {exclusive}=await setup();const options=await exclusive.getCostoreOptions()
  assert.equal(options.benefits.nodes.length,0);assert.equal(options.agreement.content.nodes.length,0)
  await assert.rejects(exclusive.quoteCostore('invented',options.durations[0].id),/有效门店/)
  const quote=await exclusive.quoteCostore(options.stores[0].id,options.durations[0].id)
  const payload={quoteId:quote.id,idempotencyKey:'same'};const a=await exclusive.submitCostoreApplication(payload),b=await exclusive.submitCostoreApplication(payload)
  assert.equal(a.application.id,b.application.id);assert.equal(a.application.applicationStatus,'PENDING_REVIEW');assert.equal(a.application.paymentStatus,'NOT_STARTED');assert.equal(a.application.entitlementStatus,'NOT_OPEN')
  assert.equal((await exclusive.getMyApplications()).items.length,1)
  const other=await exclusive.quoteCostore(options.stores[1].id,options.durations[0].id)
  await assert.rejects(exclusive.submitCostoreApplication({...payload,quoteId:other.id}),/不一致/)
})
test('family add/edit uses dictionaries, versions and account scope, and shares learning identities',async()=>{
  const {members,learning,session}=await setup()
  const result=await members.saveFamilyMember('',{idempotencyKey:'add-member',name:'测试新增',gradeCode:'JUNIOR_1',genderCode:'UNDISCLOSED'})
  assert.equal((await learning.getLearningIdentities()).find(x=>x.memberId===result.member.id).name,'测试新增')
  await assert.rejects(members.saveFamilyMember('',{idempotencyKey:'bad-grade',name:'测试',gradeCode:'INVALID',genderCode:'MALE'}),/选项/)
  const updated=await members.saveFamilyMember(result.member.id,{name:'测试修改',gradeCode:'PRIMARY_1',genderCode:'FEMALE',version:result.member.version})
  assert.equal((await learning.getLearningIdentities()).find(x=>x.memberId===result.member.id).name,'测试修改')
  await assert.rejects(members.saveFamilyMember(result.member.id,{name:'旧版本',gradeCode:'PRIMARY_1',genderCode:'FEMALE',version:result.member.version}),/已更新/)
  session.user.id='B';await assert.rejects(members.getMemberRecords(updated.member.id,'orders'),/无权/)
})
test('activation targets the selected member, rejects bad preview, and synchronizes learning entitlements',async()=>{
  const {members,learning}=await setup();const rows=(await members.getFamilyMembers()).items,target=rows[1]
  const preview=await members.previewMemberActivation(target.id,'DEMO-L2')
  await assert.rejects(members.activateFamilyMember(rows[0].id,preview,'attempt'),/预览已失效/)
  await members.activateFamilyMember(target.id,preview,'attempt');await members.activateFamilyMember(target.id,preview,'attempt')
  const context=(await learning.getLearningIdentities()).find(x=>x.memberId===target.id)
  assert.equal((await learning.getLearningLevels(context)).find(x=>x.id==='level-2').unlocked,true)
  await assert.rejects(members.previewMemberActivation(target.id,'DEMO-L2'),/已解锁/)
})
test('promotion types never substitute registration invitations or static QR images for absent payloads',async()=>{
  const {exclusive}=await setup()
  for(const type of exclusive.agencyTypes){const result=await exclusive.getAgencyPromotion(type.id);assert.ok(result.promotionId.startsWith('local-'));assert.ok(result.localPayload.includes('/pages/application/agency')); assert.equal(result.qrUrl,'');assert.equal(result.shareUrl,'')}
  assert.throws(()=>exclusive.getAgencyPromotion('INVALID'),/类型/)
})
test('signed money and missing report values remain distinct; real failures never fall back to mock',async()=>{
  const {format}=await setup();assert.equal(format.money(-123),'-1.23');assert.equal(format.money(null),'—');assert.equal(format.money(0),'0.00');assert.equal(format.percent(10),'0.1%')
  const {exclusive}=await setup({useMock:false,remote:async()=>{throw new Error('offline')}})
  await assert.rejects(exclusive.getFounderAwards('2026-10'),/offline/)
  const noCapability=await setup({useMock:false,remote:async()=>({exclusiveAccess:{accountId:'A',contextId:'account:A',capabilities:[]}})})
  await assert.rejects(noCapability.exclusive.getFounderAwards('2026-10'),/不能使用/)
})
test('late account-scoped reports are rejected after a switch; cross-account promotion output is rejected',async()=>{
  let finish;const pending=new Promise(resolve=>{finish=resolve})
  const {exclusive,session}=await setup({useMock:false,remote:async url=>url==='/me'?{exclusiveAccess:{accountId:'A',contextId:'partner:A',capabilities:['founder-awards:read']}}:pending})
  const result=exclusive.getFounderAwards('2026-10');await new Promise(resolve=>setImmediate(resolve));session.user.id='B';finish({items:[],hasMore:false,nextCursor:null})
  await assert.rejects(result,/账号已变化/)
  const forged=await setup({useMock:false,remote:async url=>url==='/me'?{exclusiveAccess:{accountId:'A',contextId:'partner:A',capabilities:['agency-code:read']}}:{accountId:'B',agencyType:'STORE',promotionId:'bad',qrUrl:'https://example.com/qr.png'}})
  await assert.rejects(forged.exclusive.getAgencyPromotion('STORE'),/身份不匹配/)
})
