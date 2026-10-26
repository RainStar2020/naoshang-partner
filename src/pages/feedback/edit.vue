<template>
 <view class="shop-page feedback-edit">
  <BusinessPageHeader title="添加反馈"/>
  <view class="shop-body">
   <text v-if="!ready" class="shop-muted">{{error || '正在校验权限…'}}</text>
   <template v-if="ready">
    <view class="edit-label">反馈标题</view>
    <input v-model="title" class="edit-title" maxlength="80" placeholder="在此输入标题" :disabled="busy"/>
    <view class="edit-label">反馈内容</view>
    <view class="edit-composer">
     <textarea v-model="text" maxlength="3000" placeholder="请输入反馈内容" :disabled="busy"/>
     <view v-if="images.length" class="edit-images">
      <view v-for="(item,index) in images" :key="item.assetId">
       <image :src="item.previewUrl" mode="aspectFill"/>
       <button aria-label="移除图片" :disabled="busy" @click="images.splice(index,1)"><image src="/static/common/icon-remove-image.png" mode="aspectFit"/></button>
      </view>
     </view>
     <view v-for="(item,index) in attachments" :key="item.assetId" class="edit-file">
      <image v-if="item.kind==='video'" class="edit-video" :src="item.previewUrl || '/static/media/video-poster-background.png'" mode="aspectFill"/>
      <image v-else class="edit-pdf" src="/static/media/icon-pdf.png" mode="aspectFit"/>
      <view v-if="item.kind==='video'" class="edit-play"><image src="/static/media/icon-play-solid.png" mode="aspectFit"/></view>
      <view v-else class="edit-file-copy"><text>{{item.name || '附件'}}</text><text>{{fileSize(item.size)}}</text></view>
      <button aria-label="移除附件" :disabled="busy" @click="attachments.splice(index,1)">移除</button>
     </view>
    </view>
    <view class="edit-uploads">
     <button :disabled="busy||uploading||images.length>=6" @click="upload"><image src="/static/common/icon-image.png" mode="aspectFit"/><text>上传图片</text></button>
     <button :disabled="busy||uploading||attachments.length>=6" @click="uploadAttachment('video')"><image src="/static/common/icon-video.png" mode="aspectFit"/><text>上传视频</text></button>
     <button :disabled="busy||uploading||attachments.length>=6" @click="uploadAttachment('file')"><image src="/static/common/icon-folder.png" mode="aspectFit"/><text>上传文件</text></button>
    </view>
    <text v-if="error" class="edit-error">{{error}}</text>
    <button class="edit-submit" :disabled="busy||uploading" @click="save">{{busy ? '提交中…' : '确认发布'}}</button>
   </template>
  </view>
 </view>
</template>
<script setup>
import {ref} from 'vue'
import {onLoad,onUnload} from '@dcloudio/uni-app'
import {useAuth} from '../../composables/useAuth'
import {saveTrainingFeedback,getStoreMember} from '../../services/training'
import {uploadTrainingAsset} from '../../services/training-assets'
import {uploadProfileImage} from '../../services/profile'
import {commerceRequestKey} from '../../services/commerce'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
useAuth()
let contextId='',memberId='',kind='',active=true,key='',fingerprint=''
const ready=ref(false),title=ref(''),text=ref(''),images=ref([]),attachments=ref([]),busy=ref(false),uploading=ref(false),error=ref('')
const fileSize=size=>!Number.isFinite(size)?'':size>=1048576?`${(size/1048576).toFixed(2)}mb`:size>=1024?`${Math.round(size/1024)}kb`:`${size}b`
async function upload(){uploading.value=true;error.value='';try{const files=await new Promise((resolve,reject)=>uni.chooseImage({count:6-images.value.length,success:resolve,fail:reject}));for(const file of files.tempFiles){const image=await uploadProfileImage({path:file.path,size:file.size},'feedback');if(active)images.value.push(image)}}catch(reason){if(active&&reason?.errMsg&&!/cancel/i.test(reason.errMsg))error.value=reason.message||'图片选择或上传失败'}finally{if(active)uploading.value=false}}
async function uploadAttachment(type){uploading.value=true;error.value='';try{let file
 // #ifdef H5
 const picked=await new Promise((resolve,reject)=>uni.chooseFile({count:1,extension:type==='video'?['.mp4']:['.pdf'],success:resolve,fail:reject}));file=picked.tempFiles[0]
 // #endif
 // #ifndef H5
 if(type==='video'){const picked=await new Promise((resolve,reject)=>uni.chooseVideo({sourceType:['album'],success:resolve,fail:reject}));file={path:picked.tempFilePath,name:fileName(picked),size:picked.size}}else{const picked=await new Promise((resolve,reject)=>uni.chooseMessageFile({count:1,type:'file',extension:['pdf'],success:resolve,fail:reject}));file=picked.tempFiles[0]}
 // #endif
 const asset=await uploadTrainingAsset({path:file.path||file.tempFilePath,name:file.name,size:file.size},type);if(active)attachments.value.push(asset)}catch(reason){if(active&&reason?.errMsg&&!/cancel/i.test(reason.errMsg))error.value=reason.message||'附件上传失败'}finally{if(active)uploading.value=false}}
function fileName(picked){return picked.name||picked.tempFilePath?.split('/').pop()||'训练视频.mp4'}
async function save(){if(busy.value)return;busy.value=true;error.value='';try{const draft={title:title.value,text:text.value,kind,imageAssetIds:images.value.map(item=>item.assetId),attachmentAssetIds:attachments.value.map(item=>item.assetId)},next=JSON.stringify(draft);if(next!==fingerprint){fingerprint=next;key=commerceRequestKey()}await saveTrainingFeedback(contextId,memberId,draft,key);if(active)uni.navigateBack({fail:()=>uni.redirectTo({url:`/pages/feedback/list?contextId=${contextId}&memberId=${memberId}&kind=${kind}`})})}catch(reason){if(active)error.value=reason.message}finally{if(active)busy.value=false}}
function readRouteId(value){let text=value||'';for(let i=0;i<2&&text.includes('%');i++){try{const next=decodeURIComponent(text);if(next===text)break;text=next}catch{break}}return text}
onLoad(async query=>{contextId=readRouteId(query.contextId);memberId=readRouteId(query.memberId);kind=query.kind||'training';try{const result=await getStoreMember(contextId,memberId);if(active){if(!result.allowedActions.includes('write-feedback'))throw new Error('当前身份无权发布反馈');ready.value=true}}catch(reason){if(active)error.value=reason.message}})
onUnload(()=>{active=false})
</script>
<style>@import '../../styles/commerce.css';</style>
<style scoped>
.feedback-edit{max-width:750px;margin:0 auto;padding-bottom:2em}
.feedback-edit button{margin:0;padding:0;background:none;color:inherit;line-height:inherit}
.feedback-edit button::after{border:0}
.edit-label{margin:.2em 0 .55em;padding-left:.45em;border-left:.22em solid #00acff;font-weight:700}
.edit-title,.edit-composer{width:100%;margin-bottom:1em;border-radius:.7em;background:#353a59;box-sizing:border-box}
.edit-title{height:2.8em;padding:0 .8em;color:#fff}
.edit-composer{padding:.8em}
.edit-composer textarea{width:100%;min-height:8em;color:#fff;font-size:.95em;line-height:1.6}
.edit-images{display:flex;flex-wrap:wrap;gap:.6em;margin-top:.6em}
.edit-images>view{position:relative;width:7.2em;height:5.2em}
.edit-images image,.edit-video{width:100%;height:100%;border-radius:.35em;background:#2a314c}
.edit-images button,.edit-file>button{position:absolute;top:.2em;right:.2em;color:#fff;font-size:.75em}
.edit-file{position:relative;display:flex;align-items:center;gap:.6em;margin-top:.6em;padding:.45em;border-radius:.4em;background:#2d3454}
.edit-video{width:7.2em;height:4.4em;flex:none}
.edit-play{position:absolute;left:2.6em;top:1.7em;width:1.8em;height:1.8em}
.edit-pdf{width:1.8em;height:1.8em;flex:none}
.edit-file-copy{min-width:0;flex:1}
.edit-file-copy text{display:block;font-size:.82em;line-height:1.4}
.edit-file-copy text:last-child{color:#9aa3bd}
.edit-uploads{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.5em;margin-bottom:1em}
.edit-uploads button{display:flex;align-items:center;justify-content:center;gap:.3em;min-height:2.6em;border-radius:.45em;background:#353a59;font-size:.85em}
.edit-uploads image{width:1.15em;height:1.15em}
.edit-uploads button[disabled]{opacity:.45}
.edit-error{display:block;margin-bottom:.6em;color:#ffb4c4;font-size:.85em}
.edit-submit{display:block;width:100%;border-radius:3em;background:linear-gradient(95deg,#0340ff,#009bff);color:#fff;line-height:2.7}
</style>
