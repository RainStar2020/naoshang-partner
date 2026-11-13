import {config} from '../config'
import {withBusinessContext} from './business'
import {getSession,request} from './api'
import {getCachedBoundStore,loadMeContext} from './me-context'
import * as mock from './mock/commerce'
import { storeDisplayAddress, storePhotoUrl } from '../features/store-display'

const STORE_BINDING_REQUIRED_MESSAGE = '请联系邀请人为您绑定门店后再下单'

function toCheckoutStore(store){
  if(!store||typeof store!=='object'||store.id==null||store.id==='')return null
  const manager=store.manager&&typeof store.manager==='object'?store.manager:null
  return {
    id:String(store.id),
    name:String(store.name||store.storeName||''),
    number:String(store.number||store.storeNo||store.storeCode||''),
    address:String(storeDisplayAddress(store)||store.address||''),
    managerName:String(store.managerName||manager?.name||''),
    phone:String(store.phone||store.managerPhone||manager?.phone||''),
    coverUrl:String(storePhotoUrl(store)||store.coverUrl||store.imageUrl||''),
  }
}

/** Bound store comes from personal center GET /me.store — never from checkout store lists. */
function lockCheckoutToBoundStore(options,profileStore){
  const boundStore=toCheckoutStore(profileStore)
  if(!boundStore?.id){
    return {
      ...options,
      stores:[],
      defaultStoreId:null,
      deliveryLocked:true,
      storeBound:false,
      storeBindingRequired:true,
      storeBindingMessage:STORE_BINDING_REQUIRED_MESSAGE,
    }
  }
  // Headquarters delivery keeps the locked HQ fulfillment store; still requires a bound store.
  if(options.deliveryLocked){
    return {...options,deliveryLocked:true,storeBound:true,storeBindingRequired:false,storeBindingMessage:''}
  }
  return {
    ...options,
    stores:[boundStore],
    defaultStoreId:boundStore.id,
    deliveryLocked:true,
    storeBound:true,
    storeBindingRequired:false,
    storeBindingMessage:'',
  }
}

async function resolveBoundStoreForCheckout(){
  try{
    let me=await loadMeContext()
    // If login-time cache has no store, refresh once in case binding completed later.
    if(!me?.store)me=await loadMeContext({force:true})
    return me?.store||null
  }catch{
    return getCachedBoundStore()
  }
}
// Money fields are yuan end-to-end (API + UI). Do not convert to fen for display.
export function parseCommerceTime(value){if(typeof value==='number'&&Number.isFinite(value))return value;if(typeof value==='string'&&value.trim()){const parsed=Date.parse(value);return Number.isFinite(parsed)?parsed:NaN}return NaN}
function isMoney(value){return Number.isFinite(Number(value))&&Number(value)>=0}
function pickRemoteMoney(...values){for(const value of values){if(typeof value==='number'&&Number.isFinite(value))return value;if(typeof value==='string'&&value.trim()!==''&&Number.isFinite(Number(value)))return Number(value)}return null}
function normalizeRemoteQuote(result){
  if(!result||typeof result!=='object')return result
  const next={...result}
  const goods=pickRemoteMoney(next.goodsAmount,next.goods_amount,next.productAmount)
  const discount=pickRemoteMoney(next.discountAmount,next.discount_amount,next.couponAmount)
  const payable=pickRemoteMoney(next.payableAmount,next.payable_amount,next.payAmount,next.amount)
  if(goods!=null){if(goods<0)throw new Error('金额数据异常');next.goodsAmount=goods}
  if(discount!=null){if(discount<0)throw new Error('金额数据异常');next.discountAmount=discount}
  else if(next.discountAmount==null)next.discountAmount=0
  if(payable!=null){if(payable<0)throw new Error('金额数据异常');next.payableAmount=payable}
  if(next.product&&typeof next.product==='object'){
    next.product={...next.product}
    for(const key of ['unitPrice','listUnitPrice','memberUnitPrice','channelUnitPrice']){
      if(next.product[key]==null)continue
      const amount=pickRemoteMoney(next.product[key])
      if(amount==null||amount<0)throw new Error('金额数据异常')
      next.product[key]=amount
    }
  }
  return next
}
function normalizeRemoteOrderStatus(status){const key=String(status||'').trim().toUpperCase().replace(/-/g,'_');return ({PAID:'PAID',PENDING_PAYMENT:'PENDING_PAYMENT',PENDING:'PENDING_PAYMENT',UNPAID:'PENDING_PAYMENT',CANCELLED:'CANCELLED',CANCELED:'CANCELLED',COMPLETED:'COMPLETED'})[key]||String(status||'').trim()}
function deriveRemoteOrderActions(order){if(Array.isArray(order.allowedActions))return order.allowedActions.map(String);const status=normalizeRemoteOrderStatus(order.status);const fulfillment=order.fulfillmentStatus||order.delivery?.fulfillmentStatus||null;if(status==='PENDING_PAYMENT')return ['pay','cancel'];if(status==='PAID'&&fulfillment==='SHIPPED')return ['confirm-receipt'];return []}
function synthesizeRemoteOrderItems(order){if(Array.isArray(order.items)&&order.items.length)return order.items;const quantity=Math.max(1,Number(order.skuQty||order.qty||order.quantity||1)||1);const skuId=String(order.skuId||order.productKey||order.product?.key||order.productId||'item');const productId=String(order.productId||order.productKey||order.product?.id||order.product?.key||skuId);const title=String(order.productName||order.product?.name||order.title||productId);const unitYuan=pickRemoteMoney(order.unitPrice,order.unitAmount,order.paid!=null?order.paid/quantity:null,order.payableAmount!=null?order.payableAmount/quantity:null,order.amount!=null?order.amount/quantity:null);return [{id:String(order.itemId||skuId),skuId,productId,title,specLabel:String(order.skuLabel||order.specLabel||''),quantity,coverUrl:String(order.coverUrl||order.product?.coverUrl||''),unitAmount:unitYuan}]}
function unwrapRemoteOrder(result){if(!result||typeof result!=='object')return null;if(result.order&&typeof result.order==='object')return result.order;const looksFlat=result.id||result.orderId;const hasOrderShape=result.status!=null||result.paid!=null||result.payableAmount!=null||result.skuId!=null||result.productKey!=null||Array.isArray(result.items);return looksFlat&&hasOrderShape?result:null}
function normalizeRemoteOrder(result){const source=unwrapRemoteOrder(result);if(!source)throw new Error('订单数据格式异常');const id=source.id||result.orderId||result.id||source.orderId;if(id==null||id==='')throw new Error('订单数据格式异常');let order={...source,id:String(id)};if(!order.orderNo)order.orderNo=String(source.orderNo||source.order_no||id);const quantity=Math.max(1,Number(order.skuQty||order.qty||order.quantity||1)||1);const payableYuan=pickRemoteMoney(order.payableAmount,order.paid,order.amount,order.actual_paid,order.total_payable,order.totalPayable);const goodsYuan=pickRemoteMoney(order.goodsAmount,order.goods_amount,order.unitPrice!=null?Number(order.unitPrice)*quantity:null,payableYuan);const discountYuan=pickRemoteMoney(order.discountAmount,order.discount_amount);if(payableYuan!=null)order.payableAmount=payableYuan;if(goodsYuan!=null)order.goodsAmount=goodsYuan;order.discountAmount=discountYuan!=null?discountYuan:pickRemoteMoney(order.discountAmount,0)||0;order.status=normalizeRemoteOrderStatus(order.status||order.delivery?.pay?.status);if(!order.expiresAt){const exp=order.payExpireAt||order.delivery?.pay?.payExpireAt||order.expires_at;if(exp!=null)order.expiresAt=exp}if(!order.fulfillmentNotice)order.fulfillmentNotice=order.tip_text||order.delivery?.tipText||order.fulfillmentNotice||'';if(!order.statusLabel)order.statusLabel=source.statusLabel||'';order.items=synthesizeRemoteOrderItems(order);if(order.store&&typeof order.store==='object')order.store=toCheckoutStore(order.store)||order.store;order.allowedActions=deriveRemoteOrderActions(order);if(Array.isArray(order.items))order.items=order.items.map(item=>({...item,unitAmount:pickRemoteMoney(item.unitAmount)}));if(!order.id||!Array.isArray(order.items)||!order.items.length||!Array.isArray(order.allowedActions)||!isMoney(order.payableAmount))throw new Error('订单数据格式异常');return {...result,order}}
export function normalizeRemoteOrderMoney(order){return normalizeRemoteOrder({order}).order}
async function scoped(operation){const s=getSession();if(!s?.user?.id)throw new Error('请先登录');const account={...s.user},token=s.token;const result=await operation(account);if(getSession()?.token!==token||getSession()?.user?.id!==account.id)throw new Error('登录状态已变化，请重新加载');return result}
function list(value){
  if(value==null)return {items:[],hasMore:false,nextCursor:null}
  if(!Array.isArray(value.items)){
    if(value.items==null)return {...value,items:[],hasMore:false,nextCursor:null}
    throw new Error('列表数据格式异常')
  }
  if(value.hasMore==null)return {...value,hasMore:false,nextCursor:null}
  if(typeof value.hasMore!=='boolean'||(value.hasMore&&!value.nextCursor))throw new Error('列表数据格式异常')
  return value
}
function orderResult(result,remote=false){const normalized=remote?normalizeRemoteOrder(result):result;if(!normalized?.order?.id||!Array.isArray(normalized.order.items)||!Array.isArray(normalized.order.allowedActions)||!isMoney(normalized.order.payableAmount))throw new Error('订单数据格式异常');return normalized}
export function getCatalog(){return scoped(async()=>{const result=config.useMock?mock.mockCatalog():await request('/catalog');if(!Array.isArray(result.categories)||!Array.isArray(result.items))throw new Error('商品目录格式异常');return result})}
export function getProduct(id){return scoped(async user=>{if(!id)throw new Error('缺少商品编号');const result=config.useMock?mock.mockProductAvailability(user,id):await request(`/products/${encodeURIComponent(id)}`);if(result?.id!==id||!Array.isArray(result.skus))throw new Error('商品数据格式异常');return result})}
function normalizeCheckoutCoupon(coupon){
  if(!coupon||typeof coupon!=='object')return coupon
  const amount=pickRemoteMoney(coupon.discountAmount,coupon.amount)
  const thresholdText=coupon.thresholdText||coupon.thresholdLabel||(Number.isFinite(Number(coupon.minAmount))?(Number(coupon.minAmount)?`满${Number(coupon.minAmount)}可用`:'无门槛'):'')
  return {...coupon,amount,discountAmount:amount,thresholdText,thresholdLabel:coupon.thresholdLabel||thresholdText}
}
export function getCheckoutOptions(productId){return scoped(async user=>{
  const result=config.useMock?mock.mockCheckoutOptions(user,productId):await request('/checkout/options',{data:{productId}})
  if(!['stores','members','addresses','coupons'].every(key=>Array.isArray(result[key])))throw new Error('结算选项数据异常')
  const boundStore=await resolveBoundStoreForCheckout()
  return lockCheckoutToBoundStore({...result,coupons:result.coupons.map(normalizeCheckoutCoupon)},boundStore)
})}
export {STORE_BINDING_REQUIRED_MESSAGE}
function checkoutQuotePayload(draft){
  const quantity=Number(draft.quantity)
  if(!Number.isInteger(quantity)||quantity<1||quantity>99)throw new Error('请输入1—99的整数数量')
  const payload={
    productId:String(draft.productId||''),
    skuId:String(draft.skuId||''),
    quantity,
    storeId:String(draft.storeId||''),
    remark:String(draft.remark||'').trim(),
  }
  if(draft.addressId)payload.addressId=String(draft.addressId)
  if(draft.memberId)payload.memberId=String(draft.memberId)
  if(draft.couponId)payload.couponId=String(draft.couponId)
  if(!payload.productId||!payload.skuId||!payload.storeId)throw new Error('请完善订单信息')
  return payload
}
export function quoteCheckout(draft){return scoped(async user=>{
  const payload=checkoutQuotePayload(draft)
  const raw=config.useMock?mock.mockCheckoutQuote(user,payload):await request('/checkout/quotes',{method:'POST',data:payload})
  const result=config.useMock?raw:normalizeRemoteQuote(raw)
  if(!result?.id||!isMoney(result.payableAmount)||!Number.isFinite(parseCommerceTime(result.expiresAt))||!Number.isFinite(parseCommerceTime(result.serverTime)))throw new Error('报价数据异常')
  if(result.goodsAmount==null)result.goodsAmount=pickRemoteMoney(result.goodsAmount,result.product?.unitPrice!=null?Number(result.product.unitPrice)*payload.quantity:null,result.payableAmount)
  if(result.discountAmount==null)result.discountAmount=0
  return result
})}
export function createCheckoutOrder(quoteId,idempotencyKey,options={}){return scoped(async user=>{if(!quoteId||!idempotencyKey)throw new Error('请重新确认订单');const data={quoteId,idempotencyKey,payLater:true,...(options.storeId?{storeId:String(options.storeId)}:{}),...(options.deliveryType?{deliveryType:String(options.deliveryType)}:{})};return orderResult(config.useMock?mock.mockCreateOrder(user,quoteId,idempotencyKey):await request('/orders',{method:'POST',data}),!config.useMock)})}
export function getCommerceOrders(options={}){return scoped(async user=>{const result=list(config.useMock?mock.mockOrders(user,options):await request('/orders',{data:options}));if(config.useMock||!Array.isArray(result.items))return result;return {...result,items:result.items.map(item=>{const wrapped=normalizeRemoteOrder({order:item});return wrapped.order})}})}
export function getCommerceOrder(id,contextId){const read=async user=>{const result=orderResult(config.useMock?mock.mockOrder(user,id):await request(`/orders/${encodeURIComponent(id)}`,{data:contextId?{contextId}:undefined}),!config.useMock);return contextId?{...result,order:{...result.order,allowedActions:[]}}:result};return contextId?withBusinessContext(contextId,'agency:store-management',read):scoped(read)}
export function changeOrder(id,action,version,idempotencyKey){return scoped(async user=>{if(!['cancel','confirm-receipt'].includes(action)||!idempotencyKey)throw new Error('订单操作无效');return orderResult(config.useMock?mock.mockOrderAction(user,id,action,version,idempotencyKey):await request(`/orders/${encodeURIComponent(id)}/${action === 'cancel' ? 'cancellations' : 'receipts'}`,{method:'POST',data:{version,idempotencyKey}}),!config.useMock)})}
export function getPaymentChannels(id){return scoped(async user=>{const result=config.useMock?{platformLabel:mock.mockCashierPlatform,items:mock.mockPaymentChannelsFor(mock.mockOrder(user,id).order)}:await request(`/orders/${encodeURIComponent(id)}/payment-channels`);if(!Array.isArray(result?.items)||!result.items.length||result.items.some(item=>!item?.id||!item?.label))throw new Error('支付方式格式异常');return {platformLabel:typeof result.platformLabel==='string'?result.platformLabel:'',items:result.items.map(item=>({id:String(item.id),label:String(item.label),kind:item.kind?String(item.kind):'',hint:typeof item.hint==='string'?item.hint:''}))}})}
export function startPayment(id,channel,idempotencyKey){return scoped(async user=>{if(!idempotencyKey)throw new Error('缺少支付请求编号');const token=getSession()?.token;const previous=getPendingPayment(id);if(previous?.attemptId)return {id:previous.attemptId,status:'PROCESSING',channel:previous.channel};if(previous&&previous.channel!==channel)throw new Error('上一笔支付结果待确认，请使用原支付方式重试');const intent=previous||{channel,key:idempotencyKey};const wireChannel=intent.channel==='bank-card'?'bank_card':intent.channel;uni.setStorageSync(paymentStateKey(id),intent);let attempt;try{attempt=config.useMock?mock.mockPay(user,id,intent.channel,intent.key):await request('/payments/attempts',{method:'POST',data:{orderId:id,channel:wireChannel,idempotencyKey:intent.key}})}catch(e){if(config.useMock)uni.removeStorageSync(paymentStateKey(id));throw e}if(getSession()?.user?.id!==user.id||getSession()?.token!==token)throw new Error('账号已变化');if(!attempt?.id)throw new Error('支付请求结果未知，请重试原请求');uni.setStorageSync(paymentStateKey(id),{...intent,attemptId:attempt.id});uni.setStorageSync(`naoshang-payment-attempt:${user.id}:${attempt.id}`,id);return attempt})}
export function queryPayment(id){return scoped(async user=>{const token=getSession()?.token;const result=config.useMock?mock.mockPaymentResult(user,id):await request(`/payments/attempts/${encodeURIComponent(id)}`);if(result?.id!==id||!['PROCESSING','SUCCEEDED','FAILED','CANCELLED'].includes(result.status))throw new Error('支付结果未知，请查询订单');const orderId=result.order?.id||uni.getStorageSync(`naoshang-payment-attempt:${user.id}:${id}`);if(result.status!=='PROCESSING'&&orderId&&getSession()?.user?.id===user.id&&getSession()?.token===token){uni.removeStorageSync(paymentStateKey(orderId));uni.removeStorageSync(`naoshang-payment-attempt:${user.id}:${id}`)}return result})}
export function getColumn(id){return scoped(async user=>config.useMock?mock.mockColumn(user,id):request(`/columns/${encodeURIComponent(id)}`))}
export function activateColumn(id,code,idempotencyKey){return scoped(async user=>config.useMock?mock.mockActivateColumn(user,id,String(code).trim(),idempotencyKey):request('/activations',{method:'POST',data:{targetType:'column',targetId:id,code,idempotencyKey}}))}
export const commerceRequestKey=()=>`request-${Date.now()}-${Math.random().toString(36).slice(2)}`
// v3 drops fen-era pending quotes. Draft equality rejects stale store/member/coupon reuse.
const checkoutIntentKey=draft=>`naoshang-checkout-intent:v3:${getSession()?.user?.id}:${draft.productId}:${draft.skuId}:${draft.quantity}`
function sameCheckoutDraft(left,right){
  if(!left||!right)return false
  return ['productId','skuId','quantity','storeId','memberId','couponId','addressId'].every(key=>String(left[key]??'')===String(right[key]??''))
    && String(left.remark||'').trim()===String(right.remark||'').trim()
}
export function getPendingCheckout(draft){
  const intent=uni.getStorageSync(checkoutIntentKey(draft))||null
  if(!intent?.quote?.id||!intent?.key)return null
  if(draft.storeId||draft.memberId||draft.couponId||draft.addressId){
    if(!sameCheckoutDraft(intent.draft,draft))return null
  }
  return intent
}
export function rememberPendingCheckout(draft,quote,key){const intent={draft:{...draft},quote,key};uni.setStorageSync(checkoutIntentKey(draft),intent);return intent}
export function clearPendingCheckout(draft){uni.removeStorageSync(checkoutIntentKey(draft))}
const paymentStateKey=id=>`naoshang-payment-intent:${getSession()?.user?.id}:${id}`
export function getPendingPayment(id){return uni.getStorageSync(paymentStateKey(id))||null}
export function isPlaceholderOrderId(orderId){
  const id=String(orderId||'').trim()
  if(!id)return true
  return /^(no_such_order|null|undefined)([_-]|$)/i.test(id)
}
/** Display-only guard: do not treat unverifiable SUCCEEDED payments as settled. */
export function shouldDisplayPaymentSuccess(result,requestedOrderId,orderVerified){
  if(result?.status!=='SUCCEEDED')return false
  const resultOrderId=String(result.orderId||result.order?.id||'').trim()
  if(isPlaceholderOrderId(resultOrderId)||isPlaceholderOrderId(requestedOrderId))return false
  if(resultOrderId&&requestedOrderId&&resultOrderId!==String(requestedOrderId).trim())return false
  const released=result.releasedCommissions
  const zeroReleased=released===0||released==='0'
  if(zeroReleased&&!orderVerified)return false
  if(!orderVerified&&(isPlaceholderOrderId(resultOrderId)||!resultOrderId))return false
  return true
}


// Proposed business rejection contract: these responses guarantee no new order was created.
export const isCheckoutRejection=error=>[400,422].includes(error?.statusCode)||(error?.statusCode===409&&['QUOTE_EXPIRED','ADDRESS_INVALID','OUT_OF_STOCK','COUPON_UNAVAILABLE'].includes(error?.code))
