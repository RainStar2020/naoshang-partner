<template>
 <view class="agency-detail feature-page">
  <FeaturePageState :status="status" :error="error" @retry="load"/>
  <template v-if="status==='ready' && data">
   <view class="agency-detail-person"><view class="detail-avatar">{{data.node.name?.slice(0,1) || '团'}}</view><view><view>{{data.node.name}}</view><view><text class="detail-tag">{{data.node.levelLabel || '区域代理'}}</text><text>ID　{{data.node.displayId || data.node.id}}</text><text v-if="data.node.phone">手机　{{data.node.phone}}</text></view></view></view>
   <view class="agency-detail-summary"><view>业绩统计　<text>{{data.node.scopeLabel || '授权范围由后台提供'}}</text></view><view class="detail-metrics"><view v-for="metric in data.node.performance||[]" :key="metric.label"><text>{{metric.label}}</text><view>{{metric.kind==='money'?`¥${money(metric.value)}`:metric.value ?? '—'}}</view></view></view></view>
   <view class="detail-section-title">基础信息</view>
   <view class="detail-base"><view><text>门店数量</text><text>{{data.node.storeCount ?? '—'}}</text></view><view><text>合店老板数量</text><text>{{data.node.ownerCount ?? '—'}}</text></view><view v-if="data.node.createdAt"><text>最早开通时间</text><text>{{date(data.node.createdAt)}}</text></view></view>
   <view class="detail-section-title">{{childrenTitle}}</view>
   <button v-for="child in data.children.items" :key="child.id" class="detail-child" @click="open(child.id)"><view class="detail-avatar small">{{child.name?.slice(0,1) || '团'}}</view><view><view>{{child.name}} <text class="detail-tag">{{child.levelLabel || '区域代理'}}</text></view><text>ID　{{child.displayId || child.id}}</text><text v-if="child.phone">　手机　{{child.phone}}</text><view v-if="child.scopeLabel" class="child-scope">{{child.scopeLabel}}</view></view><text class="detail-arrow">›</text></button>
   <EmptyState v-if="!data.children.items.length" text="当前节点暂无下级团队"/>
   <button v-if="data.children.hasMore" class="detail-more" :disabled="loadingMore" @click="more">{{loadingMore?'加载中…':'加载更多'}}</button><text v-if="moreError" class="detail-error">{{moreError}}</text>
  </template>
 </view>
</template>

<script setup>
import {ref,watch,onUnmounted,computed} from 'vue'
import {money} from '../features/exclusive/format'
import {businessDateLabel as date} from '../features/business/format'
import {getBusinessContext,getBusinessTeamNode,getBusinessReport} from '../services/business'
import {useAsyncPage} from '../composables/useAsyncPage'
import FeaturePageState from './FeaturePageState.vue'
import EmptyState from './EmptyState.vue'
const props=defineProps({pageQuery:Object}),context=ref(null),loadingMore=ref(false),moreError=ref('');let active=true
const {data,status,error,load}=useAsyncPage(async()=>{if(!props.pageQuery?.nodeId)throw new Error('缺少团队节点编号');const ctx=await getBusinessContext('agency',props.pageQuery.contextId);context.value=ctx;const node=await getBusinessTeamNode(ctx.id,props.pageQuery.nodeId);const children=await getBusinessReport('agency','team',ctx.id,{parentNodeId:node.id});return {node,children}},false)
watch(()=>props.pageQuery,query=>{if(query)load()},{immediate:true})
const childrenTitle=computed(()=>data.value?.node?.childLabel || '下级团队')
function open(id){uni.navigateTo({url:`/pages/agency/team-detail?contextId=${encodeURIComponent(context.value.id)}&nodeId=${encodeURIComponent(id)}`})}
async function more(){if(loadingMore.value||!data.value?.children.hasMore)return;loadingMore.value=true;moreError.value='';try{const result=await getBusinessReport('agency','team',context.value.id,{parentNodeId:data.value.node.id,cursor:data.value.children.nextCursor});if(active)data.value.children={...result,items:[...data.value.children.items,...result.items]}}catch(reason){if(active)moreError.value=reason.message}finally{if(active)loadingMore.value=false}}
onUnmounted(()=>{active=false});defineExpose({refresh:load})
</script>

<style scoped>
.agency-detail{min-height:100vh;padding:24rpx;box-sizing:border-box;background:#272c47;color:#edf4ff}.agency-detail-person{display:flex;align-items:center;gap:16rpx;padding:20rpx;border-radius:20rpx;background:#343d61}.agency-detail-person>view:last-child{min-width:0;flex:1;font-size:29rpx;font-weight:700;line-height:1.65;overflow-wrap:anywhere}.agency-detail-person>view:last-child>view:last-child{display:flex;gap:10rpx;flex-wrap:wrap;color:#a7b8d2;font-size:20rpx;font-weight:400}.detail-avatar{width:70rpx;height:70rpx;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:linear-gradient(145deg,#a7dcff,#3152a1);color:#162a53;font-size:30rpx}.detail-avatar.small{width:54rpx;height:54rpx;font-size:24rpx}.detail-tag{display:inline-block;padding:2rpx 10rpx;border-radius:20rpx;background:#078eea;color:#fff;font-size:18rpx;line-height:1.5}.agency-detail-summary{margin-top:18rpx;padding:20rpx;border-radius:18rpx;background:#343d61;color:#aabbd5;font-size:22rpx;line-height:1.6}.agency-detail-summary>view:first-child text{color:#54baff}.detail-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4rpx;margin-top:16rpx;overflow:hidden;border-radius:10rpx;background:#4a5374}.detail-metrics>view{padding:12rpx 6rpx;background:#40496b;text-align:center;min-width:0}.detail-metrics text{display:block;color:#a9b9d3;font-size:19rpx;line-height:1.5}.detail-metrics>view>view{font-size:22rpx;line-height:1.6;overflow-wrap:anywhere}.detail-section-title{margin:28rpx 4rpx 16rpx;padding-left:12rpx;border-left:5rpx solid #00adff;font-size:28rpx;font-weight:700}.detail-base{padding:18rpx 20rpx;border-radius:18rpx;background:#343d61}.detail-base>view{display:flex;justify-content:space-between;gap:20rpx;padding:8rpx 0;font-size:23rpx;line-height:1.6}.detail-base>view text:first-child{color:#a7b8d2}.detail-base>view text:last-child{text-align:right;overflow-wrap:anywhere}.detail-child{display:flex;width:100%;align-items:center;gap:14rpx;margin:0 0 14rpx;padding:18rpx;text-align:left;background:#343d61;color:#fff;border-radius:16rpx}.detail-child>view:nth-child(2){min-width:0;flex:1;font-size:25rpx;line-height:1.55;overflow-wrap:anywhere}.detail-child>view:nth-child(2)>text{color:#a9bad4;font-size:20rpx}.child-scope{margin-top:6rpx;color:#5dc0ff;font-size:20rpx}.detail-arrow{font-size:42rpx;color:#a7b8d2}.detail-more{display:block;margin:22rpx auto;padding:10rpx 30rpx;border-radius:30rpx;background:#434c6d;color:#dceaff;font-size:23rpx}.detail-error{display:block;color:#ff9ab1;font-size:22rpx}@media(max-width:340px){.agency-detail{padding:20rpx}.detail-metrics text{font-size:17rpx}.detail-metrics>view>view{font-size:20rpx}}
</style>
