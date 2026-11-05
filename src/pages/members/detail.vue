<template>
 <view class="shop-page member-detail">
  <BusinessPageHeader title="会员信息"/>
  <view class="shop-body">
   <FeaturePageState :status="status" :error="error" @retry="load"/>
   <template v-if="data">
    <StoreMemberProfileCard
     v-for="(member, index) in data.items"
     :key="member.id"
     :member="member"
     :context-id="contextId"
     :index="index"
     :page-allowed-actions="data.allowedActions"
     @updated="load"
    />
   </template>
  </view>
 </view>
</template>
<script setup>
import {ref} from 'vue'
import {onLoad,onShow} from '@dcloudio/uni-app'
import {useAuth} from '../../composables/useAuth'
import {useAsyncPage} from '../../composables/useAsyncPage'
import {getStoreMemberProfiles} from '../../services/training'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
import FeaturePageState from '../../components/FeaturePageState.vue'
import StoreMemberProfileCard from '../../components/StoreMemberProfileCard.vue'
useAuth()
const contextId=ref('')
let memberId=''
const {data,status,error,load}=useAsyncPage(()=>getStoreMemberProfiles(contextId.value,memberId),false)
function readRouteId(value){let text=value||'';for(let i=0;i<2&&text.includes('%');i++){try{const next=decodeURIComponent(text);if(next===text)break;text=next}catch{break}}return text}
onLoad(query=>{contextId.value=readRouteId(query.contextId);memberId=readRouteId(query.memberId)})
onShow(load)
</script>
<style>@import '../../styles/commerce.css';</style>
<style scoped>
.member-detail{max-width:750px;margin:0 auto;font-size:clamp(14px,3.73vw,16px)}
</style>
