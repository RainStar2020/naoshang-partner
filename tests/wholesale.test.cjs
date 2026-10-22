const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm')
async function setup(storage=new Map()){
 const session={token:'local',user:{id:'A',name:'测试合伙人',inviteCode:'INVITE-A'}},context=vm.createContext({console,uni:{getStorageSync:k=>storage.get(k),setStorageSync:(k,v)=>storage.set(k,JSON.parse(JSON.stringify(v))),removeStorageSync:k=>storage.delete(k)}}),cache=new Map()
 async function load(file){if(cache.has(file))return cache.get(file);let m;if(file.endsWith('/config'))m=new vm.SyntheticModule(['config'],function(){this.setExport('config',{useMock:true,previewAllBusinessFeatures:true})},{context});else if(file.endsWith('/api'))m=new vm.SyntheticModule(['getSession','request'],function(){this.setExport('getSession',()=>session);this.setExport('request',()=>{throw new Error('Unexpected network')})},{context});else m=new vm.SourceTextModule(fs.readFileSync(file+'.js','utf8'),{context,identifier:file});cache.set(file,m);await m.link((s,p)=>load(path.resolve(path.dirname(p.identifier),s).replaceAll('\\','/')));return m}
 const root=path.resolve(__dirname,'../src/services').replaceAll('\\','/');async function get(name){const m=await load(root+'/'+name);if(m.status!=='evaluated')await m.evaluate();return m.namespace}
 return {business:await get('business'),operations:await get('business-operations'),commerce:await get('commerce'),storage,session}
}
test('designed wholesale reports preserve empty benefits and separate purchase, transfer and experience filters',async()=>{
 const {business,operations}=await setup(),ctx=(await business.getBusinessContexts())[0],overview=await business.getBusinessOverview('wholesale',ctx.id)
 assert.ok(overview.benefits.every(x=>!x.content.nodes.length));assert.equal(overview.annualRemainingDays,99)
 const team=await business.getBusinessReport('wholesale','team',ctx.id),plans=(await operations.getBusinessOperationOptions('upgrade',ctx.id)).members
 assert.equal(team.items[0].levelLabel,'普通用户');assert.equal(plans[0].upgradePlans.find(x=>x.value==='DEMO-ANGEL').requiredQuota,3)
 assert.equal(plans[1].upgradePlans.find(x=>x.value==='DEMO-ANGEL').requiredQuota,2);assert.equal(plans[1].upgradePlans[0].disabled,true)
 const q=await operations.previewBusinessOperation('quota-transfer',ctx.id,{targetAccountId:team.items[0].id,quantity:'2'});await operations.commitBusinessOperation('quota-transfer',ctx.id,q.id,'transfer')
 assert.equal((await business.getBusinessReport('wholesale','quota-ledger',ctx.id)).items.length,0)
 assert.equal((await business.getBusinessReport('wholesale','quota-transfers',ctx.id)).items[0].quantity,-2)
 const promotion=await business.getBusinessReport('wholesale','experience',ctx.id,{filter:'promotion'}),products=await business.getBusinessReport('wholesale','experience',ctx.id,{filter:'products'})
 assert.equal(promotion.items[0].initialLevel,'普通用户');assert.ok(products.items.every(x=>x.id.startsWith('experience-product')))
})
test('inviter binds by code, rejects self and survives a reload',async()=>{
 const {business,storage}=await setup(),ctx=(await business.getBusinessContexts())[0]
 await assert.rejects(business.bindBusinessSuperior(ctx.id,'INVITE-A'),/自己/)
 await business.bindBusinessSuperior(ctx.id,'CODE-OWNER')
 const reloaded=await setup(storage);assert.ok((await reloaded.business.getBusinessReport('wholesale','superior',ctx.id)).superior)
 await assert.rejects(reloaded.business.bindBusinessSuperior(ctx.id,'ANOTHER'),/已绑定/)
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
 const order=(await commerce.getCommerceOrder(r.orderId)).order;await commerce.changeOrder(order.id,'cancel',order.version,'cancel');await commerce.changeOrder(order.id,'cancel',order.version,'cancel')
 assert.equal((await business.getBusinessOverview('wholesale',ctx.id)).quota,20);assert.equal((await operations.getBusinessOperationOptions('upgrade',ctx.id)).activityRemaining,4)
})
test('paid upgrade grants the target once and cannot be downgraded or repeated with pending payment',async()=>{
 const {business,operations,commerce}=await setup(),ctx=(await business.getBusinessContexts())[0],draft={targetAccountId:'demo-person-1',targetLevel:'DEMO-ANGEL',standardQuantity:1,activityQuantity:2}
 const q=await operations.previewBusinessOperation('upgrade',ctx.id,draft),r=await operations.commitBusinessOperation('upgrade',ctx.id,q.id,'upgrade')
 const other=await operations.previewBusinessOperation('upgrade',ctx.id,{...draft,standardQuantity:3,activityQuantity:0});await assert.rejects(operations.commitBusinessOperation('upgrade',ctx.id,other.id,'other'),/待支付/)
 const attempt=await commerce.startPayment(r.orderId,'wechat','pay');await commerce.queryPayment(attempt.id);await commerce.queryPayment(attempt.id)
 assert.equal((await business.getBusinessReport('wholesale','team',ctx.id)).items[0].levelLabel,'天使合伙人');assert.equal((await business.getBusinessOverview('wholesale',ctx.id)).quota,19)
 await assert.rejects(operations.previewBusinessOperation('upgrade',ctx.id,{...draft,targetLevel:'DEMO-VIP'}),/请选择目标等级/)
})
