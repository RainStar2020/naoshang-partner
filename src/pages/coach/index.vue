<template>
 <view class="shop-page coach-page">
  <view v-if="isStaff" class="coach-header">脑商健脑官</view>
  <BusinessPageHeader v-else title="脑商健脑官"/>
  <view class="shop-body">
   <FeaturePageState :status="status" :error="error" @retry="load"/>
   <template v-if="data">
    <view class="coach-welcome">
     <view>
      <view class="shop-title">欢迎你，{{data.name}}</view>
      <text class="shop-muted">脑商门店健脑官端</text>
     </view>
     <view class="coach-actions">
      <button v-for="action in actions" :key="action.label" @click="action.run"><image :src="action.icon" mode="aspectFit"/><text>{{action.label}}</text></button>
     </view>
    </view>
    <view class="coach-section">门店会员</view>
    <view v-if="!data.members.length" class="shop-muted">暂无门店会员</view>
    <view v-for="member in data.members" :key="member.id" class="shop-card coach-card">
     <view class="coach-member">
      <image v-if="member.avatarUrl" :src="member.avatarUrl" mode="aspectFill" class="coach-avatar"/>
      <view v-else class="coach-avatar avatar-initial">{{member.name?.slice(0,1)}}</view>
      <view class="coach-member-info">
       <view class="shop-title">{{member.name}}</view>
       <view class="shop-muted">用户ID：{{member.displayId || member.id}}<text v-if="member.phone">　手机号：{{member.phone}}</text></view>
       <view v-if="Number.isInteger(member.storeConsumptionAmount)" class="shop-muted">门店消费：¥{{money(member.storeConsumptionAmount)}}</view>
      </view>
     </view>
     <view class="coach-member-actions">
      <button v-if="data.allowedActions.includes('manage-members')" class="shop-primary" @click="detail(member.id)">查看会员</button>
      <button v-if="data.allowedActions.includes('read-orders')" class="shop-primary" @click="orders(member.id)">查看订单</button>
     </view>
    </view>
   </template>
  </view>
  <view v-if="storeOpen && data?.store" class="coach-mask" @click="storeOpen=false">
   <view class="coach-store-wrap" @click.stop>
    <view class="coach-store-dialog" role="dialog" aria-label="门店信息">
     <image class="coach-store-cover" :src="data.store.imageUrl || '/static/agency/store-wutong.png'" mode="aspectFill"/>
     <view>
      <view class="coach-store-name">{{data.store.name || '门店'}}<text v-if="data.store.number">{{data.store.number}}</text></view>
      <text>{{data.store.address || '地址待后台提供'}}</text>
      <text>店长信息：{{data.store.managerName || '—'}}/{{data.store.phone || '—'}}</text>
     </view>
    </view>
    <button class="coach-store-close" aria-label="关闭门店信息" @click="storeOpen=false"><image src="/static/common/icon-close-circle.png" mode="aspectFit"/></button>
   </view>
  </view>
 </view>
</template>
<script setup>
import {onLoad,onShow} from '@dcloudio/uni-app'
import {ref} from 'vue'
import {useAuth} from '../../composables/useAuth'
import {useAsyncPage} from '../../composables/useAsyncPage'
import {getBusinessContexts} from '../../services/business'
import {getCoachWorkspace} from '../../services/training'
import {logout,getSession} from '../../services/api'
import {isCoachAccount} from '../../services/account-channel'
import {money} from '../../features/exclusive/format'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
import FeaturePageState from '../../components/FeaturePageState.vue'
useAuth()
const isStaff=isCoachAccount(getSession()),storeOpen=ref(false)
let contextId=''
const {data,status,error,load}=useAsyncPage(async()=>{if(!contextId&&!isStaff){const contexts=await getBusinessContexts();contextId=contexts.find(x=>x.module==='agency'&&x.agencyType==='STORE')?.id;if(!contextId)throw new Error('当前账号没有健脑官工作台权限')}const result=await getCoachWorkspace(contextId);contextId=result.contextId||contextId;return result},false)
const actions=[{label:'门店信息',icon:'/static/common/icon-store.png',run:()=>{storeOpen.value=true}},{label:'修改密码',icon:'/static/common/icon-lock.png',run:password},{label:'登出',icon:'/static/common/icon-logout.png',run:leave}]
function detail(id){uni.navigateTo({url:`/pages/members/detail?contextId=${contextId}&memberId=${id}`})}
function orders(id){uni.navigateTo({url:`/pages/order/list?memberId=${id}&contextId=${contextId}`})}
function password(){uni.navigateTo({url:'/pages/settings/change-password?audience=coach'})}
function leave(){uni.showModal({title:'退出登录',content:'您确定要退出登录吗？',success:result=>{if(result.confirm)logout()}})}
onLoad(query=>{contextId=query.contextId||''});onShow(load)
</script>
<style>@import '../../styles/commerce.css';</style>
<style scoped>
.coach-page{max-width:750px;margin:0 auto;background:radial-gradient(ellipse at 100% 0,#20578555,transparent 46%),#121c3b}
.coach-page button{margin:0;padding:0;background:none;line-height:inherit}
.coach-page button::after{border:0}
.coach-header{padding:calc(1em + var(--status-bar-height,0px)) 1em .4em;font-size:1.15em;font-weight:700}
.coach-welcome{display:flex;align-items:center;justify-content:space-between;gap:1em;margin:.4em 0 1.4em}
.coach-actions{display:flex;gap:.85em;flex:none}
.coach-actions button{display:flex;flex-direction:column;align-items:center;gap:.2em;color:#d5e4f8;font-size:.75em;line-height:1.3}
.coach-actions image{width:1.7em;height:1.7em}
.coach-section{margin:0 0 .8em;padding-left:.45em;border-left:.22em solid #00acff;font-size:1.05em;font-weight:700}
.coach-card{border-radius:.9em}
.coach-member{display:flex;gap:.75em;align-items:flex-start}
.coach-avatar{width:3.4em;height:3.4em;border-radius:50%;flex:none;background:#1b4d80}
.avatar-initial{display:flex;align-items:center;justify-content:center}
.coach-member-info{min-width:0;flex:1}
.coach-member-info .shop-muted{display:block;font-size:.78em;line-height:1.55}
.coach-member-actions{display:flex;justify-content:center;gap:.8em;margin-top:.9em}
.coach-member-actions button{min-width:7.2em;padding:0 1em;line-height:2.35;border-radius:2em;background:linear-gradient(100deg,#00baff,#3154ff);color:#fff;font-size:.92em}
.coach-mask{position:fixed;z-index:120;inset:0;display:flex;align-items:center;justify-content:center;padding:1.4em;background:rgba(0,0,0,.82);box-sizing:border-box}
.coach-store-wrap{width:100%;max-width:26em}
.coach-store-dialog{display:flex;gap:.7em;padding:.8em;border-radius:.85em;background:#3a415f}
.coach-store-cover{width:5.2em;height:4.6em;flex:none;border-radius:.35em;background:#2a314c}
.coach-store-dialog>view{min-width:0;flex:1}
.coach-store-name{display:flex;align-items:center;gap:.4em;font-weight:700;line-height:1.4}
.coach-store-name text{padding:0 .45em;border-radius:1em;background:linear-gradient(100deg,#00b7ff,#3157ff);font-size:.68em;line-height:1.7}
.coach-store-dialog text{display:block;margin-top:.25em;color:#c5cce0;font-size:.75em;line-height:1.45;overflow-wrap:anywhere}
.coach-store-close{display:flex;margin:1.1em auto 0;background:none}
.coach-store-close image{width:2.1em;height:2.1em}
@media(max-width:340px){.coach-welcome{align-items:flex-start;flex-direction:column}.coach-actions{align-self:flex-end}.coach-member-actions{flex-wrap:wrap}}
</style>
