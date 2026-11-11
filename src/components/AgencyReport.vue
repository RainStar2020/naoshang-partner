<style scoped>
.agency-report button.income-card { margin: 0 0 1em; }
</style>
<template>
 <view class="agency-report feature-page">
  <FeaturePageState :status="status" :error="error" mode="skeleton" skeleton-variant="metrics" @retry="load"/>
  <template v-if="status==='ready' && report">
   <template v-if="toolId==='team'">
    <view v-for="item in items" :key="item.id" class="agency-team-card">
     <view class="agency-team-person">
      <view class="agency-avatar-wrap"><image v-if="item.avatarUrl" :src="item.avatarUrl" mode="aspectFill"/><view v-else>{{item.name?.slice(0,1) || '团'}}</view><text>{{agencyLevel(item)}}</text></view>
      <view class="agency-person-copy">
       <view>{{item.name}}</view>
       <view class="agency-id-row">
        <view v-if="item.displayId" class="agency-meta-pill"><text class="agency-meta-label">ID</text><text class="agency-meta-value">{{item.displayId}}</text></view>
        <view v-if="item.phone" class="agency-meta-pill"><text class="agency-meta-label">手机号</text><text class="agency-meta-value">{{item.phone}}</text></view>
       </view>
      </view>
     </view>
     <view class="agency-team-performance">
      <view class="agency-performance-heading">
       <text>业绩统计</text>
       <view v-if="scopeSummary(item).kind==='regional'" class="agency-store-summary">代理<template v-if="scopeSummary(item).preview">{{scopeSummary(item).preview}}等</template><em>{{scopeSummary(item).count}}</em>个{{scopeSummary(item).unit}}</view>
       <view v-else class="agency-store-summary">代理 <em>{{scopeSummary(item).storeCount}}</em> 个门店，<em>{{scopeSummary(item).ownerCount}}</em> 个合店老板</view>
      </view>
      <view class="agency-metric-row">
       <view v-for="metric in teamMetrics(item)" :key="metric.label"><text>{{metric.label}}</text><view v-if="!metricPending(metric)">{{teamMetric(metric)}}</view><MetricSkeleton v-else size="compact" :inline="false"/></view>
      </view>
     </view>
     <button class="agency-primary" @click="teamDetail(item.id)">查看详情</button>
    </view>
    <EmptyState v-if="!items.length" text="当前区域暂无下级团队"/>
   </template>
   <template v-else>
    <view class="income-hero">
     <view><text>代理积分</text><view v-if="!totalAmountPending">{{money(totalAmount)}}</view><MetricSkeleton v-else size="block" :inline="false"/></view>
     <view class="income-actions"><button @click="withdrawRecords">兑换记录</button><button class="solid" @click="withdrawApply">积分兑换</button></view>
    </view>
    <view class="income-channels"><view v-for="item in channelMetrics" :key="item.label"><text>{{item.label}}</text><view v-if="!channelPending(item)">{{money(item.value)}}</view><MetricSkeleton v-else size="compact" :inline="false"/></view></view>
    <view class="income-heading"><text>代理积分明细</text><button :class="{selected:filter==='pending'}" @click="setFilter(filter==='pending'?'':'pending')"><view class="income-radio"/>筛选待处理记录</button></view>
    <button v-for="item in items" :key="item.id" class="income-card" @click="incomeDetail(item.id)">
     <view class="income-card-copy"><text>{{memberLabel(item)}}</text><view>{{item.title || item.bizTypeLabel || '积分记录'}}</view><text>{{timeLabel(item)}}</text><text v-if="item.pendingNote" class="income-note">{{item.pendingNote}}</text></view>
     <view class="income-card-side"><text class="income-channel">{{channelLabel(item)}}</text><view v-if="signedAmount(item.amount)!=null">{{signedAmount(item.amount)}}</view><MetricSkeleton v-else size="compact" :inline="false"/><text>查看详情</text></view>
    </button>
    <EmptyState v-if="!items.length" text="暂无代理积分记录"/>
   </template>
   <button v-if="hasMore" class="agency-more" :disabled="loadingMore" @click="more">{{loadingMore?'加载中…':'加载更多'}}</button><text v-if="moreError" class="agency-error">{{moreError}}</text>
  </template>
  <view v-if="contextOpen" class="agency-mask" @click="contextOpen=false"><view class="agency-context-sheet" @click.stop><view>切换身份<button aria-label="关闭身份切换" @click="contextOpen=false"><image src="/static/common/icon-close.png" mode="aspectFit"/></button></view><button v-for="item in agencyContexts" :key="item.id" @click="chooseContext(item.id)"><view>{{item.regionLabel || item.label}}<text>{{item.scopeLabel}}</text></view><image :src="item.id===context?.id?'/static/common/icon-radio-checked.png':'/static/common/icon-chevron-right.png'" mode="aspectFit"/></button></view></view>
 </view>
</template>

<script setup>
import {computed, onUnmounted, ref, watch} from 'vue'
import {money, percent} from '../features/exclusive/format'
import {businessDateLabel as date} from '../features/business/format'
import {agencyTeamLevelLabel, agencyTeamScopeSummary, fillAgencyTeamMetrics} from '../features/agency/team-display'
import {formatSignedMetricMoney, pickMetricNumber} from '../features/business/metric-display'
import {getBusinessContext, getBusinessContexts, getBusinessReport, selectBusinessContext} from '../services/business'
import {useAsyncPage} from '../composables/useAsyncPage'
import FeaturePageState from './FeaturePageState.vue'
import MetricSkeleton from './MetricSkeleton.vue'
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
const format=(value,kind)=>kind==='money'?`${money(value)}积分`:kind==='percent'?percent(value):value??0
const metricPending=metric=>metric?.pending===true||pickMetricNumber(metric?.value)==null
const teamMetric=metric=>metric?.kind==='money'?money(metric.value??0):format(metric?.value,metric?.kind)
const teamMetrics=item=>fillAgencyTeamMetrics(item?.performance)
const agencyLevel=item=>agencyTeamLevelLabel(item)
const scopeSummary=item=>agencyTeamScopeSummary(item)
const metric=label=>report.value?.metrics?.find(item=>item.label===label)?.value
const channelMetrics=computed(()=>['B端','C端','供应链'].map(label=>{const apiValue=metric(label);if(apiValue!=null)return {label,value:apiValue,fromApi:true};const rows=(items.value||[]).filter(item=>channelLabel(item)===label);const itemValue=rows.reduce((sum,item)=>sum+(Number(item.amount)||0),0);return {label,value:itemValue,fromApi:false,pending:report.value?.metrics==null&&!rows.length}}))
const channelPending=item=>item?.pending===true||pickMetricNumber(item?.value)==null&&item?.fromApi!==true&&!(items.value||[]).length
const totalAmountRaw=computed(()=>pickMetricNumber(metric('收益合计'),metric('积分合计'),metric('可提现金额')))
const totalAmountPending=computed(()=>totalAmountRaw.value==null&&!(items.value||[]).length&&!report.value?.metrics)
const totalAmount=computed(()=>totalAmountRaw.value??(items.value||[]).reduce((sum,item)=>sum+(Number(item.amount)||0),0))
const signedAmount=value=>formatSignedMetricMoney(value,money)
const channelLabel=item=>item.incomeChannelLabel||item.incomeChannel||item.channel||({supply:'供应链',b:'B端',c:'C端'}[String(item.category||'').toLowerCase()]||'C端')
const memberLabel=item=>{const member=item.recommendedBy||item.party||item.beneficiary;return member?(member.phone?`${member.name||''}/${member.phone}`:member.name||''):(item.partyLabel||item.beneficiaryName||'')}
const timeLabel=item=>item.createdAt?date(item.createdAt):(item.occurredAt?date(item.occurredAt):(item.updatedAt?date(item.updatedAt):''))
function setFilter(value){if(filter.value!==value){filter.value=value;load()}}
async function chooseContext(id){try{const selected=await selectBusinessContext(id);contextId=selected.id;contextOpen.value=false;await load()}catch(reason){moreError.value=reason.message||'切换失败'}}
function teamDetail(id){uni.navigateTo({url:`/pages/agency/team-detail?contextId=${encodeURIComponent(context.value.id)}&nodeId=${encodeURIComponent(id)}`})}
function incomeDetail(id){uni.navigateTo({url:`/pages/income/detail?contextId=${encodeURIComponent(context.value.id)}&id=${encodeURIComponent(id)}`})}
function withdrawApply(){uni.navigateTo({url:`/pages/wallet/withdraw-apply?contextId=${encodeURIComponent(context.value.id)}`})}
function withdrawRecords(){uni.navigateTo({url:`/pages/wallet/withdrawals?contextId=${encodeURIComponent(context.value.id)}`})}
async function more(){if(loadingMore.value||!hasMore.value)return;const current=epoch;loadingMore.value=true;moreError.value='';try{const output=await getBusinessReport('agency',props.toolId,context.value.id,{filter:filter.value,keyword:keyword.value.trim(),cursor});if(active&&current===epoch){items.value=[...items.value,...output.items];hasMore.value=output.hasMore;cursor=output.nextCursor}}catch(reason){if(active&&current===epoch)moreError.value=reason.message}finally{if(active&&current===epoch)loadingMore.value=false}}
onUnmounted(()=>{active=false;++epoch})
defineExpose({refresh:load})
</script>

<style scoped>
.agency-report{min-height:100vh;padding:.85em;box-sizing:border-box;background:#272c47;color:#edf4ff;font-size:clamp(14px,3.7vw,16px)}.agency-report button{margin:0;color:inherit;font-size:inherit;line-height:inherit}.agency-report button::after{border:0}.income-hero{display:flex;align-items:center;justify-content:space-between;gap:.8em;margin-bottom:.8em}.income-hero>view:first-child>text{display:block;color:#c5cbe0;font-size:.85em}.income-hero>view:first-child>view{font-size:1.7em;font-weight:700;line-height:1.3}.income-actions{display:flex;gap:.5em;flex:none}.income-actions button{padding:.35em .85em;border-radius:2em;background:#464c6b;color:#d5dced;font-size:.82em;line-height:1.6}.income-actions .solid{background:linear-gradient(95deg,#0340ff,#009bff);color:#fff}.income-channels{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:.9em;padding:.7em .2em;border-radius:.55em;background:#464c6b;text-align:center}.income-channels>view{min-width:0}.income-channels>view+view{box-shadow:inset 1px 0 0 #5c6484}.income-channels text{display:block;color:#a8adc3;font-size:.78em}.income-channels view>view{margin-top:.15em;color:#fff;font-size:1.22em;font-weight:700;overflow-wrap:anywhere}.income-heading{display:flex;align-items:center;justify-content:space-between;gap:.6em;margin:.2em 0 .7em}.income-heading>text{position:relative;padding-left:.7em;font-weight:600}.income-heading>text::before{content:'';position:absolute;left:0;top:.2em;bottom:.2em;width:.22em;border-radius:1em;background:#3d8cff}.income-heading button{display:inline-flex;align-items:center;gap:.35em;padding:0;background:none;color:#c5cbe0;font-size:.82em}.income-radio{width:.85em;height:.85em;border:1px solid #8d95b0;border-radius:50%;box-sizing:border-box;flex:none}.income-heading button.selected{color:#57adff}.income-heading button.selected .income-radio{border-color:#57adff;background:radial-gradient(circle,#57adff 0 45%,transparent 50%)}.income-card{display:flex;width:100%;align-items:flex-start;justify-content:space-between;gap:.7em;margin:0 0 .7em;padding:.9em;box-sizing:border-box;border-radius:.75em;background:#353a59;text-align:left}.income-card-copy{min-width:0;flex:1}.income-card-copy>text,.income-card-copy>view{display:block}.income-card-copy>text{color:#989eb6;font-size:.78em;line-height:1.55}.income-card-copy>view{margin:.2em 0;color:#fff;font-size:1.08em;line-height:1.45;overflow-wrap:anywhere}.income-note{color:#989eb6!important}.income-card-side{flex:none;text-align:right}.income-channel{display:inline-block;padding:0 .95em;border-radius:1em;background:linear-gradient(100deg,#00b7ff,#3157ff);font-size:.7em;line-height:1.7}.income-card-side>view{margin:.3em 0;color:#fff;font-size:1.22em;font-weight:700;white-space:nowrap}.income-card-side>text:last-child{display:block;color:#4eb6ff;font-size:.88em}.agency-report-head{display:flex;align-items:center;justify-content:space-between;gap:16rpx;margin-bottom:24rpx}.agency-report-head>view>text{font-size:30rpx;font-weight:700}.agency-report-head>view>view{color:#9aaac8;font-size:22rpx;line-height:1.7}.agency-report-head button,.agency-more{margin:0;padding:10rpx 22rpx;border-radius:28rpx;background:#424b6c;color:#d8e7ff;font-size:23rpx;line-height:1.5}.agency-team-card{display:block;width:100%;margin:0 0 24rpx;padding:30rpx 24rpx 32rpx;box-sizing:border-box;border-radius:26rpx;background:#343d61;color:#fff;text-align:left}.agency-team-person{display:flex;align-items:flex-start;gap:20rpx}.agency-avatar-wrap{position:relative;width:108rpx;padding-bottom:36rpx;flex:0 0 108rpx}.agency-avatar-wrap image,.agency-avatar-wrap>view{width:104rpx;height:104rpx;border-radius:50%;background:#2f5da5;object-fit:cover}.agency-avatar-wrap>view{display:flex;align-items:center;justify-content:center;color:#152952;font-size:38rpx;font-weight:700}.agency-avatar-wrap text{position:absolute;left:50%;bottom:0;transform:translateX(-50%);min-width:112rpx;padding:7rpx 12rpx;border-radius:24rpx;background:linear-gradient(90deg,#00b8ee,#0c8dff);font-size:20rpx;line-height:1.35;text-align:center;white-space:nowrap;box-sizing:border-box}.agency-person-copy{min-width:0;flex:1;font-size:34rpx;font-weight:700;line-height:1.55;overflow-wrap:anywhere}.agency-id-row{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.4fr);gap:16rpx;margin-top:14rpx;font-size:22rpx;font-weight:400}.agency-meta-pill{min-width:0;display:flex;align-items:center;gap:10rpx;padding:9rpx 18rpx;border-radius:30rpx;background:#454e71;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.agency-meta-label{color:#a9b4cc;flex-shrink:0}.agency-meta-value{min-width:0;color:#fff;overflow:hidden;text-overflow:ellipsis}.agency-team-performance{margin-top:22rpx;padding:20rpx;border-radius:18rpx;background:#474f72}.agency-performance-heading{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16rpx;margin-bottom:20rpx;font-size:28rpx;font-weight:600;line-height:1.5}.agency-store-summary{min-width:0;color:#fff;font-size:25rpx;font-weight:500;overflow-wrap:anywhere}.agency-store-summary em{color:#59b6ff;font-style:normal;font-weight:700}.agency-metric-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));overflow:hidden;border-radius:18rpx;background:#30395d}.agency-metric-row>view{position:relative;min-height:102rpx;padding:17rpx 8rpx 12rpx;box-sizing:border-box;text-align:center;border:0}.agency-metric-row>view:not(:nth-child(3n))::after{content:'';position:absolute;top:20%;right:0;width:1rpx;height:60%;background:#566082}.agency-metric-row text{display:block;color:#abb6d0;font-size:22rpx;line-height:1.55}.agency-metric-row>view>view{color:#d6e7ff;font-size:32rpx;font-weight:700;line-height:1.55;overflow-wrap:anywhere}.agency-report .agency-primary{display:block;width:8.2em;max-width:100%;margin:.9em auto 0;padding:.4em 0;white-space:nowrap;border-radius:2em;background:linear-gradient(95deg,#0340ff,#009bff);color:#fff;font-size:.95em;line-height:1.6;text-align:center}.agency-income-summary{margin-bottom:20rpx;padding:24rpx;border-radius:20rpx;background:linear-gradient(130deg,#264d90,#293859)}.agency-income-summary>text{display:block;color:#a9bbd6;font-size:23rpx;line-height:1.6}.agency-income-summary>view{font-size:44rpx;font-weight:700;color:#36c8ff;line-height:1.35}.agency-income-tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16rpx;margin-bottom:16rpx}.agency-income-tabs button{margin:0;padding:12rpx;background:#444d6f;color:#aebdd4;border-radius:28rpx;font-size:24rpx;line-height:1.5}.agency-income-tabs button.selected{background:linear-gradient(90deg,#0b4cff,#009bf1);color:#fff}.agency-search{display:flex;gap:12rpx;margin-bottom:20rpx}.agency-search input{height:64rpx;min-width:0;flex:1;box-sizing:border-box;border-radius:32rpx;background:#414a6b;padding:0 24rpx;color:#fff;font-size:24rpx}.agency-search button{margin:0;padding:0 26rpx;border-radius:32rpx;background:#078eea;color:#fff;font-size:24rpx}.agency-income-card{display:block;width:100%;margin:0 0 20rpx;padding:22rpx;box-sizing:border-box;border-radius:20rpx;border:1rpx solid rgba(125,174,234,.22);background:linear-gradient(145deg,#3f588c 0%,#303c64 38%,#252c4a 100%);color:#fff;text-align:left}.agency-income-card-top{display:flex;justify-content:space-between;gap:16rpx}.agency-income-card-top>view:first-child{min-width:0;flex:1}.agency-income-card-top>view:first-child>text{display:block;color:#a9bad5;font-size:20rpx;line-height:1.6;overflow-wrap:anywhere}.agency-income-card-top>view:first-child>view{font-size:26rpx;font-weight:600;line-height:1.6;overflow-wrap:anywhere}.agency-income-card-top>view:last-child{text-align:right;flex-shrink:0}.agency-channel{display:inline-block;padding:2rpx 10rpx;border-radius:20rpx;background:#078eea;color:#fff;font-size:19rpx;line-height:1.5}.agency-income-amount{margin-top:8rpx;font-size:31rpx;font-weight:700;color:#44c8ff}.agency-income-lines{display:flex;justify-content:space-between;gap:16rpx;flex-wrap:wrap;margin-top:16rpx;color:#aebdd4;font-size:21rpx;line-height:1.6}.agency-pending{margin-top:14rpx;color:#60c8ff;font-size:21rpx}.agency-error{display:block;margin:16rpx 0;color:#ff9ab1;font-size:23rpx}.agency-mask{position:fixed;z-index:100;inset:0;display:flex;align-items:flex-end;background:#000a}.agency-context-sheet{width:100%;max-height:78vh;overflow-y:auto;box-sizing:border-box;padding:32rpx;border-radius:32rpx 32rpx 0 0;background:#343d62}.agency-context-sheet>view:first-child{display:flex;justify-content:center;align-items:center;font-size:30rpx;font-weight:700}.agency-context-sheet>view button{position:absolute;right:30rpx;margin:0;padding:0;background:none}.agency-context-sheet>view button image{width:34rpx;height:34rpx}.agency-context-sheet>button{display:flex;width:100%;align-items:center;justify-content:space-between;gap:20rpx;margin:20rpx 0 0;padding:18rpx;border-radius:14rpx;background:#454e70;color:#fff;text-align:left;font-size:27rpx}.agency-context-sheet button>view{min-width:0}.agency-context-sheet button text{display:block;color:#a6b7d1;font-size:21rpx}.agency-context-sheet button image{width:34rpx;height:34rpx;flex-shrink:0}@media(max-width:340px){.agency-report{padding:20rpx}.agency-team-card{padding-left:18rpx;padding-right:18rpx}.agency-avatar-wrap{width:92rpx;flex-basis:92rpx}.agency-avatar-wrap image,.agency-avatar-wrap>view{width:88rpx;height:88rpx}.agency-avatar-wrap text{min-width:94rpx;font-size:18rpx}.agency-person-copy{font-size:30rpx}.agency-id-row{gap:8rpx;font-size:19rpx}.agency-meta-pill{padding:8rpx 10rpx}.agency-performance-heading{font-size:25rpx}.agency-store-summary{font-size:21rpx}.agency-metric-row text{font-size:18rpx}.agency-metric-row>view>view{font-size:24rpx}.agency-income-summary>view{font-size:38rpx}}
</style>
