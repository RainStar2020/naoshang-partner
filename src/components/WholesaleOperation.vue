<template>
 <view class="wholesale-ui" :class="dialog ? 'wh-overlay' : 'wh-form-page'" @click="dialog && back()">
  <view :class="dialog ? ['wh-dialog', kind==='quota-transfer' ? 'wh-dialog-transfer' : '', kind==='quota-transfer' && result ? 'wh-dialog-result' : ''] : 'wh-body'" @click.stop>
   <view v-if="dialog && !(kind==='quota-transfer' && result)" class="wh-dialog-head">{{kind==='quota-transfer'?'划拨名额':'购买VIP名额'}}<button v-if="kind!=='quota-purchase'" role="button" class="wh-close" aria-label="关闭弹窗" @click="back"><image src="/static/common/icon-close.png" mode="aspectFit"/></button></view>
   <FeaturePageState :status="status" :error="error" @retry="load"/>
   <template v-if="status==='ready' && options">
    <view v-if="result" :class="kind==='quota-transfer' ? 'wh-result-plain' : 'wh-finish'"><view>{{successTitle}}</view><button v-if="result.orderId && result.status==='PENDING_PAYMENT'" class="wh-primary wh-pill" @click="pay">去支付</button><button :class="kind==='quota-transfer' ? 'wh-primary wh-pill' : 'wh-secondary wh-pill'" @click="back">{{kind==='quota-transfer'?'确认':'返回上一页'}}</button><button v-if="kind==='withdraw'" class="wh-link" @click="records">查看提现记录</button></view>
    <template v-else>
     <picker v-if="kind!=='bind-store' && memberChoices.length && !pageQuery?.targetAccountId" :range="memberChoices" range-key="label" @change="set('targetAccountId',memberChoices[$event.detail.value].value)"><view class="wh-member-picker wh-card">受益成员　{{person?.name || '请选择成员'}} <image src="/static/common/icon-chevron-right.png" mode="aspectFit"/></view></picker>
     <view v-if="person && kind!=='bind-store'" class="wh-person wh-selected-person" :class="{'wh-card':!dialog}"><image v-if="person.avatarUrl" :src="person.avatarUrl" class="wh-avatar" mode="aspectFill"/><view v-else class="wh-avatar">{{person.name?.slice(0,1)}}</view><view><text>{{person.name}}</text><text v-if="person.displayId" class="wh-muted">{{person.displayId}}</text><text class="wh-tag">{{personLevelLabel}}</text><text v-if="kind==='upgrade'" class="wh-muted">目标名额：{{person.quotaRemaining ?? 0}}个</text></view></view>
     <template v-if="dialog">
      <view class="wh-row wh-datum"><text>{{kind==='quota-transfer'?'划拨数量':'购买数量'}}</text><text v-if="kind==='quota-transfer'">剩余<text class="wh-blue">{{options.standardRemaining ?? 0}}个</text>VIP名额</text></view><input :value="draft.quantity" class="wh-input wh-quantity" type="number" :maxlength="4" placeholder="请输入数量" :disabled="locked" @input="setQuantity($event.detail.value)"/>
      <view v-if="kind==='quota-transfer'" class="wh-datum wh-vip-price"><view><text>划拨积分单价</text><view><text class="wh-blue">{{points(transferUnitAmount)}}/个</text><view class="wh-muted">按受益成员身份：{{personLevelLabel}}</view></view></view></view>
      <view v-if="kind==='quota-purchase'" class="wh-datum wh-vip-price"><view><text>购买单价</text><view><text class="wh-blue">¥{{money(options.unitAmount)}}/个</text><text v-if="canPurchase" class="wh-tag">银联购买</text><view class="wh-muted">{{options.pricingLabel || '购买价格以报价为准'}}</view></view></view><text v-if="vipCalculationOnly" class="wh-vip-hint">当前身份暂无购买资格，仅展示购买所需金额。</text><text v-else class="wh-vip-hint">确认后进入购买流程。</text></view>
      <view class="wh-datum wh-total"><view><text>{{vipCalculationOnly?'所需金额':'合计金额'}}</text><text class="wh-blue">{{`¥${money(quoteAmount)}`}}</text></view></view>
     </template>
     <template v-else-if="kind==='upgrade'">
      <view class="wh-card"><text>请选择等级</text><view class="wh-plan-grid wh-upgrade-plans"><button v-for="item in plans" :key="item.value" :class="{selected:draft.targetLevel===item.value}" :disabled="locked || item.disabled" @click="choosePlan(item)">{{item.label}}</button></view><text v-if="plan" class="wh-upgrade-price wh-blue">{{upgradePriceText}}</text></view>
      <view class="wh-card wh-quota-card"><text class="wh-quota-title">请选择名额</text><view class="wh-quota-grid"><view v-for="source in sources" :key="source.key" class="wh-quota-item"><text class="wh-quota-label">{{source.label}}VIP余额</text><view class="wh-quota-count">{{source.remaining ?? 0}}<text>个</text></view><view class="wh-stepper"><text>使用数量</text><view class="wh-stepper-ctrl"><button :disabled="locked || Number(draft[source.key])<=0" @click="adjust(source.key,-1)">−</button><text class="wh-stepper-value">{{draft[source.key] || 0}}</text><button :disabled="locked || !canIncreaseQuota(source)" @click="adjust(source.key,1)">+</button></view></view></view></view><text v-if="plan" class="wh-upgrade-price wh-blue">{{upgradeQuotaText}}</text></view>
      <view v-if="Number(draft.activityQuantity)>0" class="wh-card wh-upgrade-fee"><text>积分消耗明细</text><view class="wh-datum"><view><text class="wh-muted">积分计价规则</text><text>{{points(activityUnit)}}/个活动名额</text></view><view><text class="wh-muted">本次升级消耗</text><text>{{draft.activityQuantity}}个活动名额，{{draft.standardQuantity || 0}}个标准名额</text></view><view><text class="wh-muted">本次升级需消耗积分</text><text>{{points(activityFee)}}</text></view></view></view>
     </template>
     <template v-else-if="kind==='bind-store'">
      <view class="wh-bind-region"><text>区域选择</text><RegionPicker :label="region.names.join('') || '请选择地区'" :codes="region.codes" plain @change="region=$event"/></view>
      <view class="wh-bind-stores"><button v-if="options.headquarters" class="wh-store wh-bind-hq" :disabled="locked" @click="chooseStore(options.headquarters)"><view><view>总部服务</view><text class="wh-muted">当前地区没有可服务门店，可选择总部服务</text></view><image class="wh-chevron" src="/static/common/icon-chevron-right.png" mode="aspectFit"/></button><button v-for="store in stores" :key="store.key || store.id" class="wh-store wh-bind-store" :disabled="locked" @click="chooseStore(store)"><image class="wh-store-cover" :src="store.coverUrl || '/static/common/icon-store.png'" mode="aspectFill"/><view><view class="wh-store-name">{{store.name}} <text class="wh-tag">{{store.number}}</text></view><view class="wh-muted">店长信息：{{store.manager || ''}}<text v-if="store.phone">/{{store.phone}}</text></view><view class="wh-muted">{{store.address}}</view></view><image class="wh-chevron" src="/static/common/icon-chevron-right.png" mode="aspectFit"/></button><EmptyState v-if="!stores.length" text="当前地区暂无服务门店"/></view>
     </template>
     <template v-else-if="kind==='withdraw'"><view class="wh-card"><text>可提现积分</text><view class="wh-available"><text class="wh-blue">{{points(available)}}</text></view></view></template>
     <text v-if="operationError" class="wh-error" role="alert">{{operationError}}</text>
     <view v-if="dialog" class="wh-confirm"><button v-if="kind==='quota-purchase'" class="wh-secondary wh-pill" :disabled="locked" @click="back">取消</button><button v-if="!vipCalculationOnly" role="button" class="wh-primary wh-pill" :disabled="busy || !canQuote" @click="submit">{{busy?'处理中…':kind==='quota-transfer'?'确认划拨':'立即支付'}}</button></view>
    </template>
   </template>
  </view>
  <view v-if="!dialog && status==='ready' && !result && kind!=='bind-store' && !confirmation" class="wh-bottom"><button role="button" class="wh-primary" :disabled="busy || !canQuote || !upgradeQuotaReady" @click="submit">{{busy?'处理中…':bottomActionLabel}}</button></view>
  <view v-if="confirmation" class="wh-overlay wh-confirm-mask" :class="{'wh-bind-confirm':kind==='bind-store'}" @click.stop="dismissConfirmation"><view class="wh-dialog" @click.stop><view class="wh-dialog-head">{{confirmTitle}}</view><view v-if="quote && kind!=='bind-store' && kind!=='upgrade'" class="wh-datum"><view v-for="line in quote.details" :key="line.label"><text>{{line.label}}</text><text>{{format(line)}}</text></view></view><text v-if="operationError" class="wh-error">{{operationError}}</text><view class="wh-confirm"><template v-if="kind==='bind-store'"><button class="wh-confirm-ok" :disabled="busy || !canSubmit" @click="commit">{{busy?'提交中…':'确定'}}</button><button class="wh-confirm-cancel" :disabled="busy" @click="dismissConfirmation">取消</button></template><template v-else><button class="wh-secondary wh-pill" :disabled="busy" @click="dismissConfirmation">取消</button><button role="button" class="wh-primary wh-pill" :disabled="busy || !canSubmit" @click="commit">{{busy?'提交中…':'确定'}}</button></template></view></view></view>
 </view>
</template>
<script setup>
import {ref,computed,watch,onUnmounted} from 'vue'
import {money,percent} from '../features/exclusive/format'
import {nextWholesaleUpgradePlan,vipQuotaUnitPrice,wholesaleLevelDisplay} from '../features/business/account-rank'
import {getBusinessContext} from '../services/business'
import {getBusinessOperationOptions,previewBusinessOperation,commitBusinessOperation,getBusinessOperationIntent,rememberBusinessOperationIntent} from '../services/business-operations'
import {getCommerceOrder} from '../services/commerce'
import {storeBindingErrorMessage} from '../services/store-binding'
import {useAsyncPage} from '../composables/useAsyncPage'
import FeaturePageState from './FeaturePageState.vue'
import EmptyState from './EmptyState.vue'
import RegionPicker from './RegionPicker.vue'
const props=defineProps({kind:String,pageQuery:Object}),context=ref(null),draft=ref({}),quote=ref(null),result=ref(null),busy=ref(false),operationError=ref(''),uncertain=ref(false),confirmation=ref(false),region=ref(props.kind==='bind-store'?{codes:['410000','410100','410103'],names:['河南省','郑州市','二七区']}:{codes:[],names:[]})
let epoch=0,active=true,key='',receivedAt=0,quoteTimer=null
const {data:options,status,error,load}=useAsyncPage(async()=>{
  const ctx=await getBusinessContext(props.kind==='withdraw'?null:'wholesale',props.pageQuery?.contextId)
  const targetAccountId=String(props.pageQuery?.targetAccountId || '').trim()
  const value=await getBusinessOperationOptions(props.kind,ctx.id,'',{targetAccountId})
  value.fields=Array.isArray(value?.fields)?value.fields:[]
  value.allowedActions=Array.isArray(value?.allowedActions)?value.allowedActions:['quote','submit']
  if(props.kind!=='quota-purchase'&&!value.fields.length&&!(Array.isArray(value.members)&&value.members.length)&&!(Array.isArray(value.upgradePlans)&&value.upgradePlans.length)){
    throw new Error('操作信息暂时无法加载，请稍后重试')
  }
  context.value=ctx
  draft.value={targetAccountId,quantity:'',accountType:'PERSONAL',amount:'',standardQuantity:0,activityQuantity:0}
  if(props.kind==='bind-store'&&!draft.value.targetAccountId){
    const members=value.members||[]
    const chosen=props.kind==='bind-store'?(members.find(item=>!item.storeId)||members[0]):members[0]
    if(chosen)draft.value.targetAccountId=chosen.id
  }
  const pending=getBusinessOperationIntent(props.kind,ctx.id,targetAccountId)
  quote.value=pending?.quote || (pending?{id:pending.quoteId,details:[],expiresAt:0,serverTime:0}:null)
  if(pending?.draft)draft.value={...pending.draft}
  result.value=null
  key=pending?.idempotencyKey || ''
  uncertain.value=pending?.dispatched===true
  confirmation.value=uncertain.value
  operationError.value=uncertain.value?'上次操作结果确认中，请勿重复提交':''
  return value
},false)
watch(()=>props.pageQuery,q=>{if(q)load()},{immediate:true})
const locked=computed(()=>busy.value || uncertain.value)
const dialog=computed(()=>['quota-transfer','quota-purchase'].includes(props.kind)),memberChoices=computed(()=>options.value?.fields.find(f=>f.key==='targetAccountId')?.options || []),person=computed(()=>options.value?.members?.find(p=>p.id===draft.value.targetAccountId)),personLevelLabel=computed(()=>person.value?.displayLevelLabel||wholesaleLevelDisplay(person.value?.levelLabel)||person.value?.levelLabel||'普通用户'),plans=computed(()=>person.value?.upgradePlans || options.value?.upgradePlans || options.value?.fields.find(f=>f.key==='targetLevel')?.options || []),plan=computed(()=>plans.value.find(p=>p.value===draft.value.targetLevel)),sources=computed(()=>[{key:'activityQuantity',label:'活动',remaining:options.value?.sellerActivityRemaining??options.value?.activityRemaining},{key:'standardQuantity',label:'标准',remaining:options.value?.sellerStandardRemaining??options.value?.standardRemaining}])
const stores=computed(()=>(options.value?.stores || []).filter(s=>!region.value.codes.length || region.value.codes.every((code,index)=>s.regionCodes?.[index]===code))),points=value=>`${money(value)}积分`
const canQuote=computed(()=>options.value?.allowedActions.includes('quote')),canSubmit=computed(()=>options.value?.allowedActions.includes('submit')),canPurchase=computed(()=>props.kind==='quota-purchase'&&options.value?.purchaseMode==='PAYMENT'),vipCalculationOnly=computed(()=>props.kind==='quota-purchase'&&!canPurchase.value),available=computed(()=>options.value?.balances?.find(x=>x.kind==='money')?.value)
const successLabels={'quota-transfer':'划拨名额成功',upgrade:'设置等级成功','bind-store':'绑定门店成功','quota-purchase':'购买VIP名额成功',withdraw:'提现申请成功',entitlement:'年度权益开通成功'}
const successTitle=computed(()=>{const status=result.value?.status;if(status==='PENDING_PAYMENT')return '订单待支付';if(status==='PENDING_REVIEW')return '提现申请已提交，等待审核';if(status==='PAID')return successLabels[props.kind]||'支付成功';if(status==='CANCELLED')return '订单已取消';return successLabels[props.kind]||'操作已完成'})
const transferUnitAmount=computed(()=>{
  if(props.kind!=='quota-transfer')return null
  const remote=Number(person.value?.wholesalePerQuota)
  if(Number.isFinite(remote)&&remote>=0)return remote
  return vipQuotaUnitPrice(person.value?.levelLabel)
})
const quoteAmount=computed(()=>{if(['quota-transfer','quota-purchase'].includes(props.kind)&&/^[1-9]\d{0,3}$/.test(String(draft.value.quantity))){const unit=props.kind==='quota-transfer'?transferUnitAmount.value:options.value?.unitAmount;if(Number.isFinite(Number(unit)))return Number(draft.value.quantity)*Number(unit)}return quote.value?.amount ?? quote.value?.details?.find(x=>['待支付金额','预估购买金额','服务费','本次升级需缴纳服务费','合计金额'].includes(x.label))?.value ?? null})
const activityUnit=computed(()=>options.value?.activityUnitAmount || 0),activityFee=computed(()=>Number(draft.value.activityQuantity || 0)*activityUnit.value)
const yuan=value=>`¥${money(value)}`
const usedQuota=computed(()=>Number(draft.value.activityQuantity || 0)+Number(draft.value.standardQuantity || 0))
const upgradePriceText=computed(()=>{
  if(!plan.value)return ''
  const list=Number(plan.value.listPrice)
  if(!Number.isFinite(list))return ''
  const paid=Math.max(0,Number(plan.value.paidAmount || 0))
  const due=Math.max(0,list-paid)
  return `${plan.value.label}统一价${yuan(list)}，已缴纳批发商费用${yuan(paid)}，需补${yuan(due)}差价`
})
const upgradeQuotaText=computed(()=>{if(!plan.value)return '';const need=`消耗${plan.value.requiredQuota ?? 0}个VIP名额即可升级`;return plan.value.currentLabel?`当前已是${plan.value.currentLabel}，${need}`:need})
const upgradeQuotaCount=computed(()=>props.kind==='upgrade'?usedQuota.value||Number(plan.value?.requiredQuota || 0):0)
const bottomActionLabel=computed(()=>{
  if(props.kind==='withdraw')return '申请提现'
  if(props.kind==='upgrade')return `消耗${upgradeQuotaCount.value}个VIP名额升级`
  if(quoteAmount.value>0)return `消耗${points(quoteAmount.value)}立即升级`
  return '确认升级'
})
const upgradeConfirmText=computed(()=>`确认消耗${upgradeQuotaCount.value}个VIP名额升级吗？`)
const confirmTitle=computed(()=>{
  if(props.kind==='bind-store')return '确定要绑定该门店吗？'
  if(props.kind==='upgrade')return upgradeConfirmText.value
  return '请确认本次操作'
})
const format=line=>line.kind==='money'?points(line.value):line.kind==='percent'?percent(line.value):line.value??0
function invalidate(){clearTimeout(quoteTimer);++epoch;quote.value=null;key='';operationError.value='';confirmation.value=false}
function set(field,value){if(locked.value)return;draft.value[field]=value;invalidate()}
function setQuantity(value){if(locked.value)return;const digits=String(value??'').replace(/\D/g,'').slice(0,4);if(!digits){set('quantity','');return}const remaining=Number(options.value?.standardRemaining);const next=Number(digits);set('quantity',String(props.kind==='quota-transfer'&&Number.isFinite(remaining)?Math.min(next,Math.max(0,remaining)):next))}
function fillUpgradeQuota(need){const needCount=Math.max(0,Number(need || 0));const standardRemaining=Math.max(0,Number(options.value?.sellerStandardRemaining??options.value?.standardRemaining ?? 0));const activityRemaining=Math.max(0,Number(options.value?.sellerActivityRemaining??options.value?.activityRemaining ?? 0));const standard=Math.min(needCount,standardRemaining);const activity=Math.min(Math.max(0,needCount-standard),activityRemaining);draft.value.standardQuantity=standard;draft.value.activityQuantity=activity}
function choosePlan(value){if(locked.value)return;set('targetLevel',value.value);fillUpgradeQuota(value.requiredQuota)}
const upgradeQuotaReady=computed(()=>props.kind!=='upgrade' || Boolean(draft.value.targetAccountId && plan.value && usedQuota.value===Number(plan.value.requiredQuota || 0)))
function canIncreaseQuota(source){const used=Number(draft.value[source.key] || 0);if(used>=Number(source.remaining ?? 0))return false;if(props.kind==='upgrade' && plan.value)return usedQuota.value<Number(plan.value.requiredQuota || 0);return true}
function adjust(field,delta){if(locked.value)return;const current=Number(draft.value[field] || 0);let next=Math.max(0,current+delta);if(props.kind==='upgrade' && plan.value){const other=field==='activityQuantity'?Number(draft.value.standardQuantity || 0):Number(draft.value.activityQuantity || 0);const source=sources.value.find(item=>item.key===field);next=Math.min(next,Number(source?.remaining ?? 0),Math.max(0,Number(plan.value.requiredQuota || 0)-other))}set(field,next)}
async function prepare(){const current=epoch;const output=await previewBusinessOperation(props.kind,context.value.id,draft.value);if(!active||current!==epoch)return false;quote.value=output;receivedAt=Date.now();return true}
watch(()=>[draft.value.targetAccountId,options.value],()=>{
  if(props.kind!=='upgrade'||!draft.value.targetAccountId)return
  const selected=plans.value.find(item=>item.value===draft.value.targetLevel)
  if(selected&&!selected.disabled){
    const used=Number(draft.value.standardQuantity||0)+Number(draft.value.activityQuantity||0)
    if(
      Number(draft.value.standardQuantity||0)>Number(options.value?.sellerStandardRemaining??options.value?.standardRemaining??0)
      ||Number(draft.value.activityQuantity||0)>Number(options.value?.sellerActivityRemaining??options.value?.activityRemaining??0)
      ||used!==Number(selected.requiredQuota||0)
    )fillUpgradeQuota(selected.requiredQuota)
    return
  }
  const next=nextWholesaleUpgradePlan(plans.value,person.value?.levelLabel)
  if(!next)return
  draft.value.targetLevel=next.value
  fillUpgradeQuota(next.requiredQuota)
})
watch(()=>[draft.value.quantity,draft.value.targetAccountId,draft.value.targetLevel,draft.value.standardQuantity,draft.value.activityQuantity],()=>{
 clearTimeout(quoteTimer)
 const quantityReady=['quota-transfer','quota-purchase'].includes(props.kind) && /^[1-9]\d{0,3}$/.test(String(draft.value.quantity)) && (props.kind==='quota-purchase' || draft.value.targetAccountId)
 const upgradeReady=props.kind==='upgrade' && draft.value.targetAccountId && plan.value && Number(draft.value.standardQuantity)+Number(draft.value.activityQuantity)===plan.value.requiredQuota
 if(locked.value || vipCalculationOnly.value || !canQuote.value || (!quantityReady && !upgradeReady))return
 quoteTimer=setTimeout(async()=>{try{await prepare()}catch{/* field validation is reported on explicit submission */}},300)
})
function dismissConfirmation(){if(busy.value)return;confirmation.value=false;if(!uncertain.value)operationError.value=''}
async function submit(){if(locked.value||!canQuote.value||!upgradeQuotaReady.value)return;clearTimeout(quoteTimer);++epoch;busy.value=true;operationError.value='';try{if(await prepare())confirmation.value=true}catch(e){operationError.value=storeBindingErrorMessage(e)}finally{if(active)busy.value=false}}
async function chooseStore(store){if(locked.value)return;set('storeId',store.id);await submit()}
async function commit(){if(busy.value||!quote.value||!canSubmit.value)return;if(!uncertain.value && quote.value.expiresAt<=quote.value.serverTime+Date.now()-receivedAt){operationError.value='预览已失效，请重新确认';confirmation.value=false;quote.value=null;return}const current=epoch;busy.value=true;operationError.value='';if(!key)key=`wholesale-${Date.now()}-${Math.random().toString(36).slice(2)}`;try{rememberBusinessOperationIntent(props.kind,context.value.id,quote.value,key,{...draft.value});uncertain.value=true;const output=await commitBusinessOperation(props.kind,context.value.id,quote.value.id,key,'',draft.value);if(!active||current!==epoch)return;result.value=output;uncertain.value=false;confirmation.value=false;if(output.orderId)pay()}catch(e){if(active&&current===epoch){uncertain.value=Boolean(getBusinessOperationIntent(props.kind,context.value.id,draft.value.targetAccountId)?.dispatched);operationError.value=storeBindingErrorMessage(e);if(!uncertain.value)key=''}}finally{if(active)busy.value=false}}
function pay(){uni.navigateTo({url:`/pages/payment/cashier?orderId=${encodeURIComponent(result.value.orderId)}`})}
function records(){uni.navigateTo({url:`/pages/wallet/withdrawals?contextId=${encodeURIComponent(context.value.id)}`})}
function back(){if(uncertain.value){uni.showToast({title:'操作结果确认中，请勿重复提交',icon:'none'});return}if(getCurrentPages().length>1)uni.navigateBack();else uni.switchTab({url:'/pages/partners/index'})}
async function refresh(){if(busy.value)return;if(result.value?.orderId){try{const value=await getCommerceOrder(result.value.orderId);if(value.order.status==='COMPLETED')result.value={...result.value,status:'PAID'};else if(value.order.status==='CANCELLED')result.value={...result.value,status:'CANCELLED'}}catch(e){operationError.value=e.message}return}if(!quote.value&&!result.value)load()}
onUnmounted(()=>{clearTimeout(quoteTimer);active=false;++epoch});defineExpose({refresh})
</script>
<style>@import '../styles/wholesale.css';</style>
<style scoped>
.wh-selected-person{justify-content:center;padding:.8em;margin-bottom:1em;background:#464c6b;border-radius:.5em}.wh-member-picker{display:flex;justify-content:space-between;align-items:center;font-size:.9em}.wh-member-picker image,.wh-chevron{height:1em;width:1em;flex-shrink:0}.wh-quantity{text-align:center;margin:.5em 0 1.4em}.wh-total{margin:.6em 0}.wh-plan-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.5em;margin:.6em 0}.wh-plan-grid button{font-size:.9em;color:#e1e4f3;background:#464b69;border:1rpx solid transparent;border-radius:.25em;line-height:2.4;padding:.2em;margin:0;min-width:0}.wh-plan-grid .selected{background:#09264c;border:1rpx solid #55adff;color:#55adff}.wh-plan-grid button[disabled]{opacity:.38}.wh-upgrade-plans button[disabled]{opacity:1;color:#8d95ad;background:#3e4664}.wh-upgrade-price{display:block;margin-top:.45em;font-size:.85em;line-height:1.6}.wh-upgrade-fee .wh-datum>view>text:first-child,.wh-upgrade-fee .wh-datum>view>view:first-child,.wh-upgrade-fee .wh-datum>view>button:first-child{white-space:normal}.wh-quota-card{padding:1em .9em 1.05em}.wh-quota-title{display:block;margin-bottom:.75em;font-size:1em;font-weight:600;color:#fff}.wh-quota-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.55em;margin:0}.wh-quota-item{display:flex;flex-direction:column;align-items:center;min-width:0;padding:.85em .55em .75em;border-radius:16rpx;background:linear-gradient(169deg,#3d4568 0%,rgba(53,58,89,.72) 100%);box-shadow:inset 0 1rpx rgba(180,210,255,.18);text-align:center}.wh-quota-label{color:rgba(255,255,255,.5);font-size:.78em;line-height:1.4}.wh-quota-count{margin-top:.35em;color:#fff;font-size:1.45em;font-weight:700;line-height:1.2}.wh-quota-count>text{margin-left:.1em;font-size:.55em;font-weight:500;color:rgba(255,255,255,.72)}.wh-stepper{display:flex;align-items:center;justify-content:space-between;gap:.35em;width:100%;box-sizing:border-box;margin-top:.75em;padding-top:.65em;border-top:1rpx solid rgba(255,255,255,.12);font-size:.78em;white-space:nowrap;color:rgba(255,255,255,.55)}.wh-stepper-ctrl{display:flex;align-items:center;gap:.28em;flex-shrink:0}.wh-stepper-value{min-width:1.2em;text-align:center;color:#fff;font-size:1.05em;font-weight:600}.wh-stepper button{display:flex;align-items:center;justify-content:center;width:1.45em;height:1.45em;padding:0;margin:0;border-radius:50%;border:1rpx solid rgba(85,173,255,.85);background:radial-gradient(circle at 30% 25%,#1a4f8c,#0a2a52 70%);box-shadow:0 0 10rpx rgba(64,160,255,.28);color:#eaf5ff;font-size:1em;line-height:1}.wh-stepper button[disabled]{opacity:.35;box-shadow:none}.wh-available{text-align:right;font-size:.85em}.wh-account-types{margin-bottom:1.3em}.wh-account-types button{border-radius:.55em;min-height:2.7em}.wh-form-page .wh-input{border-radius:.45em}.wh-region{font-size:.85em;margin-bottom:.8em}.wh-region>picker{flex:1;min-width:0}.wh-store-list{padding:.7em}.wh-store{display:flex;align-items:center;gap:.6em;text-align:left;width:100%;background:none;color:white;font-size:.9em;padding:.6em 0;margin:0;line-height:1.7;border-bottom:1rpx solid #575c7433}.wh-store:last-child{border-bottom:0}.wh-store>view{flex:1;min-width:0}.wh-store-cover{width:5.5em;height:5.5em;flex-shrink:0;border-radius:.45em;background:#444b68;padding:0;box-sizing:border-box;object-fit:cover}.wh-store .wh-tag{font-size:.7em}.wh-store .wh-muted{font-size:.75em}.wh-bind-region{display:flex;align-items:center;gap:.6em;margin-bottom:.9em}.wh-bind-region>text{flex:none;background:#3c4464;border-radius:2em;padding:.4em .9em;font-size:.9em}.wh-bind-region :deep(.region-input){background:#3c4464;border-radius:2em;padding:.4em .85em;min-height:2.3em}.wh-bind-region :deep(.region-input.plain>text){text-align:left;color:#fff}.wh-bind-stores{display:flex;flex-direction:column;gap:.7em}.wh-bind-stores .wh-store{margin:0;padding:.85em;border:0;border-radius:.75em;background:#353a59}.wh-bind-hq{min-height:4.6em}.wh-store-name{display:flex;align-items:center;flex-wrap:wrap;gap:.35em;font-weight:600}.wh-bind-confirm{align-items:center;padding:1.5em}.wh-dialog-transfer{border-radius:40rpx;background:linear-gradient(180deg,#2A3357 0%,#202944 100%)}.wh-dialog-result{padding:2em 1.4em 1.3em}.wh-result-plain{text-align:center;background:transparent;padding:0}.wh-result-plain>view{padding:.6em 0 1.6em;font-size:1.08em;font-weight:500;color:#fff}.wh-result-plain>button{width:100%;margin:0!important}.wh-bind-confirm .wh-dialog{width:100%;max-width:20em;box-sizing:border-box;padding:1.7em 1.1em 1em;border-radius:40rpx;background:linear-gradient(180deg,#2A3357 0%,#202944 100%)}.wh-bind-confirm .wh-dialog-head{justify-content:center;padding:0 0 1.15em;font-size:1.05em;font-weight:600}.wh-bind-confirm .wh-confirm{margin-top:.2em}.wh-bind-confirm .wh-confirm button{flex:1;background:transparent !important;border-radius:0;line-height:2.5;font-size:1.05em}.wh-bind-confirm .wh-confirm-ok,.wh-bind-confirm .wh-confirm-ok[disabled]{color:#2f7bff !important;opacity:1}.wh-bind-confirm .wh-confirm-cancel{color:#e8eef8 !important}.wh-confirm-mask{z-index:120}.wh-dialog>.wh-datum{font-size:.85em}.wh-vip-price{padding:.75em 0 .15em}.wh-vip-hint{display:block;margin-top:.7em;padding:.65em .8em;border-radius:.5em;background:#0b294d;color:#7fc7ff;font-size:.84em;line-height:1.65}
</style>
