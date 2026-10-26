<template>
 <view class="shop-page feedback-list">
  <BusinessPageHeader :title="heading"/>
  <view class="shop-body">
   <FeaturePageState :status="status" :error="error" @retry="load"/>
   <template v-if="data">
    <view v-for="item in data.items" :key="item.id" class="shop-card feedback-card">
     <view class="feedback-title">{{item.title}}</view>
     <view class="feedback-meta">
      <view><text>健脑官：{{item.coachName || '—'}}</text><text>反馈时间：{{businessDateLabel(item.createdAt)}}</text></view>
      <button @click="detail(item.id)">查看详情</button>
     </view>
    </view>
    <view v-if="!data.items.length" class="shop-empty">暂无反馈</view>
   </template>
  </view>
  <view v-if="status==='ready' && data?.allowedActions.includes('write-feedback')" class="feedback-dock"><button @click="add">添加反馈</button></view>
 </view>
</template>
<script setup>
import {computed,ref} from 'vue'
import {onLoad,onShow} from '@dcloudio/uni-app'
import {useAuth} from '../../composables/useAuth'
import {useAsyncPage} from '../../composables/useAsyncPage'
import {getTrainingFeedback} from '../../services/training'
import {businessDateLabel} from '../../features/business/format'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
import FeaturePageState from '../../components/FeaturePageState.vue'
useAuth()
let contextId='',memberId=''
const kind=ref('training')
const headings={training:'陪练反馈','self-study':'智习反馈',camp:'集训反馈'}
const heading=computed(()=>headings[kind.value]||'会员反馈')
const {data,status,error,load}=useAsyncPage(()=>getTrainingFeedback(contextId,memberId,kind.value),false)
const query=()=>`contextId=${contextId}&memberId=${memberId}&kind=${kind.value}`
function detail(id){uni.navigateTo({url:`/pages/feedback/detail?${query()}&id=${id}`})}
function add(){uni.navigateTo({url:`/pages/feedback/edit?${query()}`})}
function readRouteId(value){let text=value||'';for(let i=0;i<2&&text.includes('%');i++){try{const next=decodeURIComponent(text);if(next===text)break;text=next}catch{break}}return text}
onLoad(options=>{contextId=readRouteId(options.contextId);memberId=readRouteId(options.memberId);kind.value=options.kind||'training'})
onShow(load)
</script>
<style>@import '../../styles/commerce.css';</style>
<style scoped>
.feedback-list{max-width:750px;margin:0 auto}
.feedback-list button{margin:0;padding:0;background:none;line-height:inherit}
.feedback-list button::after{border:0}
.feedback-card{border-radius:.85em}
.feedback-title{font-size:1.02em;font-weight:700;line-height:1.5}
.feedback-meta{display:flex;align-items:flex-end;justify-content:space-between;gap:.8em;margin-top:.55em}
.feedback-meta text{display:block;color:#9aa3bd;font-size:.78em;line-height:1.55}
.feedback-meta button{flex:none;color:#57adff;font-size:.9em}
.feedback-dock{position:fixed;left:0;right:0;bottom:0;max-width:750px;margin:0 auto;padding:.8em 1.2em calc(.8em + env(safe-area-inset-bottom));background:linear-gradient(#272c4700,#272c47 28%);box-sizing:border-box}
.feedback-dock button{width:100%;border-radius:3em;background:linear-gradient(95deg,#0340ff,#009bff);color:#fff;line-height:2.7}
</style>
