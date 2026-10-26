const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm')
async function setup(storage=new Map(),remote=null){
 const session={token:'local',user:{id:'A',name:'测试合伙人',inviteCode:'INVITE-A'}},context=vm.createContext({console,uni:{getStorageSync:k=>storage.get(k),setStorageSync:(k,v)=>storage.set(k,JSON.parse(JSON.stringify(v))),removeStorageSync:k=>storage.delete(k)}}),cache=new Map()
 async function load(file){if(cache.has(file))return cache.get(file);let m;if(file.endsWith('/config'))m=new vm.SyntheticModule(['config'],function(){this.setExport('config',{useMock:!remote,previewAllBusinessFeatures:true})},{context});else if(file.endsWith('/api'))m=new vm.SyntheticModule(['getSession','request'],function(){this.setExport('getSession',()=>session);this.setExport('request',remote || (()=>{throw new Error('Unexpected network')}))},{context});else m=new vm.SourceTextModule(fs.readFileSync(file+'.js','utf8'),{context,identifier:file});cache.set(file,m);await m.link((s,p)=>load(path.resolve(path.dirname(p.identifier),s).replaceAll('\\','/')));return m}
 const root=path.resolve(__dirname,'../src/services').replaceAll('\\','/');async function get(name){const m=await load(root+'/'+name);if(m.status!=='evaluated')await m.evaluate();return m.namespace}
 return {business:await get('business'),operations:await get('business-operations'),commerce:await get('commerce'),storage,session}
}
test('designed wholesale reports preserve empty benefits and separate purchase, transfer and experience filters',async()=>{
 const {business,operations}=await setup(),ctx=(await business.getBusinessContexts())[0],overview=await business.getBusinessOverview('wholesale',ctx.id)
 assert.ok(overview.benefits.every(x=>!x.content.nodes.length));assert.equal(overview.annualRemainingDays,99)
 const team=await business.getBusinessReport('wholesale','team',ctx.id),plans=(await operations.getBusinessOperationOptions('upgrade',ctx.id)).members
 assert.equal(team.items[0].levelLabel,'普通用户');assert.equal(team.items.length,4);assert.equal(plans[0].upgradePlans.find(x=>x.value==='DEMO-ANGEL').requiredQuota,3)
 assert.equal(plans[1].upgradePlans.find(x=>x.value==='DEMO-ANGEL').requiredQuota,3);assert.equal(plans[1].upgradePlans[0].disabled,false)
 assert.equal(plans[2].levelLabel,'天使合伙人');assert.equal(plans[2].upgradePlans.find(x=>x.value==='DEMO-ANGEL').disabled,true);assert.equal(plans[2].upgradePlans[0].disabled,true)
 assert.equal(plans[3].levelLabel,'VIP合伙人');assert.equal(plans[3].upgradePlans[0].disabled,true);assert.equal(plans[3].upgradePlans.find(x=>x.value==='DEMO-ANGEL').requiredQuota,2);assert.equal(plans[3].upgradePlans.find(x=>x.value==='DEMO-ANGEL').listPrice,2980000);assert.equal(plans[3].upgradePlans.find(x=>x.value==='DEMO-ANGEL').paidAmount,998000)
 assert.equal(plans[3].upgradePlans.find(x=>x.value==='DEMO-FOUNDER').requiredQuota,23)
 assert.equal(plans[2].upgradePlans.find(x=>x.value==='DEMO-FOUNDER').requiredQuota,21)
 assert.equal((await operations.getBusinessOperationOptions('upgrade',ctx.id)).upgradePlans.find(x=>x.value==='DEMO-FOUNDER').requiredQuota,24)
 const batch=(await business.getBusinessReport('wholesale','quota-batches',ctx.id)).items[0];assert.equal(batch.expiresAt,null);assert.equal(batch.validityLabel,'永久有效');assert.equal(batch.transferable,false)
 const q=await operations.previewBusinessOperation('quota-transfer',ctx.id,{targetAccountId:team.items[0].id,quantity:'2'});await operations.commitBusinessOperation('quota-transfer',ctx.id,q.id,'transfer')
 const ledger=await business.getBusinessReport('wholesale','quota-ledger',ctx.id);assert.ok(ledger.items.every(item=>item.quantity>0));assert.equal(ledger.items.some(item=>item.title==='划拨名额'),false)
 assert.equal((await business.getBusinessReport('wholesale','quota-transfers',ctx.id)).items[0].quantity,-2)
 const promotion=await business.getBusinessReport('wholesale','experience',ctx.id,{filter:'promotion'}),products=await business.getBusinessReport('wholesale','experience',ctx.id,{filter:'products'})
 assert.equal(promotion.items[0].initialLevel,'普通用户');assert.ok(products.items.every(x=>x.id.startsWith('experience-product')))
})

test('promotion denominators use three same-rank referrals while progress remains supplied by API',async()=>{
 for(const [beforeName,target] of [['VIP合伙人',3],['天使合伙人',9],['私董合伙人',18]]){
  const ctx={id:'wholesale:A',module:'wholesale',accountId:'A',capabilities:['wholesale:promotion']}
  const {business}=await setup(new Map(),async url=>url==='/me/bootstrap'?{businessContexts:[ctx]}:{items:[],hasMore:false,nextCursor:null,promotion:{beforeName,progress:7,canClaim:false,target:999}})
  const report=await business.getBusinessReport('wholesale','promotion',ctx.id)
  assert.equal(report.promotion.target,target);assert.equal(report.promotion.progress,7);assert.equal(report.promotion.canClaim,false)
 }
})
test('users cannot bind or change their superior from business pages',async()=>{
 const {business,storage}=await setup(),ctx=(await business.getBusinessContexts())[0]
 await assert.rejects(business.bindBusinessSuperior(ctx.id,'INVITE-A'),/仅总部/)
 await assert.rejects(business.bindBusinessSuperior(ctx.id,'CODE-OWNER'),/仅总部/)
 const reloaded=await setup(storage);assert.equal((await reloaded.business.getBusinessReport('wholesale','superior',ctx.id)).superior?.levelLabel,'私董合伙人');assert.equal(storage.size,0)
})
test('withdrawal payee is tokenized and bank card storage is masked; account types cannot be crossed',async()=>{
 const {business,operations,storage}=await setup(),ctx=(await business.getBusinessContexts())[0],number='6222000000001234567'
 await assert.rejects(operations.registerBusinessPayee(ctx.id,{accountType:'PERSONAL',name:'测试',bankName:'测试银行',bankNumber:'bad'}),/银行卡/)
 const {payeeToken}=await operations.registerBusinessPayee(ctx.id,{accountType:'PERSONAL',name:'测试',bankName:'测试银行',bankNumber:number})
 await assert.rejects(operations.previewBusinessOperation('withdraw',ctx.id,{accountType:'COMPANY',payeeToken,amount:'10'}),/不匹配/)
 const quote=await operations.previewBusinessOperation('withdraw',ctx.id,{accountType:'PERSONAL',payeeToken,amount:'10'});await operations.commitBusinessOperation('withdraw',ctx.id,quote.id,'withdraw')
 const record=(await business.getBusinessWithdrawals(ctx.id)).items[0];assert.equal(record.bankName,'测试银行');assert.ok(record.maskedBankNumber.endsWith('4567'));assert.equal(record.status,'PENDING_REVIEW')
 assert.equal(JSON.stringify([...storage]).includes(number),false)
})
test('activity upgrade reserves quota until payment and cancellation releases it exactly once',async()=>{
 const {business,operations,commerce}=await setup(),ctx=(await business.getBusinessContexts())[0],draft={targetAccountId:'demo-person-1',targetLevel:'DEMO-ANGEL',standardQuantity:1,activityQuantity:2}
 const q=await operations.previewBusinessOperation('upgrade',ctx.id,draft),r=await operations.commitBusinessOperation('upgrade',ctx.id,q.id,'upgrade')
 assert.equal(r.status,'PENDING_PAYMENT');assert.equal((await business.getBusinessReport('wholesale','team',ctx.id)).items[0].levelLabel,'普通用户')
 assert.equal((await operations.getBusinessOperationOptions('upgrade',ctx.id)).activityRemaining,2)
 const batch=(await business.getBusinessReport('wholesale','quota-batches',ctx.id)).items[0];assert.equal(batch.remaining,2);assert.equal(batch.reserved,2);assert.equal(batch.used,0);assert.equal((await business.getBusinessReport('wholesale','quota-ledger',ctx.id)).activityRemaining,2)
 const order=(await commerce.getCommerceOrder(r.orderId)).order;await commerce.changeOrder(order.id,'cancel',order.version,'cancel');await commerce.changeOrder(order.id,'cancel',order.version,'cancel')
 assert.equal((await business.getBusinessOverview('wholesale',ctx.id)).quota,20);assert.equal((await operations.getBusinessOperationOptions('upgrade',ctx.id)).activityRemaining,4)
 const restored=(await business.getBusinessReport('wholesale','quota-batches',ctx.id)).items[0];assert.equal(restored.remaining,4);assert.equal(restored.reserved,0);assert.equal(restored.used,0);assert.equal(restored.grantedAt,batch.grantedAt)
})
test('paid upgrade grants the target once and cannot be downgraded or repeated with pending payment',async()=>{
 const {business,operations,commerce}=await setup(),ctx=(await business.getBusinessContexts())[0],draft={targetAccountId:'demo-person-1',targetLevel:'DEMO-ANGEL',standardQuantity:1,activityQuantity:2}
 const q=await operations.previewBusinessOperation('upgrade',ctx.id,draft),r=await operations.commitBusinessOperation('upgrade',ctx.id,q.id,'upgrade')
 const other=await operations.previewBusinessOperation('upgrade',ctx.id,{...draft,standardQuantity:3,activityQuantity:0});await assert.rejects(operations.commitBusinessOperation('upgrade',ctx.id,other.id,'other'),/待支付/)
 const attempt=await commerce.startPayment(r.orderId,'wechat','pay');await commerce.queryPayment(attempt.id);await commerce.queryPayment(attempt.id)
 assert.equal((await business.getBusinessReport('wholesale','team',ctx.id)).items[0].levelLabel,'天使合伙人');assert.equal((await business.getBusinessOverview('wholesale',ctx.id)).quota,19)
 const paidBatch=(await business.getBusinessReport('wholesale','quota-batches',ctx.id)).items[0];assert.equal(paidBatch.used,2);assert.equal(paidBatch.reserved,0);assert.equal(paidBatch.remaining,2)
 await assert.rejects(operations.previewBusinessOperation('upgrade',ctx.id,{...draft,targetLevel:'DEMO-VIP'}),/请选择目标等级/)
})

test('unknown operation responses retain quote and key through reload, blocking new intents until original retry succeeds',async()=>{
 const ctx={id:'wholesale:A',module:'wholesale',accountId:'A',capabilities:['wholesale:quota-transfer']},calls=[];let answer='timeout'
 const remote=async(url,options)=>{if(url==='/me/bootstrap')return {businessContexts:[ctx]};calls.push(options.data);if(answer==='timeout')throw new Error('timeout');return {operationId:'done',status:'APPLIED'}}
 const first=await setup(new Map(),remote),quote={id:'original-quote',details:[],expiresAt:1,serverTime:0}
 first.operations.rememberBusinessOperationIntent('quota-transfer',ctx.id,quote,'original-key',{quantity:'2',targetAccountId:'person'})
 await assert.rejects(first.operations.commitBusinessOperation('quota-transfer',ctx.id,quote.id,'original-key'),/timeout/)
 assert.equal(first.operations.getBusinessOperationIntent('quota-transfer',ctx.id).dispatched,true)
 const reloaded=await setup(first.storage,remote),restored=reloaded.operations.getBusinessOperationIntent('quota-transfer',ctx.id)
 assert.equal(restored.quote.id,'original-quote');assert.equal(restored.idempotencyKey,'original-key');assert.equal(restored.draft.quantity,'2')
 await assert.rejects(reloaded.operations.commitBusinessOperation('quota-transfer',ctx.id,'new-quote','new-key'),/上一笔/);assert.equal(calls.length,1)
 answer='success';await reloaded.operations.commitBusinessOperation('quota-transfer',ctx.id,restored.quoteId,restored.idempotencyKey)
 assert.equal(calls[1].idempotencyKey,'original-key');assert.equal(reloaded.operations.getBusinessOperationIntent('quota-transfer',ctx.id),null)
})
test('definitive quote rejection unlocks the form while malformed successes stay uncertain',async()=>{
 const ctx={id:'wholesale:A',module:'wholesale',accountId:'A',capabilities:['wallet:withdraw']};let malformed=false
 const remote=async url=>{if(url==='/me/bootstrap')return {businessContexts:[ctx]};if(malformed)return {};throw Object.assign(new Error('expired'),{statusCode:409,code:'QUOTE_EXPIRED'})}
 const {operations}=await setup(new Map(),remote)
 await assert.rejects(operations.commitBusinessOperation('withdraw',ctx.id,'expired','one'),/expired/);assert.equal(operations.getBusinessOperationIntent('withdraw',ctx.id),null)
 malformed=true;await assert.rejects(operations.commitBusinessOperation('withdraw',ctx.id,'unknown','two'),/待确认/);assert.equal(operations.getBusinessOperationIntent('withdraw',ctx.id).idempotencyKey,'two')
})
test('accepted responses without a usable order or receipt remain locked to the original intent',async()=>{
 const ctx={id:'wholesale:A',module:'wholesale',accountId:'A',capabilities:['wallet:withdraw']}
 for(const response of [{status:'PENDING_PAYMENT'},{status:'PENDING_PAYMENT',orderId:''},{status:'PENDING_REVIEW'},{status:'APPLIED',operationId:' '}]){
  const remote=async url=>url==='/me/bootstrap'?{businessContexts:[ctx]}:response,{operations}=await setup(new Map(),remote)
  await assert.rejects(operations.commitBusinessOperation('withdraw',ctx.id,'quote','key'),/回执不完整/)
  assert.equal(operations.getBusinessOperationIntent('withdraw',ctx.id).idempotencyKey,'key')
 }
})
