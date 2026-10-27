// TODO(API): MOCK-ONLY. Delete this adapter and local data keys after commerce API integration.
// Prices, discount rates, stock, fulfillment and payment outcomes here are fixtures, not production rules.
import {mockProfileState,mockBoundStore} from './profile'
import {mockFamily} from './family'
import {mockChapterProgress} from './learning-progress'
import {mockExclusiveState,saveMockExclusiveState} from './exclusive'
import {mockBusinessState,mockBusinessContexts,saveMockBusinessState} from './business'
const accounts=new Map(),copy=value=>JSON.parse(JSON.stringify(value))
export const commerceCategories=[{id:'physical',label:'脑力核心'},{id:'software',label:'软件卡'},{id:'special',label:'特色产品'},{id:'admin',label:'行政费'},{id:'column',label:'专栏产品'},{id:'coaching',label:'陪练卡'},{id:'camp',label:'训练营'}]
const catalogSummary='这里是简介这里是简介，这里是简介'
const detailContent={format:'nodes',version:1,nodes:[
  {name:'p',children:[{type:'text',text:'各位亲爱的用户，非常抱歉，我们的平台将在8月21日开启维护，维护期间您将无法登录，维护的时长为6小时，在此期间给您带来的不便深感抱歉'}]},
  {name:'p',children:[{type:'text',text:'让天下易者都可以拥有施展能力的舞台'}]},
  {name:'p',children:[{type:'text',text:'让人生的所有未知与迷茫者都可以迎刃而解'}]},
  {name:'p',children:[{type:'text',text:'传承国学，弘扬传统文化。'}]},
  {name:'p',children:[{type:'text',text:'国家繁荣昌盛，人民安居乐业。'}]},
]}
// Detail overlay only. Checkout continues to charge sku.amount and does not derive these tiers.
const agencyRolePrices=[{label:'单店',discountLabel:'5折',amount:50000},{label:'区县',discountLabel:'4折',amount:40000},{label:'地市',discountLabel:'35折',amount:35000},{label:'省代',discountLabel:'3折',amount:30000}]
const speedOptions=[{id:'smart',label:'智能变速'},{id:'stepless',label:'无级变速'},{id:'fixed',label:'定速，无变速'}]
const gearOptions=[{id:'g1',label:'单档调节'},{id:'g2',label:'两档调节'},{id:'g3',label:'三档调节'},{id:'g4',label:'四档调节'},{id:'g5',label:'五档调节'},{id:'g6',label:'六档调节'}]
function memberPrices(amounts){return [{label:'VIP',discountLabel:'9折',amount:amounts[0]},{label:'天使',discountLabel:'8折',amount:amounts[1]},{label:'私董',discountLabel:'7.5折',current:true,amount:amounts[2]},{label:'联创',discountLabel:'6.5折',amount:amounts[3]}]}
function pairGroups(labels){return [{id:'spec',label:'规格',options:labels.map((label,index)=>({id:`opt-${index+1}`,label}))}]}
function pairSkus(categoryId,labels,amounts){return labels.map((label,index)=>({id:`sku-${categoryId}-${index+1}`,label,specs:{spec:`opt-${index+1}`},amount:amounts[index],stock:index===0?20:8}))}
function physicalSkus(){
  const legacy={'smart:g6':{id:'sku-physical-1',amount:158000,stock:20},'stepless:g1':{id:'sku-physical-2',amount:178000,stock:8},'fixed:g6':{id:'sku-physical-oos',amount:158000,stock:0}}
  const rows=[]
  for(const speed of speedOptions)for(const gear of gearOptions){
    const key=`${speed.id}:${gear.id}`,known=legacy[key]
    rows.push({id:known?.id||`sku-physical-${speed.id}-${gear.id}`,label:`${speed.label}，${gear.label}`,specs:{speed:speed.id,gear:gear.id},amount:known?.amount||158000,stock:known?.stock??12})
  }
  const rank=id=>id==='sku-physical-1'?0:id==='sku-physical-2'?1:2
  return rows.sort((a,b)=>rank(a.id)-rank(b.id)||a.id.localeCompare(b.id))
}
const columnContent={format:'nodes',version:1,nodes:[{name:'p',children:[{type:'text',text:'《学习高手》这本书是张雪芳健脑官的著作，主要面向6至12岁的青少年。这里是后台编辑好的介绍内容'}]},...detailContent.nodes]}
function catalogProduct(category,fields){return {id:`product-${category.id}`,categoryId:category.id,categoryLabel:category.label,title:fields.title,summary:fields.summary||catalogSummary,coverUrl:'/static/product/product-cover.png',fulfillmentType:fields.fulfillmentType,requiresMember:fields.requiresMember,pricePresentation:fields.pricePresentation,standardAmount:fields.standardAmount,activityAmount:fields.activityAmount,memberPrices:memberPrices(fields.memberAmounts),rolePrices:fields.pricePresentation==='standard-only'?[]:agencyRolePrices.map(item=>({...item})),specGroups:fields.specGroups,skus:fields.skus,checkoutNotice:fields.checkoutNotice||'',checkoutDiscountLabel:'VIP合伙人8折',content:fields.content||detailContent}}
export const commerceProducts=[
  catalogProduct(commerceCategories[0],{title:'平板',fulfillmentType:'PHYSICAL',requiresMember:false,pricePresentation:'tiered',standardAmount:198000,activityAmount:158000,memberAmounts:[142200,126400,118500,102700],specGroups:[{id:'speed',label:'变速',options:speedOptions},{id:'gear',label:'档位',options:gearOptions}],skus:physicalSkus()}),
  catalogProduct(commerceCategories[1],{title:'xxx软件卡',fulfillmentType:'ACTIVATION_CODE',requiresMember:false,pricePresentation:'tiered',standardAmount:36000,activityAmount:30000,memberAmounts:[27000,24000,22500,19500],specGroups:pairGroups(['月卡','年卡']),skus:pairSkus('software',['月卡','年卡'],[30000,120000]),checkoutNotice:'软件卡商品下单后联系门店获取激活码'}),
  {...catalogProduct(commerceCategories[6],{title:'xxxxxx训练营',fulfillmentType:'OFFLINE_SERVICE',requiresMember:true,pricePresentation:'tiered',standardAmount:128000,activityAmount:108000,memberAmounts:[97200,86400,81000,70200],specGroups:pairGroups(['10课时','假期营']),skus:pairSkus('special',['10课时','假期营'],[108000,168000])}),id:'product-special'},
  catalogProduct(commerceCategories[3],{title:'XXX期训练营行政费',fulfillmentType:'OFFLINE_SERVICE',requiresMember:true,pricePresentation:'standard-only',standardAmount:20000,activityAmount:20000,memberAmounts:[20000,20000,20000,20000],specGroups:pairGroups(['默认','进阶版']),skus:pairSkus('admin',['默认','进阶版'],[20000,25000])}),
  catalogProduct(commerceCategories[4],{title:'BZ-《记忆基础》',summary:'这里是后台编辑的简介内容，这里是后台编辑的简介内容这里是后台编辑的简介内容',fulfillmentType:'COLUMN_ACCESS',requiresMember:false,pricePresentation:'tiered',standardAmount:9900,activityAmount:7900,memberAmounts:[7110,6320,5925,5135],specGroups:pairGroups(['默认','进阶版']),skus:pairSkus('column',['默认','进阶版'],[7900,12900]),checkoutNotice:'专栏产品下单后联系门店获取激活码',content:columnContent}),
  catalogProduct(commerceCategories[5],{title:'陪练卡',fulfillmentType:'OFFLINE_SERVICE',requiresMember:true,pricePresentation:'tiered',standardAmount:120000,activityAmount:100000,memberAmounts:[90000,80000,75000,65000],specGroups:pairGroups(['10课时','20课时']),skus:pairSkus('coaching',['10课时','20课时'],[100000,180000])}),
  {...catalogProduct(commerceCategories[2],{title:'特色产品',fulfillmentType:'PHYSICAL',requiresMember:false,pricePresentation:'tiered',standardAmount:10000,activityAmount:8000,memberAmounts:[7200,6400,6000,5200],specGroups:pairGroups(['默认']),skus:pairSkus('featured',['默认'],[8000])}),id:'product-featured'},
]
const stores=[{id:'shop-1',name:'脑商训练营梧桐街店',number:'NO.001',address:'河南省郑州市管城回族区航海东路与中州大道交叉口西美景龙堂3c-1',managerName:'李志远',phone:'19919988991',coverUrl:'/static/agency/store-wutong.png'},{id:'shop-2',name:'脑商训练营文化路店',number:'NO.002',address:'郑州市文化路成长中心',managerName:'李老师',phone:'',coverUrl:'/static/common/icon-store.png'}]
// checkoutDiscountLabel, rolePrices and coupon scope/threshold labels are layout fixtures.
// payableAmount subtracts the coupon amount only. scopeLabel is not a redemption rule.
const stamp=()=>new Date().toISOString()
export function mockCommerceState(user){
  if(!accounts.has(user.id)){
    let saved;try{saved=uni.getStorageSync(`naoshang-mock-commerce-v1:${user.id}`)}catch{}
    const state=saved?.schema===1&&saved.accountId===user.id?saved:{schema:1,accountId:user.id,next:6,orders:[],quotes:{},operations:{},attempts:{},grants:{},coupons:[{id:'coupon-5',title:'商品专属福利券',amount:500,minAmount:0,thresholdLabel:'无门槛',scopeLabel:'适用于小米、智利车厘子、精选等3件商品',status:'available',expiresAt:'2027-12-31T23:59:59+08:00'},{id:'coupon-10',title:'商品专属福利券',amount:1000,minAmount:10000,thresholdLabel:'满100可用',scopeLabel:'全部商品可用',status:'available',expiresAt:'2027-12-31T23:59:59+08:00'}]}
    if(!saved?.schema){for(let n=0;n<5;n++){const p=commerceProducts[n],paid=n!==0&&n!==4;state.orders.push({id:`order-${n+1}`,orderNo:`NS20261022000${n+1}`,accountId:user.id,items:[{id:p.skus[0].id,skuId:p.skus[0].id,productId:p.id,title:p.title,specLabel:p.skus[0].label,quantity:1,coverUrl:p.coverUrl,unitAmount:p.skus[0].amount}],fulfillmentType:p.fulfillmentType,categoryId:p.categoryId,memberId:mockFamily(user).members[0].id,memberName:mockFamily(user).members[0].name,memberCard:memberCard(mockFamily(user).members[0]),tierDiscountLabel:p.checkoutDiscountLabel||'',couponTitle:'',paymentChannelLabel:paid?'微信支付':'',store:copy(stores[0]),address:p.fulfillmentType==='PHYSICAL'?{recipient:'张小伟',phone:'19900000001',regionNames:['河南省','郑州市','中原区'],detail:'梧桐街1号'}:null,goodsAmount:p.skus[0].amount,discountAmount:0,payableAmount:p.skus[0].amount,status:n===4?'CANCELLED':paid?'COMPLETED':'PENDING_PAYMENT',fulfillmentStatus:paid?'DELIVERED':null,remark:'',version:1,createdAt:stamp(),paidAt:paid?stamp():null,cancelledAt:n===4?stamp():null,cancelReason:n===4?'支付超时，订单自动取消':'',expiresAt:new Date(Date.now()+1800000).toISOString(),trackingNo:null})}}
    if(!saved?.schema){for(const [n,fulfillmentStatus] of [[6,'WAIT_SHIP'],[7,'SHIPPED']]){state.orders.push({...copy(state.orders[0]),id:`order-${n}`,orderNo:`NS20261022000${n}`,status:'PAID',fulfillmentStatus,paidAt:stamp(),shippedAt:fulfillmentStatus==='SHIPPED'?stamp():null,paymentChannelLabel:'微信支付',trackingNo:fulfillmentStatus==='SHIPPED'?'SF5154445657':null})}state.next=8}
    accounts.set(user.id,state)
  }return accounts.get(user.id)
}
export function saveMockCommerce(user){uni.setStorageSync(`naoshang-mock-commerce-v1:${user.id}`,copy(mockCommerceState(user)))}
export function mockCatalog(){return {categories:[{id:'all',label:'全部分类'},...copy(commerceCategories)],items:copy(commerceProducts)}}
export function mockProduct(id){const item=commerceProducts.find(p=>p.id===id);if(!item)throw new Error('商品不存在或已下架');return copy(item)}
export function mockAvailableStock(user,skuId){const p=commerceProducts.find(x=>x.skus.some(s=>s.id===skuId)),sku=p?.skus.find(x=>x.id===skuId);if(!sku)return 0;const reserved=mockCommerceState(user).orders.filter(x=>x.status!=='CANCELLED').flatMap(x=>x.items).filter(x=>x.skuId===skuId).reduce((sum,x)=>sum+x.quantity,0);return Math.max(0,sku.stock-reserved)}
export function mockProductAvailability(user,id){const product=mockProduct(id);product.skus=product.skus.map(sku=>({...sku,stock:mockAvailableStock(user,sku.id)}));return product}
export function mockCheckoutOptions(user,productId){const own=mockProfileState(user).addresses,product=productId?mockProduct(productId):null,locked=product?.deliveryMode==='HEADQUARTERS',headquarters={id:'headquarters',name:'总部交付',address:'',managerName:'总部',phone:''};return {stores:locked?[headquarters]:copy(stores),defaultStoreId:locked?'headquarters':mockBoundStore().id,deliveryLocked:locked,members:copy(mockFamily(user).members),addresses:copy(own),coupons:copy(mockCommerceState(user).coupons.filter(x=>x.status==='available'))}}
function memberCard(member){return member?{name:member.name||'',badge:member.badge||'',displayId:member.displayId||'',gradeLabel:member.gradeLabel||'',genderLabel:member.genderLabel||'',avatarUrl:member.avatarUrl||''}:null}
function ownedOrder(user,id){const order=mockCommerceState(user).orders.find(x=>x.id===id);if(!order)throw new Error('订单不存在或无权访问');if(order.status==='PENDING_PAYMENT'&&Date.parse(order.expiresAt)<=Date.now()){order.status='CANCELLED';order.cancelledAt=stamp();order.cancelReason='支付超时，订单自动取消';releaseMockBusinessReservation(user,order);order.version++;const coupon=mockCommerceState(user).coupons.find(x=>x.orderId===id);if(coupon&&coupon.status==='reserved'){coupon.status='available';delete coupon.orderId}saveMockCommerce(user)}return order}
export function orderView(order){const product=commerceProducts.find(item=>item.id===order.items?.[0]?.productId);return {...copy(order),fulfillmentNotice:order.fulfillmentNotice||product?.checkoutNotice||'',statusLabel:order.status==='PAID'?({WAIT_SHIP:'待发货',SHIPPED:'待收货',WAIT_DELIVERY:'待交付',PENDING_REVIEW:'待门店审核'}[order.fulfillmentStatus]||'履约中'):({PENDING_PAYMENT:'待付款',CANCELLED:'已取消',COMPLETED:'已完成'}[order.status]||'状态待确认'),allowedActions:order.status==='PENDING_PAYMENT'?['pay','cancel']:order.status==='PAID'&&order.fulfillmentStatus==='SHIPPED'?['confirm-receipt']:[]}}
export function mockOrders(user,{filter='all',keyword='',memberId}={}){let rows=mockCommerceState(user).orders;if(memberId)rows=rows.filter(x=>x.memberId===memberId);rows=rows.map(x=>orderView(ownedOrder(user,x.id)));const filters={'pending-payment':o=>o.status==='PENDING_PAYMENT','waiting-shipment':o=>o.status==='PAID'&&o.fulfillmentStatus==='WAIT_SHIP','waiting-receipt':o=>o.status==='PAID'&&o.fulfillmentStatus==='SHIPPED',completed:o=>o.status==='COMPLETED'};if(filters[filter])rows=rows.filter(filters[filter]);if(keyword)rows=rows.filter(x=>[x.orderNo,...x.items.map(i=>i.title)].join(' ').includes(keyword));return {items:copy(rows.reverse()),hasMore:false,nextCursor:null}}
export function mockOrder(user,id){return {order:orderView(ownedOrder(user,id)),serverTime:stamp()}}
export function mockCheckoutQuote(user,draft){
  const state=mockCommerceState(user),product=mockProduct(draft.productId),sku=product.skus.find(x=>x.id===draft.skuId),options=mockCheckoutOptions(user,product.id)
  if(!sku||!Number.isInteger(draft.quantity)||draft.quantity<1||draft.quantity>Math.min(mockAvailableStock(user,sku.id),99))throw new Error('请选择有效规格与购买数量')
  const store=options.stores.find(x=>x.id===draft.storeId),member=options.members.find(x=>x.id===draft.memberId),address=options.addresses.find(x=>x.id===draft.addressId),coupon=options.coupons.find(x=>x.id===draft.couponId)
  if(!store)throw new Error('请选择所属门店');if(product.requiresMember&&!member)throw new Error('请选择会员');if(product.fulfillmentType==='PHYSICAL'&&!address)throw new Error('请选择收货地址');if(draft.couponId&&!coupon)throw new Error('优惠券已失效')
  const goodsAmount=sku.amount*draft.quantity;if(coupon&&(Date.parse(coupon.expiresAt)<=Date.now()||goodsAmount<coupon.minAmount))throw new Error('订单未满足优惠券使用条件')
  const discountAmount=coupon?Math.min(goodsAmount,coupon.amount):0,id=`quote-${state.next++}`,quote={id,accountId:user.id,productId:product.id,skuId:sku.id,quantity:draft.quantity,store:copy(store),memberId:member?.id||null,memberName:member?.name||null,address:address?copy(address):null,couponId:coupon?.id||null,remark:String(draft.remark||'').trim(),goodsAmount,discountAmount,payableAmount:goodsAmount-discountAmount,tierDiscountLabel:product.checkoutDiscountLabel||'',expiresAt:new Date(Date.now()+300000).toISOString(),serverTime:stamp(),ruleVersion:1}
  if(quote.remark.length>200)throw new Error('备注不能超过200字');state.quotes[id]=quote;saveMockCommerce(user);return copy(quote)
}
function once(user,key,fingerprint,operation){if(!key)throw new Error('缺少提交编号');const state=mockCommerceState(user),old=state.operations[key];if(old){if(old.fingerprint!==fingerprint)throw new Error('重复提交参数不一致');return copy(old.result)}const result=operation();state.operations[key]={fingerprint,result:copy(result)};saveMockCommerce(user);return copy(result)}
export function mockCreateOrder(user,quoteId,key){return once(user,key,`create:${quoteId}`,()=>{
  const state=mockCommerceState(user),q=state.quotes[quoteId];if(!q||q.accountId!==user.id||Date.parse(q.expiresAt)<=Date.now())throw new Error('订单报价已过期，请重新确认')
  if(q.consumed)throw new Error('该报价已经提交');if(mockAvailableStock(user,q.skuId)<q.quantity)throw new Error('商品库存不足，请重新选择数量');const p=mockProduct(q.productId),sku=p.skus.find(x=>x.id===q.skuId),coupon=q.couponId&&state.coupons.find(x=>x.id===q.couponId);if(q.couponId&&coupon?.status!=='available')throw new Error('优惠券已被使用，请重新确认')
  // Revalidate the address/member against their current account-scoped records before creating.
  const options=mockCheckoutOptions(user);if(q.address&&!options.addresses.some(x=>x.id===q.address.id&&x.version===q.address.version))throw new Error('收货地址已变化，请重新确认');if(p.requiresMember&&!options.members.some(x=>x.id===q.memberId))throw new Error('会员资料已变化')
  const id=`order-${state.next++}`,buyer=options.members.find(item=>item.id===q.memberId),order={...copy(q),id,quoteId,orderNo:`NS${Date.now()}${state.next}`,categoryId:p.categoryId,items:[{id:sku.id,skuId:sku.id,productId:p.id,title:p.title,specLabel:sku.label,unitAmount:sku.amount,quantity:q.quantity,coverUrl:p.coverUrl}],couponTitle:coupon?.title||'',memberCard:memberCard(buyer),paymentChannelLabel:'',fulfillmentType:p.fulfillmentType,status:'PENDING_PAYMENT',fulfillmentStatus:null,version:1,createdAt:stamp(),expiresAt:new Date(Date.now()+1800000).toISOString()};state.orders.push(order);q.consumed=true;if(coupon){coupon.status='reserved';coupon.orderId=id}return {order:orderView(order)}
})}
export function mockOrderAction(user,id,action,version,key){return once(user,key,`${id}:${action}:${version}`,()=>{const order=ownedOrder(user,id);if(order.version!==version)throw new Error('订单状态已变化，请刷新');if(!orderView(order).allowedActions.includes(action))throw new Error('当前订单不能执行此操作');if(action==='cancel'){order.status='CANCELLED';order.cancelledAt=stamp();releaseMockBusinessReservation(user,order);const c=mockCommerceState(user).coupons.find(x=>x.orderId===id);if(c&&c.status==='reserved'){c.status='available';delete c.orderId}}else if(action==='confirm-receipt'){order.status='COMPLETED';order.receivedAt=stamp()}else throw new Error('操作无效');order.version++;return {order:orderView(order)}})}
// TODO(API): these labels are cashier fixtures. The production cashier must use
// exactly the channels returned for the quoted order, including any risk checks.
export const mockCashierPlatform='脑商收银'
export const mockPaymentChannels=[
  {id:'alipay',label:'支付宝',kind:'WALLET',hint:''},
  {id:'wechat',label:'微信支付',kind:'WALLET',hint:''},
  {id:'unionpay',label:'银联支付',kind:'UNIONPAY',hint:'银联安全收银'},
  {id:'bank-card',label:'银行卡支付',kind:'BANK_CARD',hint:'支持储蓄卡和信用卡'},
]
export function mockPaymentChannelsFor(order){return copy(order.businessKind==='quota-purchase'?mockPaymentChannels.filter(item=>item.id==='unionpay'):mockPaymentChannels)}
export function mockPay(user,id,channel,key){return once(user,key,`pay:${id}:${channel}`,()=>{const state=mockCommerceState(user),order=ownedOrder(user,id),channels=mockPaymentChannelsFor(order);if(!channels.some(x=>x.id===channel)||!orderView(order).allowedActions.includes('pay'))throw new Error('当前订单不可支付或支付方式已失效');const existing=Object.values(state.attempts).find(x=>x.orderId===id&&x.status==='PROCESSING');if(existing)return copy(existing);const attempt={id:`attempt-${state.next++}`,orderId:id,status:'PROCESSING',channel,createdAt:stamp()};state.attempts[attempt.id]=attempt;return copy(attempt)})}
export function mockPaymentResult(user,id){
 const state=mockCommerceState(user),attempt=state.attempts[id]
 if(!attempt)throw new Error('支付记录不存在')
 const order=ownedOrder(user,attempt.orderId)
 if(attempt.status==='PROCESSING'){
  if(order.status==='CANCELLED')attempt.status='FAILED'
  else if(order.status==='PENDING_PAYMENT'){
   attempt.status='SUCCEEDED'
   const automatic=order.fulfillmentType==='BUSINESS_ENTITLEMENT'
   order.status=automatic?'COMPLETED':'PAID'
   order.fulfillmentStatus=automatic?'DELIVERED':order.fulfillmentType==='PHYSICAL'?'WAIT_SHIP':order.fulfillmentType==='COSTORE_APPLICATION'?'PENDING_REVIEW':'WAIT_DELIVERY'
   order.paidAt=stamp();order.paymentChannel=attempt.channel
   order.paymentChannelLabel=(mockPaymentChannels.find(item=>item.id===attempt.channel)||{}).label||''
   order.version++;applyMockBusinessPayment(user,order);applyMockCostorePayment(user,order)
   const coupon=state.coupons.find(x=>x.orderId===order.id);if(coupon)coupon.status='used'
  }
 }
 saveMockCommerce(user);return {...copy(attempt),order:orderView(order)}
}
const columnChapters=['chapter-1','chapter-2','chapter-3','chapter-4','chapter-5'].map(id=>({id,title:'第1章：散文（形散神聚，条分缕析）',type:'article',typeLabel:'视频',progressLabel:'暂无学习记录'}))
export function mockCostorePaymentOrder(user,application){
 const state=mockCommerceState(user),id=`order-${state.next++}`
 state.orders.push({id,orderNo:`NS${Date.now()}${state.next}`,accountId:user.id,applicationId:application.id,businessKind:'costore',categoryId:'costore',store:copy(application.store),items:[{id:'costore',skuId:'costore',title:application.title,quantity:1,unitAmount:application.payableAmount}],fulfillmentType:'COSTORE_APPLICATION',goodsAmount:application.payableAmount,discountAmount:0,payableAmount:application.payableAmount,status:'PENDING_PAYMENT',version:1,createdAt:stamp(),expiresAt:new Date(Date.now()+1800000).toISOString()})
 saveMockCommerce(user);return id
}
function applyMockCostorePayment(user,order){
 if(order.businessKind!=='costore')return
 const application=mockExclusiveState(user).applications.find(item=>item.id===order.applicationId)
 if(!application)throw new Error('合店申请不存在')
 application.paymentStatus='PAID';application.applicationStatus='PENDING_REVIEW'
 saveMockExclusiveState(user)
 const ctx=mockBusinessContexts(user).find(item=>item.module==='agency'&&item.agencyType==='STORE'&&item.storeId===application.store.id)
 if(ctx){const state=mockBusinessState(user,ctx);if(!state.approvals.some(item=>item.id===application.id))state.approvals.unshift({id:application.id,type:'COSTORE',bucket:'costore',title:application.title,applicantName:user.name,paymentStatus:'PAID',orderId:order.id,feeAmount:order.payableAmount,status:'PENDING',version:1});saveMockBusinessState(user,ctx)}
}
export function mockColumn(user,productId){const p=mockProduct(productId);if(p.categoryId!=='column')throw new Error('该商品不是专栏');const identity={accountId:user.id,memberId:'account-column'};return {product:p,unlocked:!!mockCommerceState(user).grants[productId],coverBadge:'专栏',coverIndex:1,coverCount:5,chapters:copy(columnChapters).map(chapter=>{const progress=mockChapterProgress(identity,`column:${productId}`,chapter.id);return {...chapter,typeLabel:chapter.type==='video'?'视频':'图文',progress,progressLabel:progress?`已学${progress.percent}%`:'暂无学习记录'}})}}
export function mockActivateColumn(user,id,code,key){return once(user,key,`activate:${id}:${code}`,()=>{mockColumn(user,id);if(code!=='NS-COLUMN-2026')throw new Error('激活码不正确或已失效');const state=mockCommerceState(user);if(!state.orders.some(o=>['PAID','COMPLETED'].includes(o.status)&&o.items.some(i=>i.productId===id)))throw new Error('请先购买该专栏');state.grants[id]=true;return {unlocked:true}})}
export function mockBusinessPaymentOrder(user,context,kind,quote){const state=mockCommerceState(user),id=`order-${state.next++}`,title=kind==='quota-purchase'?'VIP名额':kind==='upgrade'?'合伙人升级服务费':'年度合伙权益',order={id,orderNo:`NS${Date.now()}${state.next}`,accountId:user.id,contextId:context.id,categoryId:'business',businessKind:kind,businessQuantity:quote.quantity,businessUpgrade:quote.upgrade || null,items:[{id:kind,skuId:kind,title,specLabel:'标准',quantity:quote.quantity||1,unitAmount:kind==='quota-purchase'?quote.unitAmount:quote.amount,coverUrl:'/static/partner/icon-membership-dividend.png'}],store:{name:'脑商合伙中心',number:'',address:''},fulfillmentType:'BUSINESS_ENTITLEMENT',goodsAmount:quote.amount,discountAmount:0,payableAmount:quote.amount,status:'PENDING_PAYMENT',fulfillmentStatus:null,version:1,createdAt:stamp(),expiresAt:new Date(Date.now()+1800000).toISOString()};state.orders.push(order);saveMockCommerce(user);return id}
export function applyMockBusinessPayment(user,order){if(order.categoryId!=='business')return;const context=mockBusinessContexts(user).find(x=>x.id===order.contextId);if(!context)throw new Error('付款身份已失效');const state=mockBusinessState(user,context),key=`payment:${order.id}`;if(state.operations.has(key))return;if(order.businessKind==='quota-purchase'){state.quota+=order.businessQuantity;state.quotaLedger.unshift({id:key,title:'购买VIP名额',quantity:order.businessQuantity,createdAt:stamp()})}else if(order.businessKind==='upgrade'){const upgrade=order.businessUpgrade,person=state.people.find(x=>x.id===upgrade?.personId);if(!person || state.pendingUpgrades?.[person.id]!==order.id)throw new Error('升级订单状态异常');person.levelLabel=upgrade.targetLevel;person.version++;delete state.pendingUpgrades[person.id];if(state.activityReservations)delete state.activityReservations[order.id];state.quotaLedger.unshift({id:key,title:'开通/升级',targetName:person.name,quantity:-upgrade.standard,activityQuantity:-upgrade.activity,createdAt:stamp()})}else state.annualValidUntil=new Date(Date.now()+365*86400000).toISOString();state.version++;state.operations.set(key,{result:{status:'PAID'}});saveMockBusinessState(user,context)}

// MOCK-ONLY: unpaid activity-quota upgrades reserve quota but never grant a level.
function releaseMockBusinessReservation(user,order){
 if(order.businessKind==='costore'){
  const application=mockExclusiveState(user).applications.find(item=>item.id===order.applicationId)
  if(application&&application.paymentStatus!=='PAID'){application.applicationStatus='CANCELLED';application.paymentStatus='CANCELLED';saveMockExclusiveState(user)}
 }
 if(order.businessKind!=='upgrade' || !order.businessUpgrade || order.businessReservationReleased)return
 const context=mockBusinessContexts(user).find(x=>x.id===order.contextId);if(!context)throw new Error('付款身份已失效')
 const state=mockBusinessState(user,context),upgrade=order.businessUpgrade
 if(state.pendingUpgrades?.[upgrade.personId]===order.id){state.quota+=upgrade.standard;state.activityQuota=(state.activityQuota ?? 0)+upgrade.activity;delete state.pendingUpgrades[upgrade.personId];if(state.activityReservations)delete state.activityReservations[order.id];state.version++;saveMockBusinessState(user,context)}
 order.businessReservationReleased=true
}
