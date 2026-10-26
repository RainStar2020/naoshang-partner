import {mockBusinessPaymentOrder} from './commerce'
import {mockBusinessState,mockClone,saveMockBusinessState} from './business'
import {parseBusinessAmount as parseAmount} from '../../features/business/format'
import {mockWholesalePeople,mockUpgradePlans} from './wholesale'
import {allocationAllowed,allocationBeneficiary,allocationChoices} from './income-detail'
const enumField=(key,label,options)=>({key,label,type:'enum',options})
// TODO(API): current presentation reference from the 2026-10 plan. Real plans,
// permissions and unit prices must always come from the backend options endpoint.
const vipPriceByLevel={VIP合伙人:798000,天使合伙人:750000,私董合伙人:698000,联创合伙人:650000}
const activityUpgradeUnit=200000
const vipPurchasePolicy=context=>{
  const authorized=context.vipPurchaseEnabled===true || context.levelName==='联创合伙人'
  return {purchaseMode:authorized?'PAYMENT':'CALCULATION_ONLY',unitAmount:vipPriceByLevel[context.levelName]||998000,pricingLabel:authorized?'联创合伙人享受最低价权益':'当前身份仅展示购买金额，购买权限以后台为准',allowedPaymentChannelIds:authorized?['unionpay']:[]}
}
// Explicit local test fixtures and transactions; never used when useMock is false.
export function mockOperationOptions(kind,account,context,entryId) {
    const state=mockBusinessState(account,context),people=state.people.map(item=>({value:item.id,label:item.name}))
    const fields=[],balances=kind==='withdraw'?[{label:'可提现金额',kind:'money',value:state.available}]:kind==='allocation'?[{label:'待结算收益',kind:'money',value:state.pending}]:[{label:'标准名额余额',kind:'number',value:state.quota}]
    if(['quota-transfer','upgrade','bind-store'].includes(kind))fields.push(enumField('targetAccountId','受益成员',people))
    if(['quota-transfer','quota-purchase'].includes(kind))fields.push({key:'quantity',label:'名额数量',type:'integer',max:9999})
    if(kind==='upgrade')fields.push(enumField('targetLevel','目标等级',[{value:'DEMO-VIP',label:'VIP合伙人'},{value:'DEMO-ANGEL',label:'天使合伙人'},{value:'DEMO-BOARD',label:'私董合伙人'},{value:'DEMO-FOUNDER',label:'联创合伙人'}]))
    if(kind==='bind-store')fields.push(enumField('storeId','绑定门店',[{value:'demo-store-1',label:'梧桐街店'},{value:'demo-store-2',label:'文化路店'},{value:'headquarters',label:'总部服务'}]))
    if(kind==='entitlement')fields.push(enumField('planId','年度权益套餐',[{value:'demo-annual',label:'年度权益套餐'}]))
    if(kind==='withdraw')fields.push(enumField('accountType','账户类型',[{value:'PERSONAL',label:'个人'},{value:'COMPANY',label:'公司'}]),enumField('payeeToken','收款账户',[{value:'demo-personal',label:'个人收款账户',accountType:'PERSONAL'},{value:'demo-company',label:'公司收款账户',accountType:'COMPANY'}]),{key:'amount',label:'提现金额',type:'money',minAmount:1000})
    if(kind==='allocation'){
      const entry=state.entries.find(item=>item.id===entryId)
      if(!entry||entry.allocationStatus!=='PENDING')throw new Error('该收益没有待分配提点')
      fields.push(enumField('targetId',entry.allocationKind==='inspection'?'巡查方':'销售方',allocationChoices(entry.allocationKind)))
    }
    const vipPolicy=kind==='quota-purchase'?vipPurchasePolicy(context):{}
    return {fields,balances,headquarters:{id:'headquarters',name:'总部服务'},members:mockWholesalePeople(state),standardRemaining:state.quota,activityRemaining:state.activityQuota ?? 4,activityUnitAmount:activityUpgradeUnit,unitAmount:vipPolicy.unitAmount ?? 10000,stores:[1,2,3,4].map(n=>({id:'demo-store-1',key:`wutong-${n}`,name:'脑商训练营梧桐街店',number:'NO.001',manager:'李志远',phone:'19919988991',address:'河南省郑州市管城回族区航海东路与中州大道交叉口西美景龙堂3c-1',coverUrl:'/static/agency/store-wutong.png',regionNames:['河南省','郑州市','二七区'],regionCodes:['410000','410100','410103']})).concat([{id:'demo-store-2',key:'culture-1',name:'脑商训练营文化路店',number:'NO.002',manager:'王好梦',phone:'19919988991',address:'河南省郑州市金水区文化路',coverUrl:'/static/agency/store-wutong.png',regionNames:['河南省','郑州市','金水区'],regionCodes:['410000','410100','410105']}]),upgradePlans:mockUpgradePlans({}),version:state.version,allowedActions:kind==='quota-purchase'&&vipPolicy.purchaseMode==='CALCULATION_ONLY'?['quote']:['quote','submit'],...vipPolicy,mockOnly:true}
}

export function mockOperationPreview(kind,account,context,input,entryId,payload) {
    const state=mockBusinessState(account,context),details=[],id=`demo-operation-quote-${state.quotes.size+1}`
    let quantity=null,amount=null,fee=null,netAmount=null,person=null,entry=null
    if(['quota-transfer','upgrade','bind-store'].includes(kind)){person=state.people.find(item=>item.id===input.targetAccountId);if(!person)throw new Error('请选择授权团队成员');if(kind!=='upgrade')details.push({label:'受益成员',value:person.name})}
    if(['quota-transfer','quota-purchase'].includes(kind)){if(!/^[1-9]\d{0,3}$/.test(String(input.quantity)))throw new Error('请输入1—9999的整数名额');quantity=Number(input.quantity);if(kind==='quota-transfer'&&quantity>state.quota)throw new Error('标准名额余额不足');details.push({label:'名额数量',value:quantity})}
    if(kind==='quota-transfer')details.push({label:'划拨后剩余名额',value:state.quota-quantity})
    if(kind==='quota-purchase'){const policy=vipPurchasePolicy(context);amount=quantity*policy.unitAmount;details.push({label:policy.purchaseMode==='PAYMENT'?'待支付金额':'预估购买金额',kind:'money',value:amount},{label:'购买权限',value:policy.purchaseMode==='PAYMENT'?'联创权限已校验；仅支持银联支付':'当前身份仅可查看金额，购买权限以后台为准'},{label:'到账状态',value:policy.purchaseMode==='PAYMENT'?'订单待支付；不增加名额余额':'未创建订单，不增加名额余额'})}
    if(kind==='upgrade'){const plan=mockUpgradePlans(person).find(x=>x.value===input.targetLevel);if(!plan || plan.disabled)throw new Error('请选择目标等级');const activity=Number(input.activityQuantity || 0),standard=input.standardQuantity==null?plan.requiredQuota-activity:Number(input.standardQuantity);if(standard+activity!==plan.requiredQuota)throw new Error(`需使用${plan.requiredQuota}个VIP名额`);if(standard>state.quota||activity>(state.activityQuota ?? 4))throw new Error('名额余额不足');payload.standardQuantity=standard;payload.activityQuantity=activity;amount=activity*activityUpgradeUnit;if(amount)details.push({label:'服务费计价规则',value:`¥${(activityUpgradeUnit/100).toFixed(2)}/个活动名额`},{label:'本次升级消耗',value:`${activity}个活动名额，${standard}个标准名额`},{label:'本次升级需缴纳服务费',kind:'money',value:amount})}
    if(kind==='bind-store'){if(!['demo-store-1','demo-store-2','headquarters'].includes(input.storeId))throw new Error('请选择授权门店');details.push({label:'目标门店',value:input.storeId==='headquarters'?'总部服务':input.storeId==='demo-store-1'?'梧桐街店':'文化路店'})}
    if(kind==='entitlement'){if(input.planId!=='demo-annual')throw new Error('请选择年度套餐');amount=20000;details.push({label:'套餐费用',kind:'money',value:amount},{label:'权益状态',value:'未支付，不开通或续期权益'})}
    if(kind==='withdraw'){
      const saved=state.payees?.[input.payeeToken];if(!['PERSONAL','COMPANY'].includes(input.accountType)||(saved?saved.accountType!==input.accountType:input.payeeToken!==(input.accountType==='PERSONAL'?'demo-personal':'demo-company')))throw new Error('收款账户与账户类型不匹配')
      amount=parseAmount(input.amount);if(amount<1000)throw new Error('提现金额至少10元');if(amount>state.available)throw new Error('可提现金额不足');fee=100;netAmount=amount-fee
      details.push({label:'申请金额',kind:'money',value:amount},{label:'手续费',kind:'money',value:fee},{label:'预计到账',kind:'money',value:netAmount},{label:'收款账户',value:input.accountType==='PERSONAL'?'个人账户':'公司账户'})
    }
    if(kind==='allocation'){
      entry=state.entries.find(item=>item.id===entryId);if(!entry||entry.allocationStatus!=='PENDING')throw new Error('记录已分配或不存在')
      if(!allocationAllowed(input.targetId))throw new Error('受益人不在授权候选中')
      if(input.targetId==='other'&&!/^[A-Za-z0-9_-]{2,32}$/.test(String(input.agentId||'')))throw new Error(entry.allocationKind==='inspection'?'请输入巡查方ID':'请输入销售方ID')
      details.push({label:'分配类型',value:entry.allocationKind==='inspection'?'巡查提点':'销售提点'},{label:'最终受益人',value:allocationBeneficiary(entry.allocationKind,input.targetId,context,input.agentId)},{label:'待分配金额',kind:'money',value:entry.amount},{label:'结算状态',value:'分配后仍需后台结算，不直接增加可提现金额'})
    }
    const quote={id,kind,contextId:context.id,entryId,entryVersion:entry?.version,version:state.version,input:mockClone(payload),personId:person?.id,quantity,amount,unitAmount:kind==='quota-purchase'?vipPurchasePolicy(context).unitAmount:null,purchaseMode:kind==='quota-purchase'?vipPurchasePolicy(context).purchaseMode:null,fee,netAmount,details,expiresAt:Date.now()+300000,serverTime:Date.now(),mockOnly:true}
    state.quotes.set(id,mockClone(quote));return quote
}

export function mockOperationCommit(kind,account,context,quoteId,idempotencyKey,entryId) {
    const state=mockBusinessState(account,context),previous=state.operations.get(idempotencyKey)
    if(previous){if(previous.quoteId!==quoteId||previous.kind!==kind||previous.entryId!==entryId)throw new Error('重复请求参数不一致');return mockClone(previous.result)}
    const quote=state.quotes.get(quoteId)
    if(!quote||quote.kind!==kind||quote.contextId!==context.id||quote.entryId!==entryId||quote.expiresAt<=Date.now())throw new Error('预览已失效，请重新生成')
    if(quote.version!==state.version)throw new Error('余额或数据版本已变化，请重新加载后预览')
    let result={operationId:`demo-operation-${state.operations.size+1}`,status:'DEMO_APPLIED',mockOnly:true}
    if(kind==='quota-transfer'){if(quote.quantity>state.quota)throw new Error('标准名额余额不足');state.quota-=quote.quantity;state.transferred+=quote.quantity;state.quotaLedger.unshift({id:result.operationId,title:'划拨名额',targetName:state.people.find(item=>item.id===quote.personId).name,quantity:-quote.quantity,createdAt:new Date().toISOString()})}
    if(kind==='quota-purchase'&&vipPurchasePolicy(context).purchaseMode!=='PAYMENT')throw new Error('当前身份仅可查看VIP购买金额，暂无购买权限')
    if(['quota-purchase','entitlement'].includes(kind))result={...result,status:'PENDING_PAYMENT',orderId:mockBusinessPaymentOrder(account,context,kind,quote)}
    if(kind==='upgrade'){
      state.pendingUpgrades=state.pendingUpgrades || {}
      if(state.pendingUpgrades[quote.personId])throw new Error('该成员已有待支付升级订单')
      const standard=quote.input.standardQuantity,activity=quote.input.activityQuantity
      if(standard>state.quota || activity>(state.activityQuota ?? 4))throw new Error('名额余额不足')
      const person=state.people.find(item=>item.id===quote.personId),targetLevel=mockOperationOptions(kind,account,context).upgradePlans.find(x=>x.value===quote.input.targetLevel).label
      state.quota-=standard;state.activityQuota=(state.activityQuota ?? 4)-activity
      if(quote.amount>0){
        const upgrade={personId:person.id,standard,activity,targetLevel}
        const orderId=mockBusinessPaymentOrder(account,context,'upgrade',{...quote,upgrade})
        state.pendingUpgrades[person.id]=orderId
        state.activityReservations=state.activityReservations || {};state.activityReservations[orderId]=activity
        result={...result,status:'PENDING_PAYMENT',orderId}
      }else{
        person.levelLabel=targetLevel;person.version++
        state.quotaLedger.unshift({id:result.operationId,title:'开通/升级',targetName:person.name,quantity:-standard,createdAt:new Date().toISOString()})
      }
    }
    if(kind==='bind-store'){const person=state.people.find(item=>item.id===quote.personId);person.storeId=quote.input.storeId;person.version++}
    if(kind==='withdraw'){if(quote.amount>state.available)throw new Error('可提现金额不足');state.available-=quote.amount;const payee=state.payees?.[quote.input.payeeToken];const withdrawal={id:result.operationId,title:'提现申请',amount:quote.amount,fee:quote.fee,netAmount:quote.netAmount,status:'PENDING_REVIEW',accountType:quote.input.accountType,accountName:payee?.name,bankName:payee?.bankName,maskedBankNumber:payee?.maskedBankNumber,createdAt:new Date().toISOString()};state.withdrawals.unshift(withdrawal);result.status='PENDING_REVIEW'}
    if(kind==='allocation'){const entry=state.entries.find(item=>item.id===entryId);if(!entry||entry.version!==quote.entryVersion||entry.allocationStatus!=='PENDING')throw new Error('分配记录已变化');entry.allocationStatus='ALLOCATED';entry.settlementStatus='PENDING_SETTLEMENT';entry.allocationTarget=quote.input.targetId;entry.allocationAgentId=quote.input.agentId||'';entry.beneficiaryName=allocationBeneficiary(entry.allocationKind,quote.input.targetId,context,quote.input.agentId);entry.allowedActions=[];entry.version++;result.status='PENDING_SETTLEMENT'}
    state.version++
    result.balances=kind==='withdraw'?[{label:'可提现金额',kind:'money',value:state.available}]:kind==='allocation'?[{label:'待结算收益',kind:'money',value:state.pending}]:[{label:'标准名额余额',kind:'number',value:state.quota}]
    state.operations.set(idempotencyKey,{kind,quoteId,entryId,result:mockClone(result)});saveMockBusinessState(account,context);return result
}
