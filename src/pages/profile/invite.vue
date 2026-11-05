<template>
 <view class="invite-page">
  <BusinessPageHeader title="我的邀请" fallback="/pages/profile/index"/>
  <view class="invite-body">
   <FeaturePageState :status="status" :error="error" @retry="load"/>
   <view v-if="data" class="invite-card">
    <text class="invite-label">我的邀请码</text>
    <view class="invite-code"><text>{{data.inviteCode}}</text><button @click="copy(data.inviteCode)">复制</button></view>
    <text class="invite-tip">邀请好友注册脑商 AI，填写邀请码即可建立推荐关系</text>
    <BusinessQrCode :value="data.qrContent" :show-save="true" :poster-title="data.inviteCode"/>
    <button class="invite-link" @click="copy(data.inviteLink)">复制邀请链接</button>
   </view>
  </view>
 </view>
</template>
<script setup>
import {onShow} from '@dcloudio/uni-app'
import {useAuth} from '../../composables/useAuth'
import {useAsyncPage} from '../../composables/useAsyncPage'
import {getMyInviteCode} from '../../services/invite-code'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
import BusinessQrCode from '../../components/BusinessQrCode.vue'
import FeaturePageState from '../../components/FeaturePageState.vue'
useAuth()
const {data,status,error,load}=useAsyncPage(getMyInviteCode,false)
function copy(value){uni.setClipboardData({data:value,success:()=>uni.showToast({title:'已复制',icon:'success'}),fail:()=>uni.showToast({title:'复制失败，请重试',icon:'none'})})}
onShow(load)
</script>
<style scoped>
.invite-page{min-height:100vh;background:#272c47;color:#f3f6ff;font-size:clamp(14px,3.73vw,16px)}.invite-body{width:min(750px,100%);margin:0 auto;padding:1em .9em;box-sizing:border-box}.invite-card{padding:1.4em 1em 1.1em;border-radius:.9em;background:#353a59;text-align:center}.invite-label{display:block;color:#b8c4dc;font-size:.9em}.invite-code{display:flex;align-items:center;justify-content:center;gap:.65em;margin:.45em 0 .7em;font-size:1.65em;font-weight:700;letter-spacing:.12em}.invite-code button,.invite-link{margin:0;border:0;border-radius:2em;background:linear-gradient(100deg,#00baff,#3154ff);color:#fff;font-size:.55em;letter-spacing:0;padding:.45em .85em}.invite-tip{display:block;color:#aebbd2;font-size:.82em;line-height:1.55}.invite-card :deep(.qr-wrap){margin:1.1em auto}.invite-card :deep(.qr-wrap>button),.invite-link{font-size:.88em;line-height:2.25}.invite-link{width:100%;font-size:.92em}
</style>
