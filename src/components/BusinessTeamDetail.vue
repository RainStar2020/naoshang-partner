<template>
 <view class="agency-detail feature-page">
  <FeaturePageState :status="status" :error="error" @retry="load"/>
  <template v-if="status==='ready' && data">
   <view class="detail-person">
    <view class="detail-avatar-wrap">
     <image v-if="data.node.avatarUrl" :src="data.node.avatarUrl" mode="aspectFill"/>
     <view v-else>{{data.node.name?.slice(0,1) || '团'}}</view>
     <text>{{agencyLevel(data.node)}}</text>
    </view>
    <view class="detail-person-copy">
     <view>{{data.node.name}}</view>
     <view class="detail-id-row">
      <view class="detail-meta-pill"><text class="detail-meta-label">ID</text><text class="detail-meta-value">{{data.node.displayId || data.node.id}}</text></view>
      <view v-if="data.node.phone" class="detail-meta-pill"><text class="detail-meta-label">手机号</text><text class="detail-meta-value">{{data.node.phone}}</text></view>
     </view>
    </view>
   </view>
   <view class="detail-performance-card">
    <view class="detail-performance-heading">
     <text>业绩统计</text>
     <view v-if="scopeSummary(data.node).kind==='regional'" class="detail-store-summary">代理<template v-if="scopeSummary(data.node).preview">{{scopeSummary(data.node).preview}}等</template><em>{{scopeSummary(data.node).count}}</em>个{{scopeSummary(data.node).unit}}</view>
     <view v-else class="detail-store-summary">代理 <em>{{scopeSummary(data.node).storeCount}}</em> 个门店，<em>{{scopeSummary(data.node).ownerCount}}</em> 个合店老板</view>
    </view>
    <view class="detail-performance">
     <view v-for="metric in nodeMetrics" :key="metric.label">
      <text>{{metric.label}}</text>
      <strong>{{metricValue(metric)}}</strong>
     </view>
    </view>
   </view>
   <view class="detail-base-title">基础信息</view>
   <view class="detail-base">
    <view><text>合伙等级：</text><strong>{{data.node.partnerLevel || agencyLevel(data.node)}}</strong></view>
    <view><text>地区：</text><strong>{{data.node.regionLabel || ''}}</strong></view>
    <view v-if="isRegional"><text>代理区域：</text><strong>{{territoryText}}</strong></view>
    <view v-else><text>门店数量：</text><strong>{{storeCount(data.node)}}</strong></view>
    <view v-if="!isRegional"><text>合店老板数量：</text><strong>{{ownerCount(data.node)}}</strong></view>
    <view class="detail-base-wide"><text>{{isRegional?'最早代理时间：':'最早开店时间：'}}</text><strong>{{date(data.node.createdAt)}}</strong></view>
   </view>
   <template v-if="isRegional">
    <view class="detail-section-title">区域团队</view>
    <view v-if="territories.length" class="detail-territories"><button v-for="(area,index) in territories" :key="area" :class="{selected:territoryIndex===index}" @click="territoryIndex=index">{{area}}</button></view>
    <view v-for="child in displayedChildren" :key="child.id" class="detail-team-card" @click="open(child.id)">
     <view class="detail-team-heading">
      <image v-if="child.avatarUrl" :src="child.avatarUrl" mode="aspectFill"/>
      <view v-else>{{child.name?.slice(0,1) || '团'}}</view>
      <text>{{child.name}}</text>
      <em>{{agencyLevel(child)}}</em>
      <button>查看详情 ›</button>
     </view>
     <view class="detail-team-fields">
      <view><text>用户ID</text><strong>{{child.displayId || child.id}}</strong></view>
      <view><text>手机号</text><strong>{{child.phone || ''}}</strong></view>
      <view><text>门店数量</text><strong>{{storeCount(child)}}</strong></view>
      <view><text>合店老板数量</text><strong>{{ownerCount(child)}}</strong></view>
     </view>
    </view>
    <EmptyState v-if="!displayedChildren.length" text="当前区域暂无下级团队"/>
   </template>
   <template v-else-if="isStore">
    <view class="detail-tabs">
     <button :class="{selected:tab==='stores'}" @click="tab='stores'">门店详情</button>
     <button :class="{selected:tab==='owners'}" @click="tab='owners'">合店老板</button>
    </view>
    <view v-if="tab==='stores'" class="detail-store-list">
     <view v-for="store in storeRows" :key="store.id" class="detail-store-card">
      <image v-if="store.imageUrl" :src="store.imageUrl" mode="aspectFill"/>
      <view v-else class="detail-store-photo-empty">门店照片</view>
      <view>
       <view class="detail-store-name">{{store.name || '未命名门店'}} <em v-if="store.number">{{store.number}}</em></view>
       <text class="detail-store-address">{{store.address || '暂无地址'}}</text>
       <strong>合店费 ¥{{money(store.monthlyFee)}} / 月</strong>
      </view>
     </view>
     <EmptyState v-if="!storeRows.length" text="暂无门店详情"/>
    </view>
    <view v-else class="detail-owner-list">
     <view v-for="owner in data.node.owners||[]" :key="owner.id" class="detail-owner-card">
      <image v-if="owner.avatarUrl" :src="owner.avatarUrl" mode="aspectFill"/>
      <view>
       <view>{{owner.name}} <em>{{owner.partnerLevel}}</em></view>
       <text>合伙门店：{{owner.storeNames}}</text>
      </view>
     </view>
     <EmptyState v-if="!(data.node.owners||[]).length" text="暂无合店老板"/>
    </view>
   </template>
   <template v-else><EmptyState text="该成员暂无可展示的下级信息"/></template>
   <button v-if="data.children.hasMore" class="detail-more" :disabled="loadingMore" @click="more">{{loadingMore?'加载中…':'加载更多'}}</button>
   <text v-if="moreError" class="detail-error">{{moreError}}</text>
  </template>
 </view>
</template>

<script setup>
import {computed,ref,watch,onUnmounted} from 'vue'
import {money} from '../features/exclusive/format'
import {businessDateLabel as date} from '../features/business/format'
import {agencyTeamLevelLabel, agencyTeamStoreCount, agencyTeamOwnerCount, agencyTeamScopeSummary, fillAgencyTeamMetrics} from '../features/agency/team-display'
import {getBusinessContext,getBusinessTeamNode,getBusinessReport} from '../services/business'
import {useAsyncPage} from '../composables/useAsyncPage'
import FeaturePageState from './FeaturePageState.vue'
import EmptyState from './EmptyState.vue'
const props=defineProps({pageQuery:Object}),context=ref(null),loadingMore=ref(false),moreError=ref(''),tab=ref('stores'),territoryIndex=ref(0);let active=true
const {data,status,error,load}=useAsyncPage(async()=>{
  if(!props.pageQuery?.nodeId)throw new Error('缺少团队节点编号')
  const ctx=await getBusinessContext('agency',props.pageQuery.contextId)
  context.value=ctx
  const node=await getBusinessTeamNode(ctx.id,props.pageQuery.nodeId)
  if(Array.isArray(node.members)){
    return {
      node,
      children:{
        items:node.members,
        hasMore:node.childPage?.hasMore===true,
        nextCursor:node.childPage?.nextCursor||null,
      },
    }
  }
  const children=await getBusinessReport('agency','team',ctx.id,{parentNodeId:node.id})
  return {node,children}
},false)
watch(()=>props.pageQuery,query=>{if(query){tab.value='stores';territoryIndex.value=0;load()}},{immediate:true})
const agencyLevel=item=>agencyTeamLevelLabel(item)
const storeCount=item=>agencyTeamStoreCount(item)
const ownerCount=item=>agencyTeamOwnerCount(item)
const scopeSummary=item=>agencyTeamScopeSummary(item)
const isStore=computed(()=>['单店代理','门店成员'].includes(agencyLevel(data.value?.node||{})))
const isRegional=computed(()=>{
  const label=agencyLevel(data.value?.node||{})
  if(['省代','市代','区县代理'].includes(label))return true
  return Boolean(data.value?.children?.items?.length)&&!isStore.value
})
const nodeMetrics=computed(()=>fillAgencyTeamMetrics(data.value?.node?.performance))
const storeRows=computed(()=>data.value?.node?.stores||[])
const territories=computed(()=>data.value?.node?.territoryList||[])
const territoryText=computed(()=>territories.value.join('、')||data.value?.node?.regionLabel||'')
const displayedChildren=computed(()=>{const rows=data.value?.children?.items||[];return territoryIndex.value?rows.filter((_,index)=>index%2===territoryIndex.value%2):rows})
const metricValue=metric=>metric?.kind==='money'?money(metric.value??0):metric?.value??0
function open(id){uni.navigateTo({url:`/pages/agency/team-detail?contextId=${encodeURIComponent(context.value.id)}&nodeId=${encodeURIComponent(id)}`})}
async function more(){if(loadingMore.value||!data.value?.children.hasMore)return;loadingMore.value=true;moreError.value='';try{const result=await getBusinessReport('agency','team',context.value.id,{parentNodeId:data.value.node.id,cursor:data.value.children.nextCursor});if(active)data.value.children={...result,items:[...data.value.children.items,...result.items]}}catch(reason){if(active)moreError.value=reason.message}finally{if(active)loadingMore.value=false}}
onUnmounted(()=>{active=false});defineExpose({refresh:load})
</script>

<style scoped>
.agency-detail{min-height:100vh;padding:34rpx 32rpx 70rpx;box-sizing:border-box;background:#343d61;color:#edf4ff}
.detail-person{display:flex;align-items:flex-start;gap:20rpx}
.detail-avatar-wrap{position:relative;width:108rpx;padding-bottom:36rpx;flex:0 0 108rpx}
.detail-avatar-wrap image,.detail-avatar-wrap>view{width:104rpx;height:104rpx;border-radius:50%;background:#2f5da5;object-fit:cover}
.detail-avatar-wrap>view{display:flex;align-items:center;justify-content:center;color:#152952;font-size:38rpx;font-weight:700}
.detail-avatar-wrap text{position:absolute;left:50%;bottom:0;transform:translateX(-50%);min-width:112rpx;padding:7rpx 12rpx;border-radius:24rpx;background:linear-gradient(90deg,#00b8ee,#0c8dff);font-size:20rpx;line-height:1.35;text-align:center;white-space:nowrap;box-sizing:border-box}
.detail-person-copy{min-width:0;flex:1;font-size:38rpx;font-weight:700;line-height:1.5}
.detail-id-row{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.4fr);gap:16rpx;margin-top:14rpx;font-size:23rpx;font-weight:400}
.detail-meta-pill{min-width:0;display:flex;align-items:center;gap:10rpx;padding:9rpx 18rpx;border-radius:30rpx;background:#4b5377;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.detail-meta-label{color:#a9b4cc;flex-shrink:0}
.detail-meta-value{min-width:0;color:#fff;overflow:hidden;text-overflow:ellipsis}
.detail-performance-card{margin-top:28rpx;padding:20rpx;border-radius:20rpx;background:#4a5275}
.detail-performance-heading{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16rpx;margin-bottom:18rpx;font-size:28rpx;font-weight:600;line-height:1.5}
.detail-store-summary{min-width:0;color:#fff;font-size:25rpx;font-weight:500;overflow-wrap:anywhere}
.detail-store-summary em{color:#59b6ff;font-style:normal;font-weight:700}
.detail-performance{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-radius:18rpx;overflow:hidden;background:#30395d}
.detail-performance>view{position:relative;min-height:100rpx;padding:14rpx 8rpx;box-sizing:border-box;border:0;text-align:center}
.detail-performance>view:not(:nth-child(3n))::after{content:'';position:absolute;top:20%;right:0;width:1rpx;height:60%;background:#626c8c}
.detail-performance text{display:block;color:#c0c8db;font-size:22rpx;line-height:1.55}
.detail-performance strong{display:block;color:#d6e7ff;font-size:32rpx;font-weight:700;line-height:1.45}
.detail-base-title{margin-top:30rpx;font-size:31rpx;font-weight:700}
.detail-base{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20rpx 32rpx;margin-top:18rpx;color:#bfc8dc;font-size:25rpx;line-height:1.45}
.detail-base>view{min-width:0;overflow-wrap:anywhere}
.detail-base strong{color:#fff;font-weight:500}
.detail-base-wide{grid-column:1/-1}
.detail-section-title{margin-top:48rpx;padding-bottom:16rpx;border-bottom:5rpx solid #14bfff;width:max-content;color:#18c8ff;font-size:30rpx;font-weight:700}
.detail-territories{display:flex;gap:24rpx;margin:24rpx 0 30rpx;overflow-x:auto}
.detail-territories button{flex:0 0 auto;margin:0;padding:12rpx 26rpx;border-radius:32rpx;background:#4a5275;color:#bbc4d9;font-size:25rpx;line-height:1.4}
.detail-territories button.selected{background:linear-gradient(90deg,#21c8ee,#2d5cfb);color:#06316b}
.detail-team-card{display:block;margin:0 0 24rpx;padding:28rpx 24rpx;border-radius:24rpx;background:#414a70}
.detail-team-heading{display:flex;align-items:center;gap:14rpx;min-width:0}
.detail-team-heading image,.detail-team-heading>view{width:76rpx;height:76rpx;border-radius:50%;object-fit:cover;background:#2f5da5;flex:0 0 76rpx}
.detail-team-heading>view{display:flex;align-items:center;justify-content:center;color:#152952;font-size:28rpx;font-weight:700}
.detail-team-heading>text{min-width:0;font-size:31rpx;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.detail-team-heading em,.detail-store-card em,.detail-owner-card em{padding:4rpx 12rpx;border-radius:22rpx;background:#ddecff;color:#23427a;font-size:19rpx;font-style:normal;white-space:nowrap}
.detail-team-heading button{margin:0 0 0 auto;padding:0;background:none;color:#17c5ff;font-size:24rpx;white-space:nowrap}
.detail-team-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16rpx;margin-top:24rpx}
.detail-team-fields>view{display:flex;justify-content:space-between;gap:8rpx;min-width:0;padding:9rpx 18rpx;border-radius:30rpx;background:#4b5377;font-size:23rpx}
.detail-team-fields text{color:#a9b4cc}
.detail-team-fields strong{min-width:0;color:#fff;font-weight:500;overflow:hidden;text-overflow:ellipsis}
.detail-tabs{display:flex;gap:56rpx;margin:46rpx -32rpx 24rpx;padding:0 32rpx;background:#26304f}
.detail-tabs button{position:relative;margin:0;padding:20rpx 0;background:none;color:#bdc4d6;font-size:30rpx}
.detail-tabs button.selected{color:#18c8ff}
.detail-tabs button.selected::after{content:'';position:absolute;bottom:0;left:50%;width:56rpx;height:5rpx;border-radius:5rpx;background:#1dc7ff;transform:translateX(-50%)}
.detail-store-card{display:flex;gap:18rpx;margin:0 0 24rpx;padding:24rpx;border-radius:24rpx;background:#414a70}
.detail-store-card image,.detail-store-photo-empty{width:184rpx;height:184rpx;border-radius:8rpx;flex:0 0 184rpx;object-fit:cover;background:#2f3a5c}
.detail-store-photo-empty{display:flex;align-items:center;justify-content:center;color:#8ea0c0;font-size:22rpx}
.detail-store-card>view{min-width:0;flex:1}
.detail-store-name{font-size:28rpx;font-weight:700;line-height:1.5;color:#fff}
.detail-store-address{display:block;margin-top:14rpx;color:#b6c0d5;font-size:23rpx;line-height:1.55}
.detail-store-card>view>strong{display:block;margin-top:20rpx;color:#ff4973;font-size:28rpx}
.detail-owner-card{display:flex;align-items:flex-start;gap:20rpx;margin:0 0 24rpx;padding:28rpx;border-radius:24rpx;background:#414a70}
.detail-owner-card image{width:104rpx;height:104rpx;border-radius:50%;object-fit:cover;flex:0 0 104rpx}
.detail-owner-card>view{min-width:0;flex:1}
.detail-owner-card>view>view{font-size:30rpx;font-weight:700;line-height:1.55}
.detail-owner-card>view>text{display:block;margin-top:12rpx;color:#b9c3d8;font-size:24rpx;line-height:1.55}
.detail-more{display:block;margin:22rpx auto;padding:10rpx 30rpx;border-radius:30rpx;background:#434c6d;color:#dceaff;font-size:23rpx}
.detail-error{display:block;color:#ff9ab1;font-size:22rpx}
@media(max-width:340px){
 .agency-detail{padding-left:24rpx;padding-right:24rpx}
 .detail-person-copy{font-size:32rpx}
 .detail-id-row{gap:8rpx;font-size:19rpx}
 .detail-meta-pill{padding:8rpx 10rpx}
 .detail-performance text{font-size:19rpx}
 .detail-performance strong{font-size:24rpx}
 .detail-base{font-size:22rpx;gap:15rpx}
 .detail-team-card{padding-left:18rpx;padding-right:18rpx}
 .detail-team-heading>text{font-size:27rpx}
 .detail-team-heading button{font-size:21rpx}
 .detail-team-fields{gap:10rpx}
 .detail-team-fields>view{padding:8rpx 12rpx;font-size:20rpx}
 .detail-store-card{padding:18rpx}
 .detail-store-card image,.detail-store-photo-empty{width:145rpx;height:145rpx;flex-basis:145rpx}
 .detail-store-name{font-size:24rpx}
 .detail-store-address{font-size:20rpx}
 .detail-store-card>view>strong{font-size:24rpx}
}
</style>
