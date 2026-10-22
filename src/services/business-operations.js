import {config} from '../config'
import {request} from './api'
import {withBusinessContext,businessAccount,checkBusinessAccount} from './business'
import {mockOperationOptions,mockOperationPreview,mockOperationCommit} from './mock/business-operations'
import {parseBusinessAmount} from '../features/business/format'
import {mockBusinessState,saveMockBusinessState} from './mock/business'
const known=['quota-transfer','quota-purchase','upgrade','entitlement','bind-store','withdraw','allocation']
const trackedKinds=['quota-transfer','quota-purchase','upgrade','bind-store','withdraw']
const intentKey=(accountId,kind,contextId)=>`naoshang-business-intent:${JSON.stringify([accountId,contextId,kind])}`
export function getBusinessOperationIntent(kind,contextId){return uni.getStorageSync(intentKey(businessAccount().id,kind,contextId)) || null}
export function rememberBusinessOperationIntent(kind,contextId,quote,idempotencyKey,draft){
 const account=businessAccount(),key=intentKey(account.id,kind,contextId),previous=uni.getStorageSync(key)
 if(previous?.dispatched && (previous.quoteId!==quote.id || previous.idempotencyKey!==idempotencyKey))throw new Error('上一笔操作结果待确认，请重试原操作')
 uni.setStorageSync(key,JSON.parse(JSON.stringify({quoteId:quote.id,idempotencyKey,quote,draft,dispatched:previous?.dispatched || false})))
}
const definitiveRejection=error=>[400,403,404,409,422].includes(error.statusCode)&&['QUOTE_EXPIRED','INVALID_QUOTE','VALIDATION_ERROR','FORBIDDEN','INSUFFICIENT_BALANCE','VERSION_CONFLICT'].includes(error.code)
const capability=(kind,context)=>kind==='withdraw'?'wallet:withdraw':kind==='allocation'?`${context.module}:income`:`wholesale:${kind}`
const guardKind=kind=>{if(!known.includes(kind))throw new Error('未知经营操作')}
function scopeKind(kind,context){if(!['withdraw','allocation'].includes(kind)&&context.module!=='wholesale')throw new Error('当前身份不支持此操作')}
export const parseAmount=parseBusinessAmount
function quoteEndpoint(kind,entryId){return {withdraw:'/wallet/withdrawal-quotes',allocation:`/income/entries/${encodeURIComponent(entryId||'')}/allocation-quotes`,'quota-transfer':'/partner/quota-transfer-quotes','quota-purchase':'/partner/quota-purchase-quotes',upgrade:'/partner/upgrade-quotes',entitlement:'/partner/entitlement-quotes','bind-store':'/partner/store-binding-quotes'}[kind]}
function optionsEndpoint(kind,entryId){return {withdraw:'/wallet/withdrawal-options',allocation:`/income/entries/${encodeURIComponent(entryId||'')}/allocation-options`,'quota-transfer':'/partner/quota-transfer-options','quota-purchase':'/partner/quota-purchase-options',upgrade:'/partner/upgrade-options',entitlement:'/partner/entitlement-options','bind-store':'/partner/store-binding-options'}[kind]}
export function getBusinessOperationOptions(kind,contextId,entryId=''){
  guardKind(kind)
  return withBusinessContext(contextId,context=>capability(kind,context),async(account,context)=>{
    scopeKind(kind,context)
    if(!config.useMock)return request(optionsEndpoint(kind,entryId),{data:{contextId:context.id}})
    return mockOperationOptions(kind,account,context,entryId)
  })
}
export function previewBusinessOperation(kind,contextId,input,entryId=''){
  guardKind(kind)
  return withBusinessContext(contextId,context=>capability(kind,context),async(account,context)=>{
    scopeKind(kind,context)
    if(['quota-transfer','quota-purchase'].includes(kind)&&!/^[1-9]\d{0,3}$/.test(String(input.quantity)))throw new Error('请输入1—9999的整数名额')
    if(kind==='upgrade' && [input.standardQuantity,input.activityQuantity].some(value=>value!=null && (!Number.isInteger(Number(value))||Number(value)<0||Number(value)>9999)))throw new Error('使用名额须为0—9999的整数')
    const payload={planId:input.planId,targetAccountId:input.targetAccountId,quantity:['quota-transfer','quota-purchase'].includes(kind)?Number(input.quantity):undefined,targetLevel:input.targetLevel,standardQuantity:kind==='upgrade'&&input.standardQuantity!=null?Number(input.standardQuantity):undefined,activityQuantity:kind==='upgrade'&&input.activityQuantity!=null?Number(input.activityQuantity):undefined,storeId:input.storeId,accountType:input.accountType,payeeToken:input.payeeToken,amount:kind==='withdraw'?parseAmount(input.amount):undefined,targetId:input.targetId}
    if(!config.useMock){const result=await request(quoteEndpoint(kind,entryId),{method:'POST',data:{...payload,contextId:context.id,entryId}});validateQuote(result);return result}
    return mockOperationPreview(kind,account,context,input,entryId,payload)
  })
}
// TODO(API): tokenize beneficiary bank details separately; quotes/records carry
// only the server token and masked bank metadata, never raw card numbers.
export function registerBusinessPayee(contextId,input){return withBusinessContext(contextId,'wallet:withdraw',async(account,context)=>{
 const name=String(input.name||'').trim(),bankName=String(input.bankName||'').trim(),bankNumber=String(input.bankNumber||'').replaceAll(' ','')
 if(!['PERSONAL','COMPANY'].includes(input.accountType)||!name||name.length>60||!bankName||bankName.length>60||!/^\d{16,19}$/.test(bankNumber))throw new Error('请填写账户姓名、银行名称和16—19位银行卡号')
 if(!config.useMock){const result=await request('/wallet/payees',{method:'POST',data:{contextId,accountType:input.accountType,name,bankName,bankNumber}});if(!result?.payeeToken)throw new Error('未获取到收款账户，请重试');return result}
 const state=mockBusinessState(account,context);state.payees=state.payees||{};const maskedBankNumber=`**** **** **** ${bankNumber.slice(-4)}`,fingerprint=JSON.stringify([input.accountType,name,bankName,maskedBankNumber]),old=Object.values(state.payees).find(x=>x.fingerprint===fingerprint)
 if(old)return {payeeToken:old.payeeToken}
 const payeeToken=`mock-payee-${Object.keys(state.payees).length+1}`;state.payees[payeeToken]={payeeToken,accountType:input.accountType,name,bankName,maskedBankNumber,fingerprint};saveMockBusinessState(account,context);return {payeeToken}
})}
function validateQuote(quote){if(!quote?.id||!Array.isArray(quote.details)||!Number.isFinite(quote.expiresAt)||!Number.isFinite(quote.serverTime))throw new Error('经营预览数据异常')}
export function commitBusinessOperation(kind,contextId,quoteId,idempotencyKey,entryId=''){
  guardKind(kind)
  return withBusinessContext(contextId,context=>capability(kind,context),async(account,context)=>{
    scopeKind(kind,context);if(!quoteId||!idempotencyKey)throw new Error('请先生成有效预览')
    const tracked=trackedKinds.includes(kind),storageKey=intentKey(account.id,kind,contextId),previous=tracked?uni.getStorageSync(storageKey):null
    if(previous?.dispatched && (previous.quoteId!==quoteId || previous.idempotencyKey!==idempotencyKey))throw new Error('上一笔操作结果待确认，请重试原操作')
    if(tracked)uni.setStorageSync(storageKey,{...previous,quoteId,idempotencyKey,dispatched:true})
    try{
      let result
      if(!config.useMock){const endpoint={withdraw:'/wallet/withdrawals',allocation:`/income/entries/${encodeURIComponent(entryId)}/allocations`,'quota-transfer':'/partner/quota-transfers','quota-purchase':'/partner/quota-orders',upgrade:'/partner/upgrades',entitlement:'/partner/entitlement-orders','bind-store':'/partner/store-bindings'}[kind];result=await request(endpoint,{method:'POST',data:{contextId:context.id,quoteId,idempotencyKey}})}
      else result=mockOperationCommit(kind,account,context,quoteId,idempotencyKey,entryId)
      checkBusinessAccount(account)
      if(!result || typeof result!=='object' || !['PENDING_PAYMENT','PENDING_REVIEW','PENDING_SETTLEMENT','DEMO_APPLIED','APPLIED','SUCCEEDED','COMPLETED','PAID'].includes(result.status))throw new Error('操作结果待确认，请重试原操作')
      const validId=value=>typeof value==='string' && value.trim().length>0
      if(result.status==='PENDING_PAYMENT'?!validId(result.orderId):![result.operationId,result.id,result.withdrawalId].some(validId))throw new Error('操作回执不完整，请重试原操作')
      if(tracked)uni.removeStorageSync(storageKey)
      return result
    }catch(error){if(tracked && (config.useMock || definitiveRejection(error))){checkBusinessAccount(account);uni.removeStorageSync(storageKey)}throw error}
  })
}
