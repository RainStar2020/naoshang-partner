const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm')
async function setup({useMock=true,preview=true,remote=()=>{throw new Error('Unexpected network')}}={}){
  let now=Date.now();const session={token:'demo-token',user:{id:'A',name:'演示测试用户'}},storage=new Map(),context=vm.createContext({console,Date:class extends Date{static now(){return now}},uni:{removeStorageSync:k=>storage.delete(k),getStorageSync:key=>storage.get(key),setStorageSync:(key,value)=>storage.set(key,value)}}),cache=new Map()
  async function load(file){if(cache.has(file))return cache.get(file);let module
    if(file.endsWith('/config'))module=new vm.SyntheticModule(['config'],function(){this.setExport('config',{useMock,previewAllBusinessFeatures:preview})},{context})
    else if(file.endsWith('/api'))module=new vm.SyntheticModule(['getSession','request'],function(){this.setExport('getSession',()=>session);this.setExport('request',remote)},{context})
    else module=new vm.SourceTextModule(fs.readFileSync(file+'.js','utf8'),{context,identifier:file})
    cache.set(file,module);await module.link((specifier,parent)=>load(path.resolve(path.dirname(parent.identifier),specifier).replaceAll('\\','/')));return module
  }
  const root=path.resolve(__dirname,'../src').replaceAll('\\','/')
  async function get(relative){const module=await load(root+'/'+relative);if(module.status!=='evaluated')await module.evaluate();return module.namespace}
  return {service:await get('services/business'),operations:await get('services/business-operations'),store:await get('services/business-store'),catalog:await get('features/business/catalog'),session,advance:ms=>{now+=ms}}
}
test('maximum preview exposes all three modules only in explicit Mock mode, preserving blank CMS benefits',async()=>{
  const {service,catalog}=await setup(),contexts=await service.getBusinessContexts()
  assert.equal(contexts.length,12);assert.equal(new Set(contexts.map(x=>x.module)).size,3)
  for(const context of contexts){const result=await service.getBusinessOverview(context.module,context.id);assert.ok(result.tools.length);assert.ok(result.benefits.every(item=>item.content.nodes.length===0))}
  assert.equal(catalog.visibleBusinessTools(contexts[0],{useMock:false,previewAllBusinessFeatures:true}).length,0)
  const restricted=await setup({preview:false}),ctx=(await restricted.service.getBusinessContexts())[0]
  await assert.rejects(restricted.service.getBusinessReport('wholesale','income',ctx.id),/权限/)
})
test('contexts are account-owned and contract wallets stay isolated across stores',async()=>{
  const {service,operations,session}=await setup(),contexts=await service.getBusinessContexts(),first=contexts.find(x=>x.module==='costore'),second=contexts.filter(x=>x.module==='costore')[1]
  const quote=await operations.previewBusinessOperation('withdraw',first.id,{accountType:'PERSONAL',payeeToken:'demo-personal',amount:'100.00'})
  const result=await operations.commitBusinessOperation('withdraw',first.id,quote.id,'withdraw-once');assert.equal(result.status,'PENDING_REVIEW')
  await operations.commitBusinessOperation('withdraw',first.id,quote.id,'withdraw-once')
  assert.equal((await service.getBusinessOverview('costore',first.id)).available,190000)
  assert.equal((await service.getBusinessOverview('costore',second.id)).available,200000)
  assert.equal((await service.getBusinessWithdrawals(first.id)).items.length,4)
  assert.equal((await service.getBusinessWithdrawals(second.id)).items.length,3)
  session.user.id='B';await assert.rejects(service.getBusinessContext(null,first.id),/无权/)
})
test('quota transfers are integer, scoped, versioned and idempotent; unpaid purchases do not mint quota',async()=>{
  const {service,operations}=await setup(),context=(await service.getBusinessContexts())[0]
  await assert.rejects(operations.previewBusinessOperation('quota-transfer',context.id,{targetAccountId:'demo-person-1',quantity:'1.5'}),/整数/)
  await assert.rejects(operations.previewBusinessOperation('quota-transfer',context.id,{targetAccountId:'forged',quantity:'1'}),/授权/)
  const quote=await operations.previewBusinessOperation('quota-transfer',context.id,{targetAccountId:'demo-person-1',quantity:'2'})
  const stale=await operations.previewBusinessOperation('quota-transfer',context.id,{targetAccountId:'demo-person-2',quantity:'3'})
  await operations.commitBusinessOperation('quota-transfer',context.id,quote.id,'transfer-once');await operations.commitBusinessOperation('quota-transfer',context.id,quote.id,'transfer-once')
  assert.equal((await service.getBusinessOverview('wholesale',context.id)).quota,18)
  await assert.rejects(operations.commitBusinessOperation('quota-transfer',context.id,stale.id,'stale'),/版本已变化/)
  const purchase=await operations.previewBusinessOperation('quota-purchase',context.id,{quantity:'5'})
  assert.equal((await operations.commitBusinessOperation('quota-purchase',context.id,purchase.id,'purchase')).status,'PENDING_PAYMENT')
  assert.equal((await service.getBusinessOverview('wholesale',context.id)).quota,18)
  assert.equal((await service.getBusinessReport('wholesale','quota-transfers',context.id)).items.length,1)
})
test('expired quotes and mismatched personal/company recipients cannot reserve funds',async()=>{
  const {service,operations,advance}=await setup(),context=(await service.getBusinessContexts()).find(x=>x.module==='costore')
  assert.equal(operations.parseAmount('10.10'),1010);assert.throws(()=>operations.parseAmount('1.001'),/两位/)
  await assert.rejects(operations.previewBusinessOperation('withdraw',context.id,{accountType:'COMPANY',payeeToken:'demo-personal',amount:'100'}),/不匹配/)
  const quote=await operations.previewBusinessOperation('withdraw',context.id,{accountType:'COMPANY',payeeToken:'demo-company',amount:'100'})
  advance(300001);await assert.rejects(operations.commitBusinessOperation('withdraw',context.id,quote.id,'expired'),/失效/)
  assert.equal((await service.getBusinessOverview('costore',context.id)).available,200000)
})
test('inspection/sales assignment confirms the actual recipient but does not credit unsettled income',async()=>{
  const {service,operations}=await setup(),context=(await service.getBusinessContexts()).find(x=>x.agencyType==='COUNTY')
  const report=await service.getBusinessReport('agency','income',context.id,{filter:'pending'});assert.equal(report.items.length,1)
  const entry=report.items[0];assert.equal(entry.allocationKind,'inspection')
  await assert.rejects(operations.previewBusinessOperation('allocation',context.id,{targetId:'outsider'},entry.id),/授权/)
  const quote=await operations.previewBusinessOperation('allocation',context.id,{targetId:'superior'},entry.id)
  assert.ok(quote.details.some(item=>item.label==='最终受益人'&&item.value==='授权上级'))
  assert.equal((await operations.commitBusinessOperation('allocation',context.id,quote.id,'allocate',entry.id)).status,'PENDING_SETTLEMENT')
  assert.equal((await service.getBusinessReport('agency','income',context.id,{filter:'pending'})).items.length,0)
  assert.equal((await service.getBusinessOverview('agency',context.id)).available,200000)
  await assert.rejects(operations.commitBusinessOperation('allocation',context.id,quote.id,'allocate','another-entry'),/不一致/)
})
test('agency node traversal cannot invent a parent or read across another account scope',async()=>{
  const {service}=await setup(),context=(await service.getBusinessContexts()).find(x=>x.agencyType==='PROVINCE')
  let rows=await service.getBusinessReport('agency','team',context.id)
  assert.equal(rows.items.map(item=>item.id).join(','),'node-city-1,node-city-2')
  rows=await service.getBusinessReport('agency','team',context.id,{parentNodeId:'node-city-1'})
  assert.equal(rows.items.length,3);assert.ok(rows.items.every(item=>item.levelLabel==='区县代理'))
  rows=await service.getBusinessReport('agency','team',context.id,{parentNodeId:'node-county-1-1'})
  assert.equal(rows.items.length,2);assert.ok(rows.items.every(item=>item.levelLabel==='单店代理'))
  rows=await service.getBusinessReport('agency','team',context.id,{parentNodeId:'node-store-1-1'})
  assert.equal(rows.items.length,3)
  await assert.rejects(service.getBusinessTeamNode(context.id,'forged-node'),/无权/)
  await assert.rejects(service.getBusinessReport('agency','team',context.id,{parentNodeId:'forged-node'}),/无权/)
})
test('store staff save never exposes credentials; rejection requires a reason and approval does not move ownership',async()=>{
  const {service,store}=await setup(),context=(await service.getBusinessContexts()).find(x=>x.agencyType==='STORE'),workspace=await store.getBusinessStore(context.id)
  assert.equal(context.store.name,'脑商训练营桐柏路店');assert.equal(context.store.number,'NO.001')
  assert.equal(workspace.owners.length,2);assert.equal(workspace.owners[0].feeAmount,418800);assert.equal(workspace.owners[0].daysRemaining,68)
  assert.equal(workspace.staff.length,4);assert.equal(workspace.staff.every(item=>!Object.keys(item).some(key=>/password/i.test(key))),true)
  const payload={name:'演示新增健脑官',loginAccount:'coach-test',password:'Coach-test-123'}
  const a=await store.saveBusinessCoach(context.id,workspace.store.id,'',payload,'coach-add'),b=await store.saveBusinessCoach(context.id,workspace.store.id,'',payload,'coach-add')
  assert.equal(a.coach.id,b.coach.id);assert.equal(a.coach.invitationStatus,'ACTIVE');assert.equal(a.coach.credentialSet,true);assert.equal(Object.keys(a.coach).some(key=>/password/i.test(key)),false)
  await assert.rejects(store.saveBusinessCoach(context.id,'other-store','',payload,'other'),/无权/)
  const application=workspace.approvals.find(item=>item.type==='TRANSFER' && item.status==='PENDING')
  await assert.rejects(store.decideBusinessApplication(context.id,workspace.store.id,application.id,{decision:'REJECT',reason:'',version:application.version,idempotencyKey:'reject'}),/原因/)
  const result=await store.decideBusinessApplication(context.id,workspace.store.id,application.id,{decision:'APPROVE',version:application.version,idempotencyKey:'approve'})
  assert.equal(result.status,'PENDING');assert.match(result.nextStep,/双方同意/)
})
test('real errors, malformed lists and late responses cannot become full-permission mock success',async()=>{
  const context={id:'real-context',module:'wholesale',accountId:'A',capabilities:['wholesale:income']}
  const failed=await setup({useMock:false,remote:async()=>{throw new Error('offline')}})
  await assert.rejects(failed.service.getBusinessContexts(),/offline/)
  const malformed=await setup({useMock:false,remote:async url=>url==='/me/bootstrap'?{businessContexts:[context]}:{items:[],hasMore:true,nextCursor:null}})
  await assert.rejects(malformed.service.getBusinessReport('wholesale','income',context.id),/格式异常/)
  let finish;const pending=new Promise(resolve=>{finish=resolve})
  const late=await setup({useMock:false,remote:async url=>url==='/me/bootstrap'?{businessContexts:[context]}:pending})
  const result=late.service.getBusinessReport('wholesale','income',context.id);await new Promise(resolve=>setImmediate(resolve));late.session.token='new-session';finish({items:[],hasMore:false,nextCursor:null})
  await assert.rejects(result,/账号已变化/)
})
test('remote withdrawal quotes use integer cents, while the preview flag cannot bypass missing capabilities',async()=>{
  const calls=[],context={id:'real-wallet-scope',module:'wholesale',accountId:'A',capabilities:['wallet:withdraw']}
  const {operations,service}=await setup({useMock:false,remote:async(url,options)=>{if(url==='/me/bootstrap')return {businessContexts:[context]};calls.push({url,options});return {id:'real-quote',details:[],expiresAt:Date.now()+10000,serverTime:Date.now()}}})
  await operations.previewBusinessOperation('withdraw',context.id,{amount:'10.10',accountType:'PERSONAL',payeeToken:'saved-payee'})
  assert.equal(calls[0].options.data.amount,1010)
  await assert.rejects(service.getBusinessReport('wholesale','income',context.id),/权限/)
})
