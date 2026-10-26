<template>
 <view class="wholesale-ui">
  <view class="wh-body">
   <FeaturePageState :status="status" :error="error" @retry="load"/>
   <template v-if="status==='ready' && report">
    <template v-if="toolId==='income'">
     <view class="income-head">
      <view v-for="metric in report.metrics" :key="metric.label"><text>{{metric.label}}</text><view>¥{{money(metric.value)}}</view></view>
     </view>
     <view class="income-actions">
      <button v-if="canWallet('read')" class="wh-secondary wh-pill" @click="wallet('withdrawals')">提现记录</button>
      <button v-if="canWallet('withdraw')" class="wh-primary wh-pill" @click="wallet('withdraw-apply')">申请提现</button>
     </view>
     <view class="wh-section-heading"><text/>收益明细</view>
     <WholesaleRecordCard v-for="item in items" :key="item.id" :kicker="item.sourceName" :title="item.title" :caption="date(item.createdAt)" :amount="plusAmount(item.amount)" :badge="item.channel || '收益'" accent>
      <WholesaleStatSplit v-if="item.details?.length" divided :items="item.details.map(detail=>({label:detail.label,value:show(detail.value,detail.kind)}))"/>
     </WholesaleRecordCard>
     <EmptyState v-if="!items.length" text="暂无收益"/>
    </template>
    <template v-else>
     <view class="wh-global-summary">
      <picker mode="date" fields="month" :value="month" @change="changeMonth"><view class="wh-center">{{monthTitle}} <image class="wh-month-arrow" src="/static/common/icon-chevron-right.png" mode="aspectFit"/></view></picker>
      <view v-if="report.eligibilityLabel" class="wh-center dividend-title">{{report.eligibilityLabel}}</view>
      <view v-if="report.eligibilityNote" class="wh-muted wh-center wh-eligibility-note">{{report.eligibilityNote}}</view>
      <view class="wh-metrics"><view v-for="metric in report.metrics" :key="metric.label"><text>{{metric.label}}</text><view>{{show(metric.value,metric.kind)}}</view></view></view>
      <view class="wh-split wh-summary-four wh-divided"><view v-for="metric in report.summary || []" :key="metric.label"><text>{{metric.label}}</text><view>{{show(metric.value,metric.kind)}}</view></view></view>
     </view>
     <view class="wh-table-frame"><scroll-view scroll-x class="wh-table-scroll"><view class="wh-table"><view class="wh-tr head"><text v-for="column in report.columns" :key="column.key" class="wh-td">{{column.label}}</text></view><view v-for="item in items" :key="item.id" class="wh-tr"><text v-for="column in report.columns" :key="column.key" class="wh-td">{{show(item[column.key],column.kind)}}</text></view></view></scroll-view></view>
     <EmptyState v-if="!items.length" text="暂无分红"/>
    </template>
   </template>
  </view>
 </view>
</template>
<script setup>
import {computed, ref, watch, onUnmounted} from 'vue'
import {config} from '../config'
import {businessPreview} from '../features/business/catalog'
import {money, percent} from '../features/exclusive/format'
import {businessDateLabel as date} from '../features/business/format'
import {getBusinessContext, getBusinessReport} from '../services/business'
import {useAsyncPage} from '../composables/useAsyncPage'
import FeaturePageState from './FeaturePageState.vue'
import EmptyState from './EmptyState.vue'
import WholesaleRecordCard from './WholesaleRecordCard.vue'
import WholesaleStatSplit from './WholesaleStatSplit.vue'
const props=defineProps({toolId:String,pageQuery:Object})
const context=ref(null),items=ref([]),month=ref(new Date().toISOString().slice(0,7))
let active=true
const names=['','一','二','三','四','五','六','七','八','九','十','十一','十二']
const monthTitle=computed(()=>{const index=Number(String(month.value).slice(5,7));const label=names[index]||String(index);return props.toolId==='promotion-dividends'?`${label}月推广合店老板分红`:`${label}月会员卡分红`})
const {data:report,status,error,load}=useAsyncPage(async()=>{const ctx=await getBusinessContext('costore',props.pageQuery?.contextId);context.value=ctx;return getBusinessReport('costore',props.toolId,ctx.id,{month:month.value})},false)
watch(()=>props.pageQuery,query=>{if(query)load()},{immediate:true})
watch(report,value=>{items.value=value?.items||[]})
const show=(value,kind)=>value==null?'—':kind==='money'?`¥${money(value)}`:kind==='percent'?percent(value):value
const plusAmount=value=>!Number.isInteger(value)?'—':value%100===0?`+${value/100}`:`+${money(value)}`
const canWallet=id=>businessPreview(config)||context.value?.capabilities?.includes(`wallet:${id}`)
function wallet(page){uni.navigateTo({url:`/pages/wallet/${page}?contextId=${context.value.id}`})}
function changeMonth(event){month.value=event.detail.value;load()}
onUnmounted(()=>{active=false})
defineExpose({refresh(){if(active)load()}})
</script>
<style>@import '../styles/wholesale.css';</style>
<style scoped>
.income-head{display:grid;grid-template-columns:1fr 1fr;gap:.6em;margin:.4em 0 .8em;text-align:center}
.income-head text{display:block;color:#989eb6;font-size:.82em}
.income-head view>view{margin-top:.15em;font-size:1.25em;font-weight:700}
.income-actions{display:flex;justify-content:center;gap:.8em;margin-bottom:1em}
.dividend-title{margin-top:.4em;font-weight:700}
.wh-center{text-align:center}
.wh-month-arrow{width:1em;height:1em;transform:rotate(90deg);vertical-align:middle}
.wh-summary-four{grid-template-columns:repeat(4,minmax(0,1fr));margin:.5em}
.wh-summary-four>view{overflow-wrap:normal}
.wh-summary-four text{font-size:.68em;line-height:1.35}
.wh-summary-four>view>view{white-space:nowrap;font-size:.78em}
.wh-global-summary{margin:0 -.75em 1em;background:#353a59;padding:.8em .5em}
.wh-global-summary .wh-center{margin-bottom:.5em}
.wh-eligibility-note{display:block;margin-top:.15em;padding:0 .4em;font-size:.78em;line-height:1.6;overflow-wrap:anywhere}
</style>
