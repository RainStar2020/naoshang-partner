const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm')
async function setup({useMock=true,remote=()=>{throw new Error('Unexpected network')},storage=new Map()}={}){
 let now=Date.now();const session={token:'token-A',user:{id:'A',name:'王老师'}},context=vm.createContext({console,Date:class extends Date{static now(){return now}},uni:{removeStorageSync:k=>storage.delete(k),getStorageSync:k=>storage.get(k),setStorageSync:(k,v)=>storage.set(k,JSON.parse(JSON.stringify(v)))}}),cache=new Map()
 async function load(file){if(cache.has(file)){const existing=cache.get(file);for(let i=0;i<30&&(existing.status==='linking'||existing.status==='unlinked');i++)await Promise.resolve();return existing}let m;if(file.endsWith('/config'))m=new vm.SyntheticModule(['config'],function(){this.setExport('config',{useMock,previewAllBusinessFeatures:true,previewAllExclusiveFeatures:true})},{context});else if(file.endsWith('/api'))m=new vm.SyntheticModule(['getSession','request'],function(){this.setExport('getSession',()=>session);this.setExport('request',remote)},{context});else m=new vm.SourceTextModule(fs.readFileSync(file+'.js','utf8'),{context,identifier:file});cache.set(file,m);await m.link((s,p)=>load(path.resolve(path.dirname(p.identifier),s).replaceAll('\\','/')));return m}
 const root=path.resolve(__dirname,'../src').replaceAll('\\','/');async function get(name){const m=await load(root+'/'+name);if(m.status!=='evaluated')await m.evaluate();return m.namespace}
 return {api:await get('services/commerce'),business:await get('services/business'),operations:await get('services/business-operations'),training:await get('services/training'),lesson:await get('services/lesson'),learning:await get('services/learning'),exclusive:await get('services/exclusive'),store:await get('services/business-store'),profile:await get('services/mock/profile'),mock:await get('services/mock/commerce'),catalog:await get('features/business/catalog'),session,storage,advance:ms=>{now+=ms}}
}
const draft=(category='software',extra={})=>({productId:`product-${category}`,skuId:`sku-${category}-1`,quantity:1,storeId:'shop-1',remark:'',...extra})

test('column progress uses the common writer, stays account-scoped and does not prevent repeat purchase',async()=>{
 const {api,learning,lesson,mock,storage}=await setup()
 await assert.rejects(learning.saveLearningProgress({columnId:'product-column',chapterId:'chapter-1'},{completed:true}),/无权/)
 const quote=await api.quoteCheckout(draft('column')),created=await api.createCheckoutOrder(quote.id,'column-order')
 const attempt=await api.startPayment(created.order.id,'wechat','column-pay');await api.queryPayment(attempt.id)
 assert.equal((await api.getColumn('product-column')).unlocked,false)
 await api.activateColumn('product-column','NS-COLUMN-2026','column-code')
 await learning.saveLearningProgress({columnId:'product-column',chapterId:'chapter-1'},{completed:true})
 assert.equal((await lesson.getLesson({columnId:'product-column',chapterId:'chapter-1'})).progress.percent,100)
 assert.equal((await api.getColumn('product-column')).chapters[0].progress.percent,100)
 assert.ok([...storage.keys()].some(key=>key.includes('account-column')))
 const repeatQuote=await api.quoteCheckout(draft('column')),repeat=await api.createCheckoutOrder(repeatQuote.id,'column-repeat')
 assert.notEqual(repeat.order.id,created.order.id);assert.equal((await api.getColumn('product-column')).unlocked,true)
})

test('costore payment survives reload, reaches the selected store only after payment and rejection awaits refund',async()=>{
 const first=await setup(),options=await first.exclusive.getCostoreOptions(),quote=await first.exclusive.quoteCostore(options.stores[0].id,options.durations[0].id)
 assert.equal(quote.payableAmount,69800*6)
 const submitted=await first.exclusive.submitCostoreApplication({quoteId:quote.id,idempotencyKey:'costore-create'})
 assert.equal(submitted.application.applicationStatus,'PENDING_PAYMENT')
 const next=await setup({storage:first.storage}),ctx=(await next.business.getBusinessContexts()).find(x=>x.agencyType==='STORE'&&x.storeId===options.stores[0].id)
 assert.equal((await next.store.getBusinessStore(ctx.id)).approvals.some(x=>x.id===submitted.application.id),false)
 const attempt=await next.api.startPayment(submitted.orderId,'wechat','costore-pay');await next.api.queryPayment(attempt.id);await next.api.queryPayment(attempt.id)
 assert.equal((await next.exclusive.getMyApplications()).items[0].paymentStatus,'PAID')
 const workspace=await next.store.getBusinessStore(ctx.id),approval=workspace.approvals.find(x=>x.id===submitted.application.id)
 assert.ok(approval);assert.equal(workspace.approvals.filter(x=>x.id===approval.id).length,1)
 await next.store.decideBusinessApplication(ctx.id,workspace.store.id,approval.id,{decision:'REJECT',reason:'暂不接收',version:approval.version,idempotencyKey:'costore-reject'})
 const application=(await next.exclusive.getMyApplications()).items[0]
 assert.equal(application.applicationStatus,'REJECTED');assert.equal(application.refundStatus,'PENDING');assert.equal(application.entitlementStatus,'NOT_OPEN')
})
test('staff workspace bootstrap uses the dedicated channel without granting parent business preview',async()=>{
 const calls=[],{training,session}=await setup({useMock:false,remote:async path=>{calls.push(path);return {contextId:'coach:staff-1:store-1',name:'健脑官',store:{id:'store-1'},members:[],allowedActions:[]}}})
 session.accountType='coach'
 const workspace=await training.getCoachWorkspace()
 assert.equal(workspace.contextId,'coach:staff-1:store-1');assert.equal(calls.join(','),'/coach/workspace')
 const local=await setup();local.session.accountType='coach';await assert.rejects(local.training.getCoachWorkspace(),/联系门店/)
})
test('wholesale maximum permission exposes exactly the five designed home tools while keeping child routes available',async()=>{const {business,catalog}=await setup(),ctx=(await business.getBusinessContexts())[0],all=(await business.getBusinessOverview('wholesale',ctx.id)).tools;assert.equal(all.length,16);assert.equal(catalog.businessHomeTools(all,ctx).map(x=>x.label).join(','),'收益,上级,分享码,素材库,全球奖');assert.ok(all.some(x=>x.id==='quota-purchase'))})
test('checkout enforces address/member ownership, integer stock and valid coupon thresholds',async()=>{const {api}=await setup();await assert.rejects(api.quoteCheckout(draft('physical')),/收货地址/);await assert.rejects(api.quoteCheckout(draft('special',{memberId:'forged'})),/会员/);await assert.rejects(api.quoteCheckout(draft('software',{quantity:1.5})),/整数/);await assert.rejects(api.quoteCheckout(draft('software',{quantity:99})),/规格|数量/);await assert.rejects(api.quoteCheckout(draft('column',{couponId:'coupon-10'})),/条件/);await assert.rejects(api.quoteCheckout(draft('software',{couponId:'forged'})),/优惠券/);const q=await api.quoteCheckout(draft('software',{couponId:'coupon-5'}));assert.equal(q.discountAmount,500);assert.equal(q.payableAmount,q.goodsAmount-500)})
test('order creation, coupon reservation/release and request retries are atomic and idempotent',async()=>{const {api}=await setup(),q=await api.quoteCheckout(draft('software',{couponId:'coupon-5'})),r=await api.createCheckoutOrder(q.id,'create');assert.equal((await api.createCheckoutOrder(q.id,'create')).order.id,r.order.id);await assert.rejects(api.createCheckoutOrder(q.id,'another'),/已经提交/);assert.ok(!(await api.getCheckoutOptions()).coupons.some(x=>x.id==='coupon-5'));await api.changeOrder(r.order.id,'cancel',r.order.version,'cancel');assert.ok((await api.getCheckoutOptions()).coupons.some(x=>x.id==='coupon-5'));assert.equal((await api.changeOrder(r.order.id,'cancel',r.order.version,'cancel')).order.status,'CANCELLED');await assert.rejects(api.startPayment(r.order.id,'wechat','pay-cancelled'),/不可支付/)} )
test('quote expiry, account scope and changed addresses reject stale creation',async()=>{const {api,session,profile,advance}=await setup(),q=await api.quoteCheckout(draft());advance(300001);await assert.rejects(api.createCheckoutOrder(q.id,'expired'),/过期/);const fresh=await api.quoteCheckout(draft());session.user.id='B';await assert.rejects(api.createCheckoutOrder(fresh.id,'cross'),/过期/);session.user.id='A';profile.mockProfileState(session.user).addresses.push({id:'address',version:1,recipient:'收件人',phone:'19900000001',regionNames:['河南省','郑州市','中原区'],detail:'梧桐街'});const physical=await api.quoteCheckout(draft('physical',{addressId:'address'}));profile.mockProfileState(session.user).addresses[0].version++;await assert.rejects(api.createCheckoutOrder(physical.id,'old-address'),/地址已变化/)})
test('payment requires a stored attempt and query; duplicate attempts cannot produce duplicate payments',async()=>{const {api}=await setup(),q=await api.quoteCheckout(draft()),{order}=await api.createCheckoutOrder(q.id,'create');const p=await api.startPayment(order.id,'wechat','pay');assert.equal(p.status,'PROCESSING');assert.equal((await api.getCommerceOrder(order.id)).order.status,'PENDING_PAYMENT');assert.equal((await api.startPayment(order.id,'alipay','pay2')).id,p.id);const paid=await api.queryPayment(p.id);assert.equal(paid.status,'SUCCEEDED');assert.equal(paid.order.status,'PAID');assert.equal(paid.order.fulfillmentStatus,'WAIT_DELIVERY');assert.equal((await api.queryPayment(p.id)).order.version,paid.order.version);await assert.rejects(api.changeOrder(order.id,'cancel',paid.order.version,'cancel-paid'),/不能执行/);await assert.rejects(api.queryPayment('forged'),/不存在/)})
test('stock is rechecked when concurrent quotes commit and restored by cancellation',async()=>{const {api}=await setup(),q1=await api.quoteCheckout(draft('software',{quantity:10})),q2=await api.quoteCheckout(draft('software',{quantity:10}));const r=await api.createCheckoutOrder(q1.id,'first');await assert.rejects(api.createCheckoutOrder(q2.id,'second'),/库存不足/);await api.changeOrder(r.order.id,'cancel',r.order.version,'cancel');assert.ok((await api.createCheckoutOrder(q2.id,'second')).order.id)})
test('stored orders survive a mock adapter reload and cannot leak across accounts',async()=>{const one=await setup(),q=await one.api.quoteCheckout(draft()),r=await one.api.createCheckoutOrder(q.id,'create'),two=await setup({storage:one.storage});assert.equal((await two.api.getCommerceOrder(r.order.id)).order.orderNo,r.order.orderNo);two.session.user.id='B';await assert.rejects(two.api.getCommerceOrder(r.order.id),/无权/);assert.ok(!(await two.api.getCommerceOrders()).items.some(x=>x.orderNo===r.order.orderNo))})
test('business quota purchase goes through cashier and credits quota once only after payment query',async()=>{const {api,business,operations}=await setup(),ctx=(await business.getBusinessContexts())[0],q=await operations.previewBusinessOperation('quota-purchase',ctx.id,{quantity:'3'}),r=await operations.commitBusinessOperation('quota-purchase',ctx.id,q.id,'purchase');assert.equal((await business.getBusinessOverview('wholesale',ctx.id)).quota,20);assert.equal((await api.getPaymentChannels(r.orderId)).items.map(item=>item.id).join(','),'unionpay');await assert.rejects(api.startPayment(r.orderId,'wechat','business-pay-wechat'),/不可支付/);const p=await api.startPayment(r.orderId,'unionpay','business-pay');await api.queryPayment(p.id);await api.queryPayment(p.id);assert.equal((await business.getBusinessOverview('wholesale',ctx.id)).quota,23)})
test('columns require both paid purchase and activation before chapter access; CMS benefits stay blank',async()=>{const {api,lesson,learning}=await setup();await assert.rejects(lesson.getLesson({columnId:'product-column',chapterId:'chapter-1'}),/激活/);await assert.rejects(api.activateColumn('product-column','NS-COLUMN-2026','activate'),/先购买/);const q=await api.quoteCheckout(draft('column')),r=await api.createCheckoutOrder(q.id,'buy'),p=await api.startPayment(r.order.id,'wechat','pay');await api.queryPayment(p.id);assert.equal((await api.getColumn('product-column')).unlocked,false);await api.activateColumn('product-column','NS-COLUMN-2026','activate');assert.ok((await lesson.getLesson({columnId:'product-column',chapterId:'chapter-1'})).content.nodes.length);const identities=await learning.getLearningIdentities(),child=identities.find(x=>x.mode==='child'),detail=await learning.getLearningLevelDetail(child.id,'level-1');assert.equal(detail.content.nodes.length,0);assert.ok((await lesson.getLesson({contextId:child.id,levelId:'level-1',chapterId:'level-1-article'})).title);await assert.rejects(lesson.getLesson({contextId:identities[0].id,levelId:'level-1',chapterId:'level-1-article'}),/未解锁/)})
test('training edits enforce versions/hours, feedback is idempotent and transfer waits for approval',async()=>{const {business,training}=await setup(),ctx=(await business.getBusinessContexts()).find(x=>x.module==='agency'&&x.agencyType==='STORE'),w=await training.getCoachWorkspace(ctx.id),member=w.members[0],r=await training.getStoreMember(ctx.id,member.id);await assert.rejects(training.updateStoreMember(ctx.id,member.id,{...r.member,trainingUsed:99}),/不能超过/);const updated=await training.updateStoreMember(ctx.id,member.id,{...r.member,remark:'注意复习'});assert.equal(updated.member.remark,'注意复习');await assert.rejects(training.updateStoreMember(ctx.id,member.id,r.member),/已更新/);const payload={title:'训练表现',text:'今天完成联想练习',kind:'training',imageAssetIds:[]};const f=await training.saveTrainingFeedback(ctx.id,member.id,payload,'feedback');assert.equal((await training.saveTrainingFeedback(ctx.id,member.id,payload,'feedback')).id,f.id);assert.equal((await training.getTrainingFeedback(ctx.id,member.id,'training')).items.length,1);const targets=await training.getTransferOptions(ctx.id,member.id),a=await training.applyStoreTransfer(ctx.id,member.id,{targetStoreId:targets.stores[0].id,reason:'就近学习'},'transfer');assert.equal(a.application.status,'PENDING');await assert.rejects(training.applyStoreTransfer(ctx.id,member.id,{targetStoreId:targets.stores[1].id,reason:'就近学习'},'another'),/待审核/)})
test('real failures never fall back to fixtures and responses after token changes are rejected',async()=>{const bad=await setup({useMock:false,remote:async()=>{throw new Error('network')}});await assert.rejects(bad.api.getCatalog(),/network/);let resolve;const late=await setup({useMock:false,remote:()=>new Promise(r=>{resolve=r})}),pending=late.api.getCatalog();late.session.token='changed';resolve({categories:[],items:[]});await assert.rejects(pending,/登录状态已变化/)})
test('unknown checkout intents survive reload and retain their original quote, draft and idempotency key',async()=>{const first=await setup(),d=draft(),q=await first.api.quoteCheckout(d);first.api.rememberPendingCheckout(d,q,'original-key');const second=await setup({storage:first.storage}),pending=second.api.getPendingCheckout(d);assert.equal(pending.key,'original-key');assert.equal(pending.quote.id,q.id);assert.equal(pending.draft.storeId,d.storeId);second.api.clearPendingCheckout(d);assert.equal(second.api.getPendingCheckout(d),null)})
test('remote processing attempts are retained across reload; terminal result releases the payment lock',async()=>{let requests=0;const first=await setup({useMock:false,remote:async()=>{requests++;return {id:'attempt-remote',status:'PROCESSING'}}});const a=await first.api.startPayment('order-remote','wechat','pay-original');assert.equal(a.id,'attempt-remote');assert.equal(first.api.getPendingPayment('order-remote').attemptId,a.id);await first.api.startPayment('order-remote','alipay','pay-new');assert.equal(requests,1);const second=await setup({useMock:false,storage:first.storage,remote:async()=>({id:'attempt-remote',status:'FAILED'})});await second.api.queryPayment(a.id);assert.equal(second.api.getPendingPayment('order-remote'),null)})
test('remote feedback drops executable or non-HTTPS attachment URLs before rendering',async()=>{const {training}=await setup({useMock:false});const result=training.normalizeTrainingFeedback({id:'feedback',memberId:'member',title:'训练反馈',content:{version:1,format:'nodes',nodes:[]},images:['data:text/html,unsafe','https://cdn.example/image.png'],attachments:[{assetId:'bad',kind:'file',previewUrl:'javascript:alert(1)'},{assetId:'good',kind:'file',previewUrl:'https://cdn.example/report.pdf'}]},'member','feedback');assert.equal(result.images.length,1);assert.equal(result.attachments.length,1);assert.equal(result.attachments[0].assetId,'good');assert.throws(()=>training.normalizeTrainingFeedback({...result,memberId:'someone-else'},'member','feedback'),/不匹配/)})
test('remote checkout quotes accept numeric expiresAt/serverTime timestamps',async()=>{
 const now=Date.now(),quote={id:'quote-remote',payableAmount:4537,goodsAmount:4537,discountAmount:2443,tierDiscountLabel:'联创合伙人6.5折',expiresAt:now+300000,serverTime:now,remark:'',product:{key:'pad',name:'脑商Pad',unitPrice:2094,qty:1,listUnitPrice:6980,memberUnitPrice:5584,channelUnitPrice:5584,appliedPriceKind:'partner'}}
 const {api}=await setup({useMock:false,remote:async(url,{method,data}={})=>{
  if(url==='/checkout/quotes'&&method==='POST'){
   assert.equal(data.productId,'product-software');assert.equal(data.skuId,'sku-software-1');assert.equal(data.quantity,1)
   return quote
  }
  throw new Error('Unexpected '+method+' '+url)
 }})
 const result=await api.quoteCheckout(draft())
 assert.equal(result.id,'quote-remote')
 assert.equal(result.payableAmount,453700)
 assert.equal(result.goodsAmount,453700)
 assert.equal(result.discountAmount,244300)
 assert.equal(result.product.unitPrice,209400)
 assert.equal(result.product.listUnitPrice,698000)
 assert.equal(result.tierDiscountLabel,'联创合伙人6.5折')
 assert.equal(api.yuanToCents(2094),209400)
 assert.equal(api.parseCommerceTime(result.expiresAt),quote.expiresAt)
 assert.equal(api.parseCommerceTime('2026-10-29T12:00:00+08:00'),Date.parse('2026-10-29T12:00:00+08:00'))
 assert.ok(Number.isNaN(api.parseCommerceTime('not-a-time')))
})
test('remote create order adapts flat paid/sku payload into orderResult shape',async()=>{
 const remoteOrder={
  id:'o_37', type:'product', productKey:'pad', productName:'脑商Pad', kind:'physical',
  qty:1, unitPrice:4537, paid:4537, skuId:'sku-pad-1', skuLabel:'智能变速，一档', skuQty:1,
  status:'PENDING_PAYMENT', tip_text:'实物商品，支付后由门店/总部发货',
  delivery:{ tipText:'实物商品，支付后由门店/总部发货', pay:{ status:'PENDING_PAYMENT', payExpireAt:Date.now()+1800000 } }
 }
 const {api}=await setup({useMock:false,remote:async(url,{method,data}={})=>{
  if(url==='/orders'&&method==='POST'){
   assert.equal(data.quoteId,'quote-remote')
   assert.equal(data.idempotencyKey,'create-remote')
   assert.equal(data.payLater,true)
   return {ok:true,id:'o_37',orderId:'o_37',quoteId:data.quoteId,quoteConsumed:true,order:remoteOrder}
  }
  if(url==='/orders/o_37')return remoteOrder
  throw new Error('Unexpected '+method+' '+url)
 }})
 const created=await api.createCheckoutOrder('quote-remote','create-remote')
 assert.equal(created.order.id,'o_37')
 assert.equal(created.order.payableAmount,453700)
 assert.equal(created.order.goodsAmount,453700)
 assert.equal(created.order.discountAmount,0)
 assert.ok(Array.isArray(created.order.items))
 assert.equal(created.order.items.length,1)
 assert.equal(created.order.items[0].skuId,'sku-pad-1')
 assert.equal(created.order.items[0].title,'脑商Pad')
 assert.equal(created.order.items[0].quantity,1)
 assert.equal(created.order.items[0].unitAmount,453700)
 assert.equal(created.order.allowedActions.join(','),'pay,cancel')
 assert.equal(created.order.fulfillmentNotice,'实物商品，支付后由门店/总部发货')
 const money=api.normalizeRemoteOrderMoney({id:'o_38',paid:648.7,skuId:'sku-memoryCard-1',productKey:'memoryCard',productName:'记忆卡',skuQty:1,status:'paid'})
 assert.equal(money.id,'o_38')
 assert.equal(money.payableAmount,64870)
 assert.equal(money.status,'PAID')
 assert.equal(money.allowedActions.join(','),'')
 assert.equal(money.items[0].title,'记忆卡')
 const detail=await api.getCommerceOrder('o_37')
 assert.equal(detail.order.id,'o_37')
 assert.equal(detail.order.payableAmount,453700)
 assert.equal(detail.order.allowedActions.includes('pay'),true)
})

test('only definitive checkout rejection unlocks a draft; network and unspecified conflicts stay uncertain',async()=>{const {api}=await setup();assert.equal(api.isCheckoutRejection({statusCode:422}),true);assert.equal(api.isCheckoutRejection({statusCode:409,code:'QUOTE_EXPIRED'}),true);assert.equal(api.isCheckoutRejection({statusCode:409}),false);assert.equal(api.isCheckoutRejection(new Error('network')),false);assert.equal(api.isCheckoutRejection({statusCode:500}),false)})
