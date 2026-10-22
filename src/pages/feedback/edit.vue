<template><view class="shop-page"><BusinessPageHeader title="添加反馈"/><view class="shop-body"><text v-if="!ready" class="shop-muted">{{error||'正在校验权限…'}}</text><view v-if="ready" class="shop-card"><text>标题</text><input v-model="title" class="shop-field" maxlength="80" placeholder="请输入反馈标题"/><text>反馈内容</text><textarea v-model="text" class="shop-field" style="min-height:15em" maxlength="3000" placeholder="请输入本次训练表现和建议"/><text class="shop-muted">{{text.length}}/3000</text><view class="shop-options"><view v-for="(item,index) in images" :key="item.assetId"><image :src="item.previewUrl" style="width:5em;height:5em" mode="aspectFill"/><button :disabled="busy" @click="images.splice(index,1)">移除</button></view><button v-if="images.length<6" :disabled="busy||uploading" @click="upload">{{uploading?'上传中…':'上传图片'}}</button></view><view v-for="(item,index) in attachments" :key="item.assetId" class="shop-row"><text>{{item.name}}</text><button class="shop-link" :disabled="busy" @click="attachments.splice(index,1)">移除</button></view><view class="shop-options"><button :disabled="busy||uploading||attachments.length>=6" @click="uploadAttachment('video')">上传视频</button><button :disabled="busy||uploading||attachments.length>=6" @click="uploadAttachment('file')">上传文件</button></view><text v-if="error" class="shop-error">{{error}}</text><button class="shop-primary" :disabled="busy||uploading" @click="save">{{busy?'提交中…':'确认提交'}}</button></view></view></view></template>
<script setup>
import {ref} from 'vue'
import {onLoad,onUnload} from '@dcloudio/uni-app'
import {useAuth} from '../../composables/useAuth'
import {saveTrainingFeedback,getStoreMember} from '../../services/training'
import {uploadTrainingAsset} from '../../services/training-assets'
import {uploadProfileImage} from '../../services/profile'
import {commerceRequestKey} from '../../services/commerce'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
useAuth();let contextId='',memberId='',kind='',active=true,key='',fingerprint='';const ready=ref(false),title=ref(''),text=ref(''),images=ref([]),attachments=ref([]),busy=ref(false),uploading=ref(false),error=ref('')
async function upload(){uploading.value=true;try{const files=await new Promise((resolve,reject)=>uni.chooseImage({count:6-images.value.length,success:resolve,fail:reject}));for(const file of files.tempFiles){const image=await uploadProfileImage({path:file.path,size:file.size},'feedback');if(active)images.value.push(image)}}catch(e){if(active)error.value=e.message||'图片选择或上传失败'}finally{if(active)uploading.value=false}}
async function uploadAttachment(kind){uploading.value=true;error.value='';try{let file
 // #ifdef H5
 const picked=await new Promise((resolve,reject)=>uni.chooseFile({count:1,extension:kind==='video'?['.mp4']:['.pdf'],success:resolve,fail:reject}));file=picked.tempFiles[0]
 // #endif
 // #ifndef H5
 if(kind==='video'){const picked=await new Promise((resolve,reject)=>uni.chooseVideo({sourceType:['album'],success:resolve,fail:reject}));file={path:picked.tempFilePath,name:'训练视频.mp4',size:picked.size}}else{const picked=await new Promise((resolve,reject)=>uni.chooseMessageFile({count:1,type:'file',extension:['pdf'],success:resolve,fail:reject}));file=picked.tempFiles[0]}
 // #endif
 const asset=await uploadTrainingAsset({path:file.path||file.tempFilePath,name:file.name,size:file.size},kind);if(active)attachments.value.push(asset)}catch(e){if(active)error.value=e.message||'附件上传失败'}finally{if(active)uploading.value=false}}
 async function save(){if(busy.value)return;busy.value=true;error.value='';try{const draft={title:title.value,text:text.value,kind,imageAssetIds:images.value.map(x=>x.assetId),attachmentAssetIds:attachments.value.map(x=>x.assetId)},next=JSON.stringify(draft);if(next!==fingerprint){fingerprint=next;key=commerceRequestKey()}await saveTrainingFeedback(contextId,memberId,draft,key);if(active)uni.navigateBack({fail:()=>uni.redirectTo({url:`/pages/feedback/list?contextId=${encodeURIComponent(contextId)}&memberId=${encodeURIComponent(memberId)}&kind=${kind}`})})}catch(e){if(active)error.value=e.message}finally{if(active)busy.value=false}}
onLoad(async q=>{contextId=q.contextId||'';memberId=q.memberId||'';kind=q.kind||'training';try{const result=await getStoreMember(contextId,memberId);if(active){if(!result.allowedActions.includes('write-feedback'))throw new Error('当前身份无权发布反馈');ready.value=true}}catch(e){if(active)error.value=e.message}});onUnload(()=>{active=false})
</script><style>@import '../../styles/commerce.css';</style>
