<template>
 <view class="quota-page">
  <BusinessPageHeader title="划转明细" fallback="/pages/partners/index"/>
  <view class="quota-body">
   <FeaturePageState :status="status" :error="error" mode="skeleton" skeleton-variant="list" @retry="load"/>
   <template v-if="status==='ready' && report">
    <view v-for="item in items" :key="item.id" class="quota-card">
     <view class="quota-card-head">
      <text class="quota-title">{{titleOf(item)}}</text>
      <text class="quota-qty">{{signedQty(item)}}</text>
     </view>
     <view class="quota-meta">
      <text class="quota-meta-item">时间：{{time(item.at)}}</text>
      <text class="quota-meta-item">下级ID：{{item.downlineId || '—'}}</text>
      <text class="quota-meta-item">下级等级：{{tier(item.downlineTier)}}</text>
     </view>
    </view>
    <EmptyState v-if="!items.length" text="暂无划转记录"/>
    <button v-if="hasMore" class="quota-more" :disabled="loadingMore" @click="more">{{loadingMore?'加载中…':'加载更多'}}</button>
    <text v-if="moreError" class="quota-error">{{moreError}}</text>
   </template>
  </view>
 </view>
</template>
<script setup>
import {ref,watch,onUnmounted} from 'vue'
import {getBusinessContext,getBusinessReport} from '../services/business'
import {useAsyncPage} from '../composables/useAsyncPage'
import BusinessPageHeader from './BusinessPageHeader.vue'
import FeaturePageState from './FeaturePageState.vue'
import EmptyState from './EmptyState.vue'
const props=defineProps({query:Object}),context=ref(null),items=ref([]),hasMore=ref(false),loadingMore=ref(false),moreError=ref('')
let cursor=null,epoch=0
const {data:report,status,error,load}=useAsyncPage(async()=>{const ctx=await getBusinessContext('wholesale',props.query?.contextId);context.value=ctx;return getBusinessReport('wholesale','quota-transfers',ctx.id,{})},false)
watch(()=>props.query,value=>{if(value)load()},{immediate:true})
watch(report,value=>{if(value){items.value=value.items;hasMore.value=value.hasMore;cursor=value.nextCursor}})
watch(status,value=>{if(value==='loading'){++epoch;loadingMore.value=false;moreError.value=''}})
const tier=value=>({cofounder:'联创合伙人',private:'私董合伙人',angel:'天使合伙人',vip:'VIP合伙人',store:'单店',district:'区县代'}[String(value||'').toLowerCase()]||value||'—')
function titleOf(item){return item.category==='upgrade'?'消耗名额升级':'划转VIP名额'}
function signedQty(item){const qty=Number(item.qty)||0;return item.direction==='in'?`+${qty}`:`-${qty}`}
function time(value){const date=new Date(value);if(Number.isNaN(date.getTime()))return '—';const p=n=>String(n).padStart(2,'0');return `${date.getFullYear()}-${p(date.getMonth()+1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`}
async function more(){if(loadingMore.value||!hasMore.value||!context.value)return;const current=epoch;loadingMore.value=true;try{const next=await getBusinessReport('wholesale','quota-transfers',context.value.id,{cursor});if(current===epoch){items.value=[...items.value,...next.items];hasMore.value=next.hasMore;cursor=next.nextCursor}}catch(reason){if(current===epoch)moreError.value=reason.message||'加载失败'}finally{if(current===epoch)loadingMore.value=false}}
onUnmounted(()=>{++epoch});defineExpose({refresh:load})
</script>
<style scoped>
.quota-page{min-height:100vh;background:#272c47;color:#edf3ff;font-size:clamp(14px,3.73vw,16px)}
.quota-body{width:min(750px,100%);margin:0 auto;padding:.85em;box-sizing:border-box}
.quota-card{margin-bottom:.75em;padding:.95em 1em;border-radius:.8em;background:#353a59}
.quota-card-head{display:flex;align-items:center;justify-content:space-between;gap:.8em;margin-bottom:.7em}
.quota-title{color:#fff;font-size:1.12em;font-weight:600;line-height:1.35}
.quota-qty{color:#53b8ff;font-size:1.55em;font-weight:600;line-height:1;flex-shrink:0}
.quota-meta{display:grid;grid-template-columns:1.35fr 1fr;gap:.28em .9em}
.quota-meta-item{color:#aab7ce;font-size:.84em;line-height:1.55;overflow-wrap:anywhere}
.quota-more{display:block;margin:.8em auto;padding:.3em .9em;border:0;border-radius:2em;background:#414a6b;color:#dbe8ff;font-size:.82em}
.quota-error{display:block;text-align:center;color:#ffb0bd;font-size:.82em}
</style>
