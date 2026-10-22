<template><view class="shop-page"><BusinessPageHeader title="反馈详情" fallback="/pages/profile/index"/><view class="account-page feature-page"><FeaturePageState :status="status" :error="error" @retry="load"/><template v-if="status==='ready'"><view class="account-card feedback-summary"><view>{{data.title}}</view><text>健脑官：{{data.coachName||'—'}}　{{businessDateLabel(data.createdAt)}}</text></view><view class="account-card feedback-body"><ManagedRichContent :content="data.content"/><image v-for="src in data.images||[]" :key="src" :src="src" mode="widthFix" style="width:100%;margin-top:1em"/><view v-for="item in data.attachments||[]" :key="item.assetId"><video v-if="item.kind==='video'" :src="item.previewUrl" controls style="width:100%;height:55vw;max-height:60vh;margin:1em 0"/><button v-else class="secondary" @click="openAttachment(item)"><image src="/static/media/icon-pdf.png" style="width:1.5em;height:1.5em;vertical-align:middle"/> {{item.name}}</button></view></view></template></view></view></template>
<script setup>
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
import {businessDateLabel} from '../../features/business/format'
import {onLoad,onUnload} from '@dcloudio/uni-app'
import {useAuth} from '../../composables/useAuth'
import {useAsyncPage} from '../../composables/useAsyncPage'
import {getTrainingFeedbackDetail} from '../../services/training'
import FeaturePageState from '../../components/FeaturePageState.vue'
import ManagedRichContent from '../../components/ManagedRichContent.vue'
import {getSession} from '../../services/api'
useAuth();let active=true,id='',memberId='',contextId=''
const {data,status,error,load}=useAsyncPage(()=>{if(!id||!memberId)throw new Error('缺少反馈编号或会员编号');return getTrainingFeedbackDetail(memberId,id,contextId)},false)
function openAttachment(item){
 // #ifdef H5
 window.open(item.previewUrl,'_blank','noopener,noreferrer')
 // #endif
 // #ifndef H5
 const session=getSession();const open=path=>{if(active&&getSession()?.token===session?.token&&getSession()?.user?.id===session?.user?.id)uni.openDocument({filePath:path,fileType:'pdf',showMenu:true,fail:()=>uni.showToast({title:'文件打开失败，请重试',icon:'none'})})};if(/^https:\/\//.test(item.previewUrl))uni.downloadFile({url:item.previewUrl,success:result=>{if(result.statusCode===200)open(result.tempFilePath);else if(active)uni.showToast({title:'文件下载失败',icon:'none'})},fail:()=>{if(active)uni.showToast({title:'文件下载失败，请重试',icon:'none'})}});else open(item.previewUrl)
 // #endif
 }
 onLoad(options=>{contextId=options.contextId||'';id=options.id||'';memberId=options.memberId||'';load()})
onUnload(()=>{active=false})
</script>
<style>@import '../../styles/commerce.css';@import '../../styles/account.css';@import '../../styles/exclusive.css';</style>
<style scoped>.feedback-summary,.feedback-body{padding:28rpx 24rpx}.feedback-summary>view{font-size:calc(var(--feature-font,14px)*1.07143);line-height:1.8;margin-bottom:20rpx}.feedback-summary>text{font-size:calc(var(--feature-font,14px)*0.92857);color:#9eafcb}</style>
