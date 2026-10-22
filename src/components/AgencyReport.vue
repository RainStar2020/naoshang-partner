<template>
 <view class="agency-report feature-page">
  <FeaturePageState :status="status" :error="error" @retry="load"/>
  <template v-if="status==='ready' && report">
   <view class="agency-report-head"><view><text>{{context.label}}</text><view>{{context.scopeLabel}}</view></view><button @click="contextOpen=true">切换身份</button></view>
   <template v-if="toolId==='team'">
    <view class="agency-team-caption"><text>区域团队</text><text>{{items.length}}个下级节点</text></view>
    <view v-for="item in items" :key="item.id" class="agency-team-card">
     <view class="agency-team-person"><view class="agency-team-avatar">{{item.name?.slice(0,1) || '团'}}</view><view><view>{{item.name}}</view><view class="agency-id-row"><text class="agency-tag">{{roleLabel(item)}}</text><text>ID　{{item.displayId || item.id}}</text><text v-if="item.phone">手机　{{item.phone}}</text></view></view></view>
     <view class="agency-team-scope">业务统计　<text>{{item.scopeLabel || '授权范围由后台提供'}}</text></view>
     <view class="agency-metric-row"><view v-for="metric in (item.performance||[]).slice(0,5)" :key="metric.label"><text>{{metric.label}}</text><view>{{format(metric.value,metric.kind)}}</view></view></view>
     <button class="agency-primary" @click="teamDetail(item.id)">查看详情</button>
    </view>
    <EmptyState v-if="!items.length" text="当前区域暂无下级团队"/>
   </template>
   <template v-else>
    <view class="agency-income-summary"><text>可提现收益</text><view>¥{{money(report.metrics?.find(item=>item.label==='可提现金额')?.value)}}</view><text>待结算收益 ¥{{money(report.metrics?.find(item=>item.label==='待结算收益')?.value)}}</text></view>
    <view class="agency-income-tabs"><button :class="{selected:filter===''}" @click="setFilter('')">全部收益</button><button :class="{selected:filter==='pending'}" @click="setFilter('pending')">待分配提点</button></view>
    <view class="agency-search"><input v-model="keyword" confirm-type="search" placeholder="输入订单号或收益类型" @confirm="load"/><button @click="load">搜索</button></view>
    <button v-for="item in items" :key="item.id" class="agency-income-card" @click="incomeDetail(item.id)"><view class="agency-income-card-top"><view><text>{{item.sourceOrder || `单号：${item.id}`}}</text><view>{{item.title}}</view><text>{{date(item.createdAt)}}</text></view><view><text class="agency-channel">{{item.channel || '收益'}}</text><view class="agency-income-amount">{{signed(item.amount)}}</view></view></view><view class="agency-income-lines"><text>本人与身份　{{item.identityLabel || context.label}}</text><text>业务提点　{{item.rateBps==null?'—':percent(item.rateBps)}}</text></view><view v-if="item.allocationStatus==='PENDING'" class="agency-pending">{{item.allocationKind==='inspection'?'巡查提点待分配':'销售提点待分配'}}</view><view v-else-if="item.settlementStatus==='PENDING_SETTLEMENT'" class="agency-pending">提点已分配，等待结算</view></button>
    <EmptyState v-if="!items.length" text="暂无收益记录"/>
   </template>
   <button v-if="hasMore" class="agency-more" :disabled="loadingMore" @click="more">{{loadingMore?'加载中…':'加载更多'}}</button><text v-if="moreError" class="agency-error">{{moreError}}</text>
  </template>
  <view v-if="contextOpen" class="agency-mask" @click.self="contextOpen=false"><view class="agency-context-sheet"><view>切换身份<button aria-label="关闭身份切换" @click="contextOpen=false"><image src="/static/common/icon-close.png" mode="aspectFit"/></button></view><button v-for="item in agencyContexts" :key="item.id" @click="chooseContext(item.id)"><view>{{item.regionLabel || item.label}}<text>{{item.scopeLabel}}</text></view><image :src="item.id===context?.id?'/static/common/icon-radio-checked.png':'/static/common/icon-chevron-right.png'" mode="aspectFit"/></button></view></view>
 </view>
</template>

<script setup>
import {computed, onUnmounted, ref, watch} from 'vue'
import {money, percent} from '../features/exclusive/format'
import {businessDateLabel as date} from '../features/business/format'
import {getBusinessContext, getBusinessContexts, getBusinessReport, selectBusinessContext} from '../services/business'
import {useAsyncPage} from '../composables/useAsyncPage'
import FeaturePageState from './FeaturePageState.vue'
import EmptyState from './EmptyState.vue'
const props=defineProps({toolId:String,pageQuery:Object})
const context=ref(null),contexts=ref([]),items=ref([]),filter=ref(''),keyword=ref(''),hasMore=ref(false),loadingMore=ref(false),moreError=ref(''),contextOpen=ref(false)
let cursor=null,epoch=0,active=true,contextId=''
const agencyContexts=computed(()=>contexts.value.filter(item=>item.module==='agency'))
const {data:report,status,error,load}=useAsyncPage(async()=>{const ctx=await getBusinessContext('agency',contextId||props.pageQuery?.contextId);context.value=ctx;contextId=ctx.id;const output=await getBusinessReport('agency',props.toolId,ctx.id,{filter:filter.value,keyword:keyword.value.trim()});return output},false)
watch(()=>props.pageQuery,query=>{if(query)load()},{immediate:true})
watch(status,value=>{if(value==='loading'){++epoch;loadingMore.value=false;moreError.value=''}})
watch(report,value=>{if(value){items.value=value.items;hasMore.value=value.hasMore;cursor=value.nextCursor}})
watch(contextOpen,async open=>{if(open&&!contexts.value.length){try{contexts.value=await getBusinessContexts()}catch(reason){moreError.value=reason.message}}})
const format=(value,kind)=>kind==='money'?`¥${money(value)}`:kind==='percent'?percent(value):value??'—'
const signed=value=>value==null?'—':`${value>0?'+':''}¥${money(value)}`
const roleLabel=item=>item.levelLabel || item.roleLabel || '区域代理'
function setFilter(value){if(filter.value!==value){filter.value=value;load()}}
async function chooseContext(id){try{const selected=await selectBusinessContext(id);contextId=selected.id;contextOpen.value=false;await load()}catch(reason){moreError.value=reason.message||'切换失败'}}
function teamDetail(id){uni.navigateTo({url:`/pages/agency/team-detail?contextId=${encodeURIComponent(context.value.id)}&nodeId=${encodeURIComponent(id)}`})}
function incomeDetail(id){uni.navigateTo({url:`/pages/income/detail?contextId=${encodeURIComponent(context.value.id)}&id=${encodeURIComponent(id)}`})}
async function more(){if(loadingMore.value||!hasMore.value)return;const current=epoch;loadingMore.value=true;moreError.value='';try{const output=await getBusinessReport('agency',props.toolId,context.value.id,{filter:filter.value,keyword:keyword.value.trim(),cursor});if(active&&current===epoch){items.value=[...items.value,...output.items];hasMore.value=output.hasMore;cursor=output.nextCursor}}catch(reason){if(active&&current===epoch)moreError.value=reason.message}finally{if(active&&current===epoch)loadingMore.value=false}}
onUnmounted(()=>{active=false;++epoch})
defineExpose({refresh:load})
</script>

<style scoped>
.agency-report{min-height:100vh;padding:24rpx;box-sizing:border-box;background:#272c47;color:#edf4ff}.agency-report-head{display:flex;align-items:center;justify-content:space-between;gap:16rpx;margin-bottom:24rpx}.agency-report-head>view>text{font-size:30rpx;font-weight:700}.agency-report-head>view>view{color:#9aaac8;font-size:22rpx;line-height:1.7}.agency-report-head button,.agency-more{margin:0;padding:10rpx 22rpx;border-radius:28rpx;background:#424b6c;color:#d8e7ff;font-size:23rpx;line-height:1.5}.agency-team-caption{display:flex;justify-content:space-between;align-items:center;margin:12rpx 4rpx 20rpx;font-size:30rpx;font-weight:700}.agency-team-caption text:last-child{color:#9eafd0;font-size:22rpx;font-weight:400}.agency-team-card,.agency-income-card{display:block;width:100%;margin:0 0 20rpx;padding:22rpx;box-sizing:border-box;border-radius:20rpx;background:#343d61;color:#fff;text-align:left}.agency-team-person{display:flex;gap:16rpx;align-items:center}.agency-team-person>view:last-child{min-width:0;flex:1;font-size:28rpx;font-weight:600;overflow-wrap:anywhere}.agency-team-avatar{width:68rpx;height:68rpx;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,#a7dcff,#3152a1);color:#152952;font-size:30rpx}.agency-id-row{display:flex;gap:10rpx;flex-wrap:wrap;margin-top:5rpx;color:#aabbd5;font-size:20rpx;font-weight:400}.agency-tag,.agency-channel{display:inline-block;padding:2rpx 10rpx;border-radius:20rpx;background:#078eea;color:#fff;font-size:19rpx;line-height:1.5}.agency-team-scope{margin:18rpx 0 12rpx;padding:12rpx 14rpx;border-radius:10rpx;background:#404a6e;color:#abbcd6;font-size:22rpx;line-height:1.6}.agency-team-scope text{color:#57baff}.agency-metric-row{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4rpx;border-radius:10rpx;overflow:hidden;background:#4a5374}.agency-metric-row>view{padding:12rpx 5rpx;background:#3d4669;text-align:center;min-width:0}.agency-metric-row text{display:block;color:#9eafd0;font-size:18rpx;line-height:1.5}.agency-metric-row>view>view{font-size:20rpx;line-height:1.6;overflow-wrap:anywhere}.agency-primary{display:block;margin:18rpx auto 0;padding:8rpx 42rpx;border-radius:28rpx;background:linear-gradient(90deg,#0b4cff,#009bf1);color:#fff;font-size:23rpx;line-height:1.5}.agency-income-summary{margin-bottom:20rpx;padding:24rpx;border-radius:20rpx;background:linear-gradient(130deg,#264d90,#293859)}.agency-income-summary>text{display:block;color:#a9bbd6;font-size:23rpx;line-height:1.6}.agency-income-summary>view{font-size:44rpx;font-weight:700;color:#36c8ff;line-height:1.35}.agency-income-tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16rpx;margin-bottom:16rpx}.agency-income-tabs button{margin:0;padding:12rpx;background:#444d6f;color:#aebdd4;border-radius:28rpx;font-size:24rpx;line-height:1.5}.agency-income-tabs button.selected{background:linear-gradient(90deg,#0b4cff,#009bf1);color:#fff}.agency-search{display:flex;gap:12rpx;margin-bottom:20rpx}.agency-search input{height:64rpx;min-width:0;flex:1;box-sizing:border-box;border-radius:32rpx;background:#414a6b;padding:0 24rpx;color:#fff;font-size:24rpx}.agency-search button{margin:0;padding:0 26rpx;border-radius:32rpx;background:#078eea;color:#fff;font-size:24rpx}.agency-income-card-top{display:flex;justify-content:space-between;gap:16rpx}.agency-income-card-top>view:first-child{min-width:0;flex:1}.agency-income-card-top>view:first-child>text{display:block;color:#a9bad5;font-size:20rpx;line-height:1.6;overflow-wrap:anywhere}.agency-income-card-top>view:first-child>view{font-size:26rpx;font-weight:600;line-height:1.6;overflow-wrap:anywhere}.agency-income-card-top>view:last-child{text-align:right;flex-shrink:0}.agency-income-amount{margin-top:8rpx;font-size:31rpx;font-weight:700;color:#44c8ff}.agency-income-lines{display:flex;justify-content:space-between;gap:16rpx;flex-wrap:wrap;margin-top:16rpx;color:#aebdd4;font-size:21rpx;line-height:1.6}.agency-pending{margin-top:14rpx;color:#60c8ff;font-size:21rpx}.agency-error{display:block;margin:16rpx 0;color:#ff9ab1;font-size:23rpx}.agency-mask{position:fixed;z-index:100;inset:0;display:flex;align-items:flex-end;background:#000a}.agency-context-sheet{width:100%;max-height:78vh;overflow-y:auto;box-sizing:border-box;padding:32rpx;border-radius:32rpx 32rpx 0 0;background:#343d62}.agency-context-sheet>view:first-child{display:flex;justify-content:center;align-items:center;font-size:30rpx;font-weight:700}.agency-context-sheet>view button{position:absolute;right:30rpx;margin:0;padding:0;background:none}.agency-context-sheet>view button image{width:34rpx;height:34rpx}.agency-context-sheet>button{display:flex;width:100%;align-items:center;justify-content:space-between;gap:20rpx;margin:20rpx 0 0;padding:18rpx;border-radius:14rpx;background:#454e70;color:#fff;text-align:left;font-size:27rpx}.agency-context-sheet button>view{min-width:0}.agency-context-sheet button text{display:block;color:#a6b7d1;font-size:21rpx}.agency-context-sheet button image{width:34rpx;height:34rpx;flex-shrink:0}@media(max-width:340px){.agency-report{padding:20rpx}.agency-metric-row text{font-size:16rpx}.agency-metric-row>view>view{font-size:18rpx}.agency-income-summary>view{font-size:38rpx}}
</style>
