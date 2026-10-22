import {config} from '../config'
import {request} from './api'
import {withBusinessContext} from './business'
import {mockOperationOptions,mockOperationPreview,mockOperationCommit} from './mock/business-operations'
import {parseBusinessAmount} from '../features/business/format'
const known=['quota-transfer','quota-purchase','upgrade','entitlement','bind-store','withdraw','allocation']
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
    const payload={planId:input.planId,targetAccountId:input.targetAccountId,quantity:['quota-transfer','quota-purchase'].includes(kind)?Number(input.quantity):undefined,targetLevel:input.targetLevel,storeId:input.storeId,accountType:input.accountType,payeeToken:input.payeeToken,amount:kind==='withdraw'?parseAmount(input.amount):undefined,targetId:input.targetId}
    if(!config.useMock){const result=await request(quoteEndpoint(kind,entryId),{method:'POST',data:{...payload,contextId:context.id,entryId}});validateQuote(result);return result}
    return mockOperationPreview(kind,account,context,input,entryId,payload)
  })
}
function validateQuote(quote){if(!quote?.id||!Array.isArray(quote.details)||!Number.isFinite(quote.expiresAt)||!Number.isFinite(quote.serverTime))throw new Error('经营预览数据异常')}
export function commitBusinessOperation(kind,contextId,quoteId,idempotencyKey,entryId=''){
  guardKind(kind)
  return withBusinessContext(contextId,context=>capability(kind,context),async(account,context)=>{
    scopeKind(kind,context);if(!quoteId||!idempotencyKey)throw new Error('请先生成有效预览')
    if(!config.useMock){const endpoint={withdraw:'/wallet/withdrawals',allocation:`/income/entries/${encodeURIComponent(entryId)}/allocations`,'quota-transfer':'/partner/quota-transfers','quota-purchase':'/partner/quota-orders',upgrade:'/partner/upgrades',entitlement:'/partner/entitlement-orders','bind-store':'/partner/store-bindings'}[kind];return request(endpoint,{method:'POST',data:{contextId:context.id,quoteId,idempotencyKey}})}
    return mockOperationCommit(kind,account,context,quoteId,idempotencyKey,entryId)
  })
}
