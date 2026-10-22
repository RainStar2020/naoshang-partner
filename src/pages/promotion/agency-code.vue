<template><view class="account-page feature-page promotion-page"><view class="promotion-banner"><image src="/static/profile/icon-referral-code.png" mode="aspectFit"/><text>代理推广码</text></view><view class="promotion-card"><view class="promotion-tabs"><button v-for="type in agencyTypes" :key="type.id" :class="{selected:selectedType===type.id}" :disabled="saving" @click="changeType(type.id)">{{type.label}}</button></view><FeaturePageState :status="status" :error="error" @retry="load"/><template v-if="status==='ready'"><image v-if="data.qrUrl" class="promotion-qr" :src="data.qrUrl" mode="aspectFit" @error="imageError=true"/><BusinessQrCode v-else-if="isMock&&data.localPayload" :value="data.localPayload"/><EmptyState v-else text="暂无推广码"/><button v-if="isMock&&data.localPayload" class="primary" @click="openApplication">填写代理申请</button><text v-if="imageError" class="account-error">二维码图片加载失败，请刷新重试。</text><text v-if="operationError" class="account-error">{{operationError}}</text><button v-if="canSave" class="primary" :disabled="saving" @click="save">{{saving?'保存中…':'保存图片'}}</button><button v-if="canCopy" class="secondary copy-promotion" @click="copyLink">复制推广链接</button></template></view></view></template>
<script setup>
import {ref,computed} from 'vue'
import {onUnload} from '@dcloudio/uni-app'
import {config} from '../../config'
import {getSession} from '../../services/api'
import {useAuth} from '../../composables/useAuth'
import {useAsyncPage} from '../../composables/useAsyncPage'
import {getAgencyPromotion,agencyTypes} from '../../services/exclusive'
import BusinessQrCode from '../../components/BusinessQrCode.vue'
import FeaturePageState from '../../components/FeaturePageState.vue'
import EmptyState from '../../components/EmptyState.vue'
useAuth();const isMock=config.useMock,selectedType=ref('STORE'),saving=ref(false),operationError=ref(''),imageError=ref(false);let active=true,receivedAt=0
const {data,status,error,load}=useAsyncPage(async()=>{const result=await getAgencyPromotion(selectedType.value);receivedAt=Date.now();imageError.value=false;return result})
const canSave=computed(()=>data.value?.posterUrl&&data.value?.allowedActions?.includes('download'))
const canCopy=computed(()=>data.value?.shareUrl&&data.value?.allowedActions?.includes('copy-link'))
function changeType(type){if(saving.value||selectedType.value===type)return;selectedType.value=type;operationError.value='';load()}
function ensureCurrent(result){if(result.accountId!==getSession()?.user?.id)throw new Error('账号已变化，请刷新推广码');if(!Number.isFinite(result.expiresAt)||!Number.isFinite(result.serverTime)||result.expiresAt<=result.serverTime+Date.now()-receivedAt)throw new Error('推广码已过期，请刷新后重试')}
function copyLink(){try{ensureCurrent(data.value);uni.setClipboardData({data:data.value.shareUrl})}catch(reason){operationError.value=reason.message}}
function openApplication(){uni.navigateTo({url:`/pages/application/agency?promotionId=${encodeURIComponent(data.value.promotionId)}&agencyType=${selectedType.value}`})}
async function save(){if(saving.value||!canSave.value)return;saving.value=true;operationError.value='';const result=data.value;try{ensureCurrent(result);const response=await new Promise((resolve,reject)=>uni.downloadFile({url:result.posterUrl,success:resolve,fail:reject}));if(!active)return;ensureCurrent(result);if(response.statusCode!==200)throw new Error('图片下载失败');
// #ifdef H5
const link=document.createElement('a');link.href=response.tempFilePath;link.download=`agency-${selectedType.value}.png`;link.click()
// #endif
// #ifndef H5
await new Promise((resolve,reject)=>uni.saveImageToPhotosAlbum({filePath:response.tempFilePath,success:resolve,fail:reject}))
// #endif
}catch(reason){if(active)operationError.value=reason.message||'保存失败，请检查相册权限后重试'}finally{if(active)saving.value=false}}
onUnload(()=>{active=false})
</script>
<style>@import '../../styles/account.css';@import '../../styles/exclusive.css';</style>
<style scoped>.promotion-page{padding-top:50rpx}.promotion-banner{display:flex;align-items:center;justify-content:space-between;background:linear-gradient(110deg,#4a80ff,#008fff);border-radius:30rpx 30rpx 0 0;padding:30rpx 40rpx;color:white;font-size:calc(var(--feature-font,14px)*1.42857);font-weight:600}.promotion-banner image{width:100rpx;height:100rpx;order:2}.promotion-card{background:linear-gradient(#c5dbff,#fff 60%);border-radius:0 0 30rpx 30rpx;padding:36rpx 28rpx 40rpx;color:#344769}.promotion-tabs{display:flex;gap:12rpx;flex-wrap:wrap}.promotion-tabs button{flex:1;min-width:100rpx;margin:0;padding:10rpx 4rpx;border-radius:30rpx;background:#e0ecff;color:#6079a9;font-size:calc(var(--feature-font,14px)*0.92857);line-height:1.5}.promotion-tabs .selected{background:linear-gradient(100deg,#00b8ff,#3255ff);color:#fff}.promotion-qr{display:block;width:320rpx;height:320rpx;margin:50rpx auto;background:white}.promotion-card .primary{margin-top:30rpx}.copy-promotion{margin-top:20rpx}.promotion-card .feature-note{color:#60769a}.promotion-card .account-error{color:#b23250}</style>
