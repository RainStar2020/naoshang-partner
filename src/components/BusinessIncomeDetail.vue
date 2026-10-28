<template>
 <view class="income-detail feature-page">
  <FeaturePageState :status="status" :error="error" @retry="load"/>
  <template v-if="status==='ready' && data">
   <view v-if="view.notice" class="income-notice">{{view.notice}}</view>
   <view class="income-card">
    <view class="income-hero">
     <view>
      <text v-if="data.partyLabel" class="income-kicker">{{data.partyLabel}}</text>
      <view class="income-title">{{data.title}}</view>
      <text class="income-kicker">{{date(data.createdAt)}}</text>
     </view>
     <view class="income-side">
      <text class="income-pill">{{data.channel || '收益'}}</text>
      <view class="income-amount">{{view.amount}}</view>
     </view>
    </view>
    <view class="income-rule"></view>
    <view v-for="fact in view.facts" :key="fact.label" class="income-fact">
     <text>{{fact.label}}</text>
     <view><text>{{fact.value}}</text><text v-if="fact.note" class="income-fact-note">{{fact.note}}</text></view>
    </view>
    <button v-if="data.allowedActions?.includes('allocate')" class="income-action" @click="openAllocation">{{data.allocationKind==='inspection'?'分配巡查提点':'分配销售提点'}}</button>
   </view>
   <template v-for="person in view.people" :key="person.title">
    <view class="income-heading">{{person.title}}</view>
    <view class="income-person">
     <view class="income-avatar"><image v-if="person.avatarUrl" :src="person.avatarUrl" mode="aspectFill"/><text v-else>{{person.name?.slice(0,1) || '人'}}</text></view>
     <view>
      <view class="income-name">{{person.name}} <text v-if="person.badge" class="income-badge">{{person.badge}}</text></view>
      <text v-for="line in person.lines" :key="line">{{line}}</text>
     </view>
    </view>
   </template>
   <template v-if="view.store">
    <view class="income-heading">{{view.store.title}}</view>
    <view class="income-store">
     <view class="income-store-photo"><image :src="view.store.imageUrl" mode="aspectFill"/></view>
     <view>
      <view class="income-name">{{view.store.name}} <text class="income-badge">{{view.store.number}}</text></view>
      <text>{{view.store.address}}</text>
      <text>店长信息：{{view.store.manager}}</text>
     </view>
    </view>
   </template>
  </template>
  <view v-if="allocationOpen" class="income-mask" @click="closeAllocation">
   <view class="allocation-sheet" role="dialog" :aria-label="sheetTitle" @click.stop>
    <view class="allocation-title">{{sheetTitle}}<button aria-label="关闭分配" @click="closeAllocation"><image src="/static/common/icon-close.png" mode="aspectFit"/></button></view>
    <text class="allocation-label">请选择{{data?.allocationKind==='inspection'?'巡查方':'销售方'}}</text>
    <view class="allocation-options">
     <button v-for="item in candidates" :key="item.value" :disabled="item.available===false" :title="item.unavailableReason" :class="{selected:targetId===item.value}" @click="choose(item.value)">{{item.label}}</button>
    </view>
    <template v-if="targetId==='other'">
     <text class="allocation-label">{{data?.allocationKind==='inspection'?'巡查方ID':'销售方ID'}}</text>
     <input v-model="agentId" class="allocation-input" maxlength="32" placeholder="请输入"/>
    </template>
    <text v-if="operationError" class="allocation-error">{{operationError}}</text>
    <view v-if="quote" class="allocation-quote"><view v-for="detail in quote.details" :key="detail.label"><text>{{detail.label}}</text><text>{{format(detail)}}</text></view></view>
    <button class="income-action" :disabled="busy || !canConfirm" @click="quote ? commit() : preview()">{{busy?'处理中…':quote?'确认分配':'确定'}}</button>
   </view>
  </view>
 </view>
</template>
<script setup>
import {computed,ref,watch} from 'vue'
import {money,percent} from '../features/exclusive/format'
import {businessDateLabel as date} from '../features/business/format'
import {getBusinessContext,getBusinessIncomeDetail} from '../services/business'
import {getBusinessOperationOptions,previewBusinessOperation,commitBusinessOperation} from '../services/business-operations'
import {useAsyncPage} from '../composables/useAsyncPage'
import FeaturePageState from './FeaturePageState.vue'
const props=defineProps({pageQuery:Object})
const context=ref(null),allocationOpen=ref(false),options=ref(null),targetId=ref(''),agentId=ref(''),quote=ref(null),busy=ref(false),operationError=ref('')
let attemptKey=''
const {data,status,error,load}=useAsyncPage(async()=>{
  if(!props.pageQuery?.id)throw new Error('缺少收益记录编号')
  const ctx=await getBusinessContext(null,props.pageQuery.contextId)
  context.value=ctx
  closeAllocation()
  return getBusinessIncomeDetail(ctx.id,props.pageQuery.id)
},false)
watch(()=>props.pageQuery,query=>{if(query)load()},{immediate:true})
const view=computed(()=>{
  const entry=data.value
  if(entry?.presentation)return entry.presentation
  const signed=entry?.amount==null?'—':`${entry.amount>0?'+':''}${entry.amount<0?'-':''}¥${money(Math.abs(entry.amount||0))}`
  return {
    amount:signed,
    notice:entry?.pendingNote||'',
    facts:[
      {label:'支付类型',value:entry?.paymentTypeLabel||entry?.channel||'—'},
      {label:'本人身份',value:entry?.identityLabel||context.value?.label||'—'},
      {label:'业务提点',value:entry?.rateBps==null?'—':percent(entry.rateBps)},
    ],
    people:[entry?.recommended,entry?.buyer].filter(Boolean).map((item,index)=>({title:index?'购买人信息':'推荐人信息',name:item.name||'暂未提供',badge:item.roleLabel||'',avatarUrl:item.avatarUrl||'',lines:[item.phone?`联系方式：${item.phone}`:'联系方式待后台提供',item.address?`门店地址：${item.address}`:''].filter(Boolean)})),
    store:entry?.store?.name?{title:'支付门店',name:entry.store.name,number:entry.store.number||'',address:entry.store.address||'',manager:entry.store.manager||'',imageUrl:entry.store.imageUrl||'/static/common/icon-store.png'}:null,
  }
})
const candidates=computed(()=>options.value?.fields?.find(field=>field.key==='targetId')?.options||[])
const sheetTitle=computed(()=>data.value?.allocationKind==='inspection'?'分配巡查提点':'分配销售提点')
const canConfirm=computed(()=>targetId.value&&candidates.value.some(item=>item.value===targetId.value&&item.available!==false)&&(targetId.value!=='other'||/^[A-Za-z0-9_-]{2,32}$/.test(agentId.value.trim())))
const format=detail=>detail.kind==='money'?`¥${money(detail.value)}`:detail.kind==='percent'?percent(detail.value):detail.value??'—'
function closeAllocation(){allocationOpen.value=false;quote.value=null;targetId.value='';agentId.value='';operationError.value='';attemptKey=''}
function choose(value){if(value!==targetId.value){targetId.value=value;quote.value=null;attemptKey='';operationError.value=''}}
watch(agentId,()=>{quote.value=null;attemptKey=''})
async function openAllocation(){
  busy.value=true;operationError.value='';quote.value=null;attemptKey=''
  try{options.value=await getBusinessOperationOptions('allocation',context.value.id,data.value.id);if(options.value.scheme?.mode==='fixed'){data.value={...data.value,allowedActions:data.value.allowedActions.filter(action=>action!=='allocate')};throw new Error('当前使用固定分配方案，不支持自行分配')}targetId.value='';agentId.value='';allocationOpen.value=true}
  catch(reason){operationError.value=reason.message||'无法获取分配对象'}
  finally{busy.value=false}
}
async function preview(){
  if(!canConfirm.value||busy.value)return
  busy.value=true;operationError.value=''
  try{quote.value=await previewBusinessOperation('allocation',context.value.id,{targetId:targetId.value,agentId:agentId.value.trim(),allocationKind:data.value.allocationKind,percent:100},data.value.id)}
  catch(reason){operationError.value=reason.message||'预览失败'}
  finally{busy.value=false}
}
async function commit(){
  if(!quote.value||busy.value)return
  busy.value=true;operationError.value=''
  if(!attemptKey)attemptKey=`allocation-${Date.now()}-${Math.random().toString(36).slice(2)}`
  try{await commitBusinessOperation('allocation',context.value.id,quote.value.id,attemptKey,data.value.id);closeAllocation();await load()}
  catch(reason){operationError.value=reason.message||'分配失败'}
  finally{busy.value=false}
}
defineExpose({refresh:load})
</script>
<style scoped>
.income-detail{max-width:750px;margin:0 auto;box-sizing:border-box;padding:1em 1em 2em;color:#fff;font-size:clamp(14px,3.7vw,16px);line-height:1.5}
.income-notice{margin:0 0 .8em;color:#989eb6;font-size:.85em;text-align:center}
.income-card,.income-person,.income-store{background:#353a59;border-radius:.75em;padding:1em}
.income-hero{display:flex;justify-content:space-between;gap:.8em}
.income-hero>view:first-child{min-width:0;flex:1}
.income-kicker{display:block;color:#989eb6;font-size:.82em}
.income-title{margin:.15em 0;font-size:1.05em;font-weight:600;overflow-wrap:anywhere}
.income-side{flex-shrink:0;text-align:right}
.income-pill{display:inline-block;padding:.05em .7em;border-radius:2em;background:linear-gradient(95deg,#0340ff,#009bff);font-size:.75em}
.income-amount{margin-top:.25em;color:#57adff;font-size:1.35em;font-weight:600}
.income-rule{height:1px;margin:.8em 0 .4em;background:#464c6b}
.income-fact{display:flex;justify-content:space-between;gap:1em;padding:.35em 0;font-size:.92em}
.income-fact>text{color:#989eb6;flex-shrink:0}
.income-fact>view{min-width:0;text-align:right}
.income-fact-note{display:block;color:#989eb6;font-size:.78em}
.income-action{display:block;width:100%;margin:1em 0 0;padding:.55em 1em;border-radius:3em;background:linear-gradient(95deg,#0340ff,#009bff);color:#fff;font-size:1em;line-height:1.4}
.income-heading{display:flex;align-items:center;gap:.45em;margin:1.2em .1em .55em;font-weight:600}
.income-heading::before{content:'';width:.22em;height:1em;border-radius:1em;background:#57adff}
.income-person,.income-store{display:flex;align-items:center;gap:.8em}
.income-avatar,.income-store-photo{flex-shrink:0;overflow:hidden;background:#464c6b}
.income-avatar{width:3.2em;height:3.2em;border-radius:50%}
.income-store-photo{width:4.4em;height:4.4em;border-radius:.45em}
.income-avatar image,.income-store-photo image{width:100%;height:100%;display:block}
.income-person>view:last-child,.income-store>view:last-child{min-width:0;flex:1}
.income-name{font-weight:600}
.income-badge{display:inline-block;margin-left:.35em;padding:0 .45em;border-radius:2em;background:#2f6bff;font-size:.72em;font-weight:500;vertical-align:.1em}
.income-person text,.income-store text{display:block;color:#989eb6;font-size:.82em;overflow-wrap:anywhere}
.income-avatar{display:flex;align-items:center;justify-content:center}
.income-avatar text{display:flex;color:#fff;font-size:1.1em}
.income-name .income-badge{display:inline-block;color:#fff}
.income-mask{position:fixed;z-index:100;top:0;right:0;bottom:0;left:0;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.55)}
.allocation-sheet{width:min(100%,750px);box-sizing:border-box;padding:1.2em 1.1em calc(1.1em + env(safe-area-inset-bottom));border-radius:1.2em 1.2em 0 0;background:#353a59}
.allocation-title{position:relative;text-align:center;font-size:1.05em;font-weight:600}
.allocation-title button{position:absolute;top:0;right:0;margin:0;padding:0;background:none;line-height:1}
.allocation-title image{width:1.2em;height:1.2em}
.allocation-label{display:block;margin:.9em 0 .45em;color:#c5cbe0;font-size:.9em}
.allocation-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.55em}
.allocation-options button{margin:0;padding:.7em .4em;border-radius:.45em;background:#464c6b;color:#fff;font-size:.95em}
.allocation-options button.selected{background:#123a86;color:#8ec8ff}
.allocation-input{width:100%;box-sizing:border-box;margin:0;padding:.7em .8em;border-radius:.45em;background:#464c6b;color:#fff;font-size:1em}
.allocation-error{display:block;margin-top:.6em;color:#ff9ab1;font-size:.85em}
.allocation-quote{margin-top:.8em;padding:.7em .8em;border-radius:.5em;background:#464c6b}
.allocation-quote>view{display:flex;justify-content:space-between;gap:.8em;padding:.2em 0;font-size:.88em}
.allocation-quote text:first-child{color:#989eb6}
@media(max-width:340px){.income-fact{flex-direction:column;gap:.15em}.income-fact>view{text-align:left}}
</style>
