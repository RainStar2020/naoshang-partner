import {config} from '../config'
import {request} from './api'
import {withBusinessContext,businessAccount,checkBusinessAccount,clearAgencyIncomeCache} from './business'
import {mockOperationOptions,mockOperationPreview,mockOperationCommit} from './mock/business-operations'
import {parseBusinessAmount} from '../features/business/format'
import {buildWholesaleUpgradePlans,wholesaleLevelDisplay,wholesaleLadderEntry} from '../features/business/account-rank'
import {mockBusinessState,saveMockBusinessState} from './mock/business'
import { validAllocationQuote, allocationKind } from './contracts/v3'
import { buildQuotaTransferPayload } from '../features/business/quota-transfer'
const known=['quota-transfer','quota-purchase','upgrade','entitlement','bind-store','withdraw','allocation']
const trackedKinds=['quota-transfer','quota-purchase','upgrade','bind-store','withdraw']
const intentKey=(accountId,kind,contextId,targetAccountId='')=>`naoshang-business-intent:${JSON.stringify([accountId,contextId,kind,kind==='upgrade'?String(targetAccountId||'').trim():''])}`
export function getBusinessOperationIntent(kind,contextId,targetAccountId=''){return uni.getStorageSync(intentKey(businessAccount().id,kind,contextId,targetAccountId)) || null}
export function rememberBusinessOperationIntent(kind,contextId,quote,idempotencyKey,draft){
 const account=businessAccount(),key=intentKey(account.id,kind,contextId,draft?.targetAccountId),previous=uni.getStorageSync(key)
 if(kind==='quota-transfer'){
  if(previous?.dispatched && previous.idempotencyKey!==idempotencyKey)throw new Error('上一笔操作待确认，请勿重复提交')
  uni.setStorageSync(key,JSON.parse(JSON.stringify({idempotencyKey,draft,dispatched:previous?.dispatched || false})))
  return
 }
 if(previous?.dispatched && (previous.quoteId!==quote.id || previous.idempotencyKey!==idempotencyKey))throw new Error('上一笔操作待确认，请勿重复提交')
 uni.setStorageSync(key,JSON.parse(JSON.stringify({quoteId:quote.id,idempotencyKey,quote,draft,dispatched:previous?.dispatched || false})))
}
const definitiveRejection=error=>[400,403,404,409,422].includes(error.statusCode)&&['QUOTE_EXPIRED','INVALID_QUOTE','VALIDATION_ERROR','FORBIDDEN','INSUFFICIENT_BALANCE','VERSION_CONFLICT'].includes(error.code)
// Points redeem (withdraw) is open to any valid business context; no wallet:* gate.
const capability=(kind,context)=>kind==='withdraw'?null:kind==='allocation'?`${context.module}:income`:`wholesale:${kind}`
const guardKind=kind=>{if(!known.includes(kind))throw new Error('当前功能暂不可用，请返回后重试')}
function scopeKind(kind,context){if(!['withdraw','allocation'].includes(kind)&&context.module!=='wholesale')throw new Error('当前身份不支持此操作')}
export const parseAmount=parseBusinessAmount
function quoteEndpoint(kind,entryId){return {withdraw:'/wallet/withdrawal-quotes',allocation:`/income/entries/${encodeURIComponent(entryId||'')}/allocation-quotes`,'quota-transfer':'/partner/quota-transfer-quotes','quota-purchase':'/partner/quota-purchase-quotes',upgrade:'/partner/upgrade-quotes',entitlement:'/partner/entitlement-quotes','bind-store':'/partner/store-binding-quotes'}[kind]}
function optionsEndpoint(kind,entryId){return {withdraw:'/wallet/withdrawal-options',allocation:`/income/entries/${encodeURIComponent(entryId||'')}/allocation-options`,'quota-transfer':'/partner/quota-transfer-options','quota-purchase':'/partner/quota-purchase-options',upgrade:'/partner/upgrade-options',entitlement:'/partner/entitlement-options','bind-store':'/partner/store-binding-options'}[kind]}
function pickRemaining(...values){
  for(const value of values){
    const number=Number(value)
    if(Number.isFinite(number)&&number>=0)return number
  }
  return null
}
function normalizeUpgradePlan(item){
  if(!item||typeof item!=='object')return null
  const value=item.value||item.id||item.targetLevel||item.to||item.code||item.level||item.tier
  if(!value)return null
  const ladder=wholesaleLadderEntry(value)||wholesaleLadderEntry(item.label||item.name||item.levelName||item.levelLabel)
  const label=ladder?.displayName||wholesaleLevelDisplay(item.label||item.name||item.levelName||item.levelLabel||value)||String(value)
  const requiredQuota=Number(
    item.requiredQuota
    ??item.quotaCount
    ??item.quota
    ??item.vipQuota
    ??item.needQuota
  )
  const listPrice=Number(item.listPrice??item.price??item.amount??item.totalPayable)
  const paidAmount=Number(item.paidAmount??item.principal??item.principalDeducted??0)
  return {
    ...item,
    value:String(value),
    label,
    ...(Number.isFinite(requiredQuota)?{requiredQuota}:{}),
    listPrice:Number.isFinite(listPrice)?listPrice:(ladder?.price??null),
    paidAmount:Number.isFinite(paidAmount)?paidAmount:0,
    currentLabel:wholesaleLevelDisplay(item.currentLabel||item.from||'')||item.currentLabel||'',
    disabled:item.disabled===true,
  }
}
function normalizeUpgradePlans(list){
  return (Array.isArray(list)?list:[]).map(normalizeUpgradePlan).filter(Boolean)
}
/** Always expose the four wholesale ranks; overlay live plan fields when present. */
function ensureWholesaleUpgradePlans(plans,currentHint,{preferLegacy=false}={}){
  const remoteByKey=new Map()
  for(const plan of normalizeUpgradePlans(plans)){
    const key=wholesaleLadderEntry(plan.value)?.value||wholesaleLadderEntry(plan.label)?.value
    if(key)remoteByKey.set(key,plan)
  }
  return buildWholesaleUpgradePlans(currentHint,{preferLegacy}).map(base=>{
    const remote=remoteByKey.get(wholesaleLadderEntry(base.value)?.value)
    if(!remote)return base
    const requiredQuota=Number(remote.requiredQuota)
    return {
      ...base,
      ...remote,
      value:remote.value||base.value,
      label:base.label,
      requiredQuota:Number.isFinite(requiredQuota)?requiredQuota:base.requiredQuota,
      listPrice:remote.listPrice??base.listPrice,
      paidAmount:remote.paidAmount??base.paidAmount,
      currentLabel:wholesaleLevelDisplay(remote.currentLabel)||base.currentLabel,
      disabled:remote.disabled===true||base.disabled,
    }
  })
}
function normalizeOperationMember(item,{preferLegacyUpgradeValues=false}={}){
  if(!item||typeof item!=='object')return null
  const id=item.id||item.accountId||item.targetAccountId||item.memberId||item.value
  if(!id)return null
  const levelLabel=item.levelLabel||item.levelName||item.tierLabel||item.tier||''
  const rawPlans=item.upgradePlans||item.levels||item.plans
  const upgradePlans=Array.isArray(rawPlans)&&rawPlans.length
    ?ensureWholesaleUpgradePlans(rawPlans,levelLabel,{preferLegacy:preferLegacyUpgradeValues})
    :buildWholesaleUpgradePlans(levelLabel,{preferLegacy:preferLegacyUpgradeValues})
  return {
    ...item,
    id:String(id),
    name:item.name||item.label||'',
    phone:item.phone||'',
    levelLabel,
    displayLevelLabel:wholesaleLevelDisplay(levelLabel)||levelLabel||'普通用户',
    avatarUrl:item.avatarUrl||'',
    wholesalePerQuota:item.wholesalePerQuota,
    upgradePlans,
  }
}
/** Live options nest balances/candidates and may omit fields/allowedActions. */
function normalizeBusinessOperationOptions(kind,result){
  if(!result||typeof result!=='object')return result
  const preferLegacy=Boolean(result.mockOnly)
  const balances=result.balances&&typeof result.balances==='object'&&!Array.isArray(result.balances)?result.balances:null
  const standardRemaining=pickRemaining(
    result.standardRemaining,
    result.standardQuota,
    balances?.standardRemaining,
    balances?.standard,
    balances?.standardQuota,
    result.remainingCount,
    result.sellerBalances?.standard,
  )
  const activityRemaining=pickRemaining(
    result.activityRemaining,
    result.activityQuota,
    balances?.activityRemaining,
    balances?.activity,
    balances?.activityQuota,
    result.sellerBalances?.activity,
  )
  const memberSource=Array.isArray(result.members)&&result.members.length
    ?result.members
    :(Array.isArray(result.candidates)?result.candidates:[])
  const members=memberSource.map(item=>normalizeOperationMember(item,{preferLegacyUpgradeValues:preferLegacy})).filter(Boolean)
  let upgradePlans=normalizeUpgradePlans(result.upgradePlans||result.levels||result.plans)
  if(kind==='upgrade'){
    const seed=members[0]?.levelLabel||result.currentTier||result.principalTier||''
    upgradePlans=ensureWholesaleUpgradePlans(upgradePlans.length?upgradePlans:result.upgradePlans,seed,{preferLegacy})
  }
  const memberOptions=members.map(item=>({value:item.id,label:item.name||item.id}))
  const levelOptions=upgradePlans.map(item=>({value:item.value,label:item.label,disabled:item.disabled,requiredQuota:item.requiredQuota}))
  let fields=Array.isArray(result.fields)?[...result.fields]:[]
  fields=fields.map(field=>{
    if(field?.key==='targetAccountId'){
      const options=Array.isArray(field.options)&&field.options.length?field.options:memberOptions
      return {...field,type:field.type||'enum',options}
    }
    if(field?.key==='targetLevel'){
      const options=levelOptions.length?levelOptions:(Array.isArray(field.options)?field.options.map(option=>{
        const value=option?.value??option
        const label=wholesaleLevelDisplay(option?.label||value)||String(option?.label||value||'')
        return {...(typeof option==='object'?option:{}),value,label}
      }):[])
      return {...field,type:field.type||'enum',options}
    }
    return field
  })
  if((kind==='upgrade'||kind==='quota-transfer'||kind==='bind-store')&&!fields.some(item=>item?.key==='targetAccountId')&&memberOptions.length){
    fields.push({key:'targetAccountId',label:'受益成员',type:'enum',options:memberOptions})
  }
  if(kind==='upgrade'&&!fields.some(item=>item?.key==='targetLevel')&&levelOptions.length){
    fields.push({key:'targetLevel',label:'目标等级',type:'enum',options:levelOptions})
  }
  const allowedActions=Array.isArray(result.allowedActions)
    ?result.allowedActions
    :['quote','submit']
  // Activity VIP upgrade fee: ¥2000 per quota when the API omits a positive unit price.
  const ACTIVITY_UPGRADE_UNIT=2000
  let activityUnitAmount=Number(result.activityUnitAmount??result.serviceFeeRule?.perActivityQuota??result.serviceFeePerActivity)
  if(kind==='upgrade'&&!(Number.isFinite(activityUnitAmount)&&activityUnitAmount>0))activityUnitAmount=ACTIVITY_UPGRADE_UNIT
  const sellerStandardRemaining=pickRemaining(result.sellerBalances?.standard,standardRemaining)
  const sellerActivityRemaining=pickRemaining(result.sellerBalances?.activity,activityRemaining)
  return {
    ...result,
    fields,
    members,
    upgradePlans,
    allowedActions,
    ...(standardRemaining!=null?{standardRemaining}:{}),
    ...(activityRemaining!=null?{activityRemaining}:{}),
    ...(sellerStandardRemaining!=null?{sellerStandardRemaining}:{}),
    ...(sellerActivityRemaining!=null?{sellerActivityRemaining}:{}),
    ...(Number.isFinite(activityUnitAmount)&&activityUnitAmount>0?{activityUnitAmount}:{}),
  }
}
export function getBusinessOperationOptions(kind,contextId,entryId='',input={}){
  guardKind(kind)
  return withBusinessContext(contextId,context=>capability(kind,context),async(account,context)=>{
    scopeKind(kind,context)
    const targetAccountId=String(input?.targetAccountId||'').trim()
    if(kind==='upgrade'&&!targetAccountId)throw new Error('请从团队页选择下级')
    const result=config.useMock
      ?mockOperationOptions(kind,account,context,entryId)
      :await request(optionsEndpoint(kind,entryId),{data:{contextId:context.id,...(kind==='upgrade'?{targetAccountId}:{})}})
    return normalizeBusinessOperationOptions(kind,result)
  })
}
export function previewBusinessOperation(kind,contextId,input,entryId=''){
  guardKind(kind)
  return withBusinessContext(contextId,context=>capability(kind,context),async(account,context)=>{
    scopeKind(kind,context)
    if(['quota-transfer','quota-purchase'].includes(kind)&&!/^[1-9]\d{0,3}$/.test(String(input.quantity)))throw new Error('请输入 1–9999 的整数名额')
    if(kind==='upgrade' && [input.standardQuantity,input.activityQuantity].some(value=>value!=null && (!Number.isInteger(Number(value))||Number(value)<0||Number(value)>9999)))throw new Error('使用名额须为0—9999的整数')
    const payload={planId:input.planId,targetAccountId:input.targetAccountId,quantity:['quota-transfer','quota-purchase'].includes(kind)?Number(input.quantity):undefined,targetLevel:input.targetLevel,standardQuantity:kind==='upgrade'&&input.standardQuantity!=null?Number(input.standardQuantity):undefined,activityQuantity:kind==='upgrade'&&input.activityQuantity!=null?Number(input.activityQuantity):undefined,storeId:input.storeId,accountType:input.accountType,payeeToken:input.payeeToken,amount:kind==='withdraw'?parseAmount(input.amount):undefined,targetId:input.targetId}
    if(kind==='allocation')Object.assign(payload,{agentId:input.agentId,percent:input.percent??100,allocationKind:allocationKind(input.allocationKind),targets:input.targets})
    if(!config.useMock){const result=await request(quoteEndpoint(kind,entryId),{method:'POST',data:{...payload,contextId:context.id,entryId}});if(kind==='allocation')validAllocationQuote(result);validateQuote(result);return result}
    return mockOperationPreview(kind,account,context,input,entryId,payload)
  })
}
// TODO(API): tokenize beneficiary bank details separately; quotes/records carry
// only the server token and masked bank metadata, never raw card numbers.
export function registerBusinessPayee(contextId,input){return withBusinessContext(contextId,null,async(account,context)=>{
 const name=String(input.name||'').trim(),bankName=String(input.bankName||'').trim(),bankNumber=String(input.bankNumber||'').replaceAll(' ','')
 if(!['PERSONAL','COMPANY'].includes(input.accountType)||!name||name.length>60||!bankName||bankName.length>60||!/^\d{16,19}$/.test(bankNumber))throw new Error('请完善收款人、开户行及银行卡号')
 if(!config.useMock){const result=await request('/wallet/payees',{method:'POST',data:{contextId,accountType:input.accountType,name,bankName,bankNumber}});if(!result?.payeeToken)throw new Error('收款账户保存未完成，请检查信息后重试');return result}
 const state=mockBusinessState(account,context);state.payees=state.payees||{};const maskedBankNumber=`**** **** **** ${bankNumber.slice(-4)}`,fingerprint=JSON.stringify([input.accountType,name,bankName,maskedBankNumber]),old=Object.values(state.payees).find(x=>x.fingerprint===fingerprint)
 if(old)return {payeeToken:old.payeeToken}
 const payeeToken=`mock-payee-${Object.keys(state.payees).length+1}`;state.payees[payeeToken]={payeeToken,accountType:input.accountType,name,bankName,maskedBankNumber,fingerprint};saveMockBusinessState(account,context);return {payeeToken}
})}
function validateQuote(quote){if(!quote?.id||!Array.isArray(quote.details)||!Number.isFinite(quote.expiresAt)||!Number.isFinite(quote.serverTime))throw new Error('本次操作暂时无法预览，请稍后重试')}
export function commitBusinessOperation(kind,contextId,quoteId,idempotencyKey,entryId='',input={}){
  guardKind(kind)
  return withBusinessContext(contextId,context=>capability(kind,context),async(account,context)=>{
    scopeKind(kind,context)
    const targetAccountId=String(input?.targetAccountId||'').trim()
    if(kind==='upgrade'&&!targetAccountId)throw new Error('请从团队页选择下级')
    if(kind==='quota-transfer'){if(!idempotencyKey)throw new Error('请先确认本次操作')}
    else if(!quoteId||!idempotencyKey)throw new Error('请先确认本次操作预览')
    const tracked=trackedKinds.includes(kind),storageKey=intentKey(account.id,kind,contextId,targetAccountId),previous=tracked?uni.getStorageSync(storageKey):null
    if(kind==='quota-transfer'){
      if(previous?.dispatched && previous.idempotencyKey!==idempotencyKey)throw new Error('上一笔操作待确认，请勿重复提交')
      if(tracked)uni.setStorageSync(storageKey,{...previous,idempotencyKey,draft:input,dispatched:true})
    }else{
      if(previous?.dispatched && (previous.quoteId!==quoteId || previous.idempotencyKey!==idempotencyKey))throw new Error('上一笔操作待确认，请勿重复提交')
      if(tracked)uni.setStorageSync(storageKey,{...previous,quoteId,idempotencyKey,dispatched:true})
    }
    try{
      let result
      if(!config.useMock){
        if(kind==='quota-transfer'){
          result=await request('/partner/quota-transfers',{method:'POST',data:buildQuotaTransferPayload({contextId:context.id,targetAccountId,quantity:input.quantity,idempotencyKey})})
        }else{
          const endpoint={withdraw:'/wallet/withdrawals',allocation:`/income/entries/${encodeURIComponent(entryId)}/allocations`,'quota-purchase':'/partner/quota-orders',upgrade:'/partner/upgrades',entitlement:'/partner/entitlement-orders','bind-store':'/partner/store-bindings'}[kind];result=await request(endpoint,{method:'POST',data:kind==='upgrade'?{contextId:context.id,targetAccountId,targetLevel:input.targetLevel,idempotencyKey,quoteId}:{contextId:context.id,quoteId,idempotencyKey}})
        }
      }
      else result=mockOperationCommit(kind,account,context,quoteId,idempotencyKey,entryId,input)
      checkBusinessAccount(account)
      if(!result || typeof result!=='object' || !['PENDING_PAYMENT','PENDING_REVIEW','PENDING_SETTLEMENT','DEMO_APPLIED','APPLIED','SUCCEEDED','COMPLETED','PAID'].includes(result.status))throw new Error('操作结果待确认，请勿重复提交，可稍后查看记录')
      const validId=value=>typeof value==='string' && value.trim().length>0
      if(result.status==='PENDING_PAYMENT'?!validId(result.orderId):![result.operationId,result.id,result.withdrawalId].some(validId))throw new Error('操作回执不完整，结果待确认，请勿重复提交')
      if(tracked)uni.removeStorageSync(storageKey)
      if(kind==='withdraw')clearAgencyIncomeCache(context.id)
      return result
    }catch(error){if(tracked && (config.useMock || definitiveRejection(error))){checkBusinessAccount(account);uni.removeStorageSync(storageKey)}throw error}
  })
}
