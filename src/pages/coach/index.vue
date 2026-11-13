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
      <button v-for="action in actions" :key="action.label" class="coach-action" @click="action.run"><image :src="action.icon" mode="aspectFit"/><text>{{action.label}}</text></button>
     </view>
    </view>
    <view class="coach-section">会员列表</view>
    <view v-if="!children.length" class="shop-muted">暂无会员</view>
    <StoreMemberProfileCard
     v-for="(member,index) in children"
     :key="member.id"
     :member="member"
     :context-id="contextId"
     :index="index"
     :page-allowed-actions="coachActions"
     @updated="load"
    />
   </template>
  </view>
  <view v-if="storeOpen && data?.store" class="coach-mask" @click="storeOpen=false">
   <view class="coach-store-wrap" @click.stop>
    <view class="coach-store-dialog" role="dialog" aria-label="门店信息">
     <image class="coach-store-cover" :src="storePhotoUrl(data.store) || '/static/agency/store-wutong.png'" mode="aspectFill"/>
     <view>
      <view class="coach-store-name">{{data.store.name || '门店'}}<text v-if="data.store.number">{{data.store.number}}</text></view>
      <text>{{storeDisplayAddress(data.store) || data.store.address || '地址待后台提供'}}</text>
      <text>店长信息：{{data.store.managerName || ''}}/{{data.store.phone || ''}}</text>
     </view>
    </view>
    <button class="coach-store-close" aria-label="关闭门店信息" @click="storeOpen=false"><image src="/static/common/icon-close-circle.png" mode="aspectFit"/></button>
   </view>
  </view>
 </view>
</template>
<script setup>
import {onLoad,onShow} from '@dcloudio/uni-app'
import {computed,ref} from 'vue'
import {useAuth} from '../../composables/useAuth'
import {useAsyncPage} from '../../composables/useAsyncPage'
import {getBusinessContexts} from '../../services/business'
import {getCoachWorkspace} from '../../services/training'
import {logout,getSession} from '../../services/api'
import {isCoachAccount} from '../../services/account-channel'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
import FeaturePageState from '../../components/FeaturePageState.vue'
import StoreMemberProfileCard from '../../components/StoreMemberProfileCard.vue'
import { storeDisplayAddress, storePhotoUrl } from '../../features/store-display'
useAuth()
const isStaff=isCoachAccount(getSession()),storeOpen=ref(false)
const contextId=ref('')
const {data,status,error,load}=useAsyncPage(async()=>{if(!contextId.value&&!isStaff){const contexts=await getBusinessContexts();contextId.value=contexts.find(x=>x.module==='agency'&&x.agencyType==='STORE')?.id||'';if(!contextId.value)throw new Error('当前账号没有健脑官工作台权限')}const result=await getCoachWorkspace(contextId.value);contextId.value=result.contextId||contextId.value;return result},false)
const children=computed(()=>data.value?.childMembers||[])
const coachActions=computed(()=>{
 const allowed=[...(data.value?.allowedActions||[])]
 if(allowed.includes('manage-members')){
  if(!allowed.includes('edit-training'))allowed.push('edit-training')
  if(!allowed.includes('write-feedback'))allowed.push('write-feedback')
 }
 return allowed
})
const actions=[{label:'门店信息',icon:'/static/common/icon-store.png',run:()=>{storeOpen.value=true}},{label:'修改密码',icon:'/static/common/icon-lock.png',run:password},{label:'登出',icon:'/static/common/icon-logout.png',run:leave}]
function password(){uni.navigateTo({url:'/pages/settings/change-password?audience=coach'})}
function leave(){uni.showModal({title:'退出登录',content:'您确定要退出登录吗？',success:result=>{if(result.confirm)logout()}})}
onLoad(query=>{contextId.value=query.contextId||''});onShow(load)
</script>
<style>@import '../../styles/commerce.css';</style>
<style scoped>
.coach-page{max-width:750px;margin:0 auto;background:radial-gradient(ellipse at 100% 0,#20578555,transparent 46%),#121c3b}
.coach-header{padding:calc(1em + var(--status-bar-height,0px)) 1em .4em;font-size:1.15em;font-weight:700}
.coach-welcome{display:flex;align-items:center;justify-content:space-between;gap:1em;margin:.4em 0 1.4em}
.coach-actions{display:flex;gap:.85em;flex:none}
.coach-action{display:flex;flex-direction:column;align-items:center;gap:.2em;margin:0;padding:0;background:none;color:#d5e4f8;font-size:.75em;line-height:1.3}
.coach-action::after{border:0}
.coach-action image{width:1.7em;height:1.7em}
.coach-section{margin:0 0 .8em;padding-left:.45em;border-left:.22em solid #00acff;font-size:1.05em;font-weight:700}
.coach-mask{position:fixed;z-index:120;inset:0;display:flex;align-items:center;justify-content:center;padding:1.4em;background:rgba(0,0,0,.82);box-sizing:border-box}
.coach-store-wrap{width:100%;max-width:26em}
.coach-store-dialog{display:flex;gap:.7em;padding:.8em;border-radius:.85em;background:#3a415f}
.coach-store-cover{width:5.2em;height:4.6em;flex:none;border-radius:.35em;background:#2a314c}
.coach-store-dialog>view{min-width:0;flex:1}
.coach-store-name{display:flex;align-items:center;gap:.4em;font-weight:700;line-height:1.4}
.coach-store-name text{padding:0 .45em;border-radius:1em;background:linear-gradient(100deg,#00b7ff,#3157ff);font-size:.68em;line-height:1.7}
.coach-store-dialog text{display:block;margin-top:.25em;color:#c5cce0;font-size:.75em;line-height:1.45;overflow-wrap:anywhere}
.coach-store-close{display:flex;margin:1.1em auto 0;padding:0;background:none}
.coach-store-close::after{border:0}
.coach-store-close image{width:2.1em;height:2.1em}
@media(max-width:340px){.coach-welcome{align-items:flex-start;flex-direction:column}.coach-actions{align-self:flex-end}}
</style>
