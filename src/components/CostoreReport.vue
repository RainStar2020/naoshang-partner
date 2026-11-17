<template>
 <view class="wholesale-ui">
  <view class="wh-body">
   <FeaturePageState :status="status" :error="error" mode="skeleton" skeleton-variant="metrics" @retry="load"/>
   <template v-if="status==='ready' && report">
    <template v-if="toolId==='income'">
     <view class="income-head">
      <view v-for="metric in report.metrics" :key="metric.label"><text>{{metric.label}}</text><view v-if="metricNumber(metric.value)!=null">{{money(metric.value)}}</view><MetricSkeleton v-else size="block" :inline="false"/></view>
     </view>
     <view class="income-actions">
      <button v-if="canWallet('read')" class="wh-secondary wh-pill" @click="wallet('withdrawals')">提现记录</button>
      <button v-if="canWallet('withdraw')" class="wh-primary wh-pill" @click="wallet('withdraw-apply')">申请提现</button>
     </view>
     <view class="wh-section-heading"><text/>收益明细</view>
     <WholesaleRecordCard v-for="item in items" :key="item.id" :kicker="item.sourceName" :title="item.title" :caption="incomeCaption(item)" :amount="plusAmount(item.amount)" :badge="item.bizChannelLabel || item.channel || '收益'" accent>
      <WholesaleStatSplit v-if="item.details?.length" divided :items="item.details.map(detail=>({label:detail.label,value:show(detail.value,detail.kind)}))"/>
     </WholesaleRecordCard>
     <EmptyState v-if="!items.length" text="暂无收益"/>
    </template>
    <template v-else>
     <view class="wh-global-summary">
      <view class="wh-center dividend-month-title">{{dividendTitle}}</view>
      <view class="wh-metrics dividend-metrics"><view v-for="metric in report.metrics" :key="metric.label"><text>{{metric.label}}</text><view v-if="!metricCellPending(metric)" class="dividend-metric-value">{{show(metric.value,metric.kind)}}</view><MetricSkeleton v-else size="compact" :inline="false"/></view></view>
      <view class="wh-split wh-summary-four wh-divided dividend-info"><view v-for="metric in report.info || report.summary || []" :key="metric.label"><text>{{metric.label}}</text><view v-if="!metricCellPending(metric)" class="dividend-number">{{show(metric.value,metric.kind)}}</view><MetricSkeleton v-else size="compact" :inline="false"/></view></view>
     </view>
     <view v-if="poolAmount!=null" class="costore-pool">
      <text>门店分红池</text>
      <view>{{money(poolAmount)}}</view>
      <text>不可提现，按周期结算</text>
     </view>
     <view v-if="report.columns?.length && items.length" class="wh-table-frame dividend-table"><scroll-view scroll-x class="wh-table-scroll"><view class="wh-table"><view class="wh-tr head"><text v-for="column in report.columns" :key="column.key" class="wh-td">{{column.label}}</text></view><view v-for="item in items" :key="item.id" class="wh-tr"><text v-for="column in report.columns" :key="column.key" class="wh-td">{{show(item[column.key],column.kind)}}</text></view></view></scroll-view></view>
     <template v-else>
      <WholesaleRecordCard v-for="item in items" :key="item.id" :title="item.title" :caption="date(item.createdAt)" :amount="plusAmount(item.amount)" :badge="item.bizChannelLabel || item.channel || item.title || '收益'" accent/>
     </template>
     <EmptyState v-if="!hasDividendPageData" text="暂无分红"/>
     <button v-if="hasMore" class="wh-secondary wh-pill" :disabled="loadingMore" @click="more">{{loadingMore?'加载中…':'加载更多'}}</button>
     <text v-if="moreError" class="wh-error">{{moreError}}</text>
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
import {pickMetricNumber} from '../features/business/metric-display'
import {getBusinessContext, getBusinessReport} from '../services/business'
import { unsettledIncomeNote } from '../features/business/income-status'
import {useAsyncPage} from '../composables/useAsyncPage'
import FeaturePageState from './FeaturePageState.vue'
import MetricSkeleton from './MetricSkeleton.vue'
import EmptyState from './EmptyState.vue'
import WholesaleRecordCard from './WholesaleRecordCard.vue'
import WholesaleStatSplit from './WholesaleStatSplit.vue'
const props=defineProps({toolId:String,pageQuery:Object})
const context=ref(null),items=ref([]),month=ref(new Date().toISOString().slice(0,7)),hasMore=ref(false),loadingMore=ref(false),moreError=ref('')
let cursor=null,epoch=0
let active=true
const names=['','一','二','三','四','五','六','七','八','九','十','十一','十二']
const {data:report,status,error,load}=useAsyncPage(async()=>{const ctx=await getBusinessContext('costore',props.pageQuery?.contextId);context.value=ctx;return getBusinessReport('costore',props.toolId,ctx.id,{})},false)
watch(()=>props.pageQuery,query=>{if(query)load()},{immediate:true})
watch(report,value=>{items.value=value?.items||[];hasMore.value=value?.hasMore===true;cursor=value?.nextCursor||null})
watch(status,value=>{if(value==='loading'){++epoch;loadingMore.value=false;moreError.value=''}})
const poolAmount=computed(()=>{const amount=Number(report.value?.dividendPool);return Number.isFinite(amount)?amount:null})
const dividendTitle=computed(()=>{
  const reportMonth=report.value?.currentMonth?.month||report.value?.items?.[0]?.month||month.value
  const index=Number(String(reportMonth).match(/(?:-|\/)(\d{1,2})(?:-|\/|$)/)?.[1])
  const label=names[index]||String(index||new Date().getMonth()+1)
  return props.toolId==='promotion-dividends'?`${label}月推广合店老板分红`:`${label}月会员卡分红`
})
const hasDividendPageData=computed(()=>items.value.length>0||poolAmount.value!=null||(report.value?.metrics||[]).some(metric=>!metricCellPending(metric))||(report.value?.info||report.value?.summary||[]).some(metric=>!metricCellPending(metric)))
function incomeCaption(item){const parts=[date(item.createdAt),item.withdrawable===false||item.pendingNote?item.pendingNote||unsettledIncomeNote(item):''];return parts.filter(Boolean).join(' · ')}
const metricNumber=value=>pickMetricNumber(value)
const metricCellPending=metric=>metric?.kind==='percent'?metric?.value==null||metric?.value==='':pickMetricNumber(metric?.value)==null
const show=(value,kind)=>kind==='money'?money(value):kind==='percent'?percent(value):(value??0)
const plusAmount=value=>{const n=pickMetricNumber(value);return n==null?'':`+${money(n).replace(/\.00$/,'')}`}
const canWallet=id=>businessPreview(config)||context.value?.capabilities?.includes(`wallet:${id}`)
function wallet(page){uni.navigateTo({url:`/pages/wallet/${page}?contextId=${context.value.id}`})}
async function more(){if(loadingMore.value||!hasMore.value)return;loadingMore.value=true;const current=epoch;try{const result=await getBusinessReport('costore',props.toolId,context.value.id,{cursor});if(current===epoch){items.value=[...new Map([...items.value,...(result.items||[])].map(item=>[item.id,item])).values()];hasMore.value=result.hasMore===true;cursor=result.nextCursor||null}}catch(reason){if(current===epoch)moreError.value=reason.message}finally{if(current===epoch)loadingMore.value=false}}
onUnmounted(()=>{active=false})
defineExpose({refresh(opts){if(active)load(opts)}})
</script>
<style>@import '../styles/wholesale.css';</style>
<style scoped>
.income-head{display:grid;grid-template-columns:1fr 1fr;gap:.6em;margin:.4em 0 .8em;text-align:center}
.income-head text{display:block;color:#989eb6;font-size:.82em}
.income-head view>view{margin-top:.15em;color:#fff;font-size:1.4em;font-weight:700}
.income-actions{display:flex;justify-content:center;gap:.8em;margin-bottom:1em}
.wh-center{text-align:center}
.wh-month-arrow{width:1em;height:1em;transform:rotate(90deg);vertical-align:middle}
.wh-summary-four{grid-template-columns:repeat(4,minmax(0,1fr));margin:.5em}
.wh-summary-four>view{overflow-wrap:normal}
.wh-summary-four text{font-size:.68em;line-height:1.35}
.wh-summary-four>view>view{white-space:nowrap;font-size:.78em}
.wh-global-summary{margin:0 -.75em 1em;background:#353a59;padding:.8em .5em}
.wh-global-summary .wh-center{margin-bottom:.5em}
.dividend-month-title{padding:.45em .6em;background:#454b6b;color:#fff;font-size:1.25em;font-weight:600}
.dividend-metrics text{font-size:.88em}
.dividend-metric-value{margin-top:.1em;color:#D6E7FF;font-size:1.45em;font-weight:700;line-height:1.3}
.dividend-info text{font-size:.7em;white-space:nowrap;letter-spacing:-.04em}
.dividend-number{color:#D6E7FF;font-size:.95em}
.dividend-table .wh-tr:not(.head) .wh-td{color:#D6E7FF;font-size:1.08em}
.costore-pool{margin:0 0 1em;padding:.85em .9em;border-radius:.75em;background:#353a59;text-align:center}
.costore-pool>text:first-child{display:block;color:#989eb6;font-size:.82em}
.costore-pool>view{margin:.2em 0;color:#D6E7FF;font-size:1.4em;font-weight:700}
.costore-pool>text:last-child{display:block;color:#989eb6;font-size:.78em}
</style>
