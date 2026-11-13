<template>
 <view class="member-card">
  <text class="member-index">会员{{ member.memberIndex || (index + 1) }}</text>
  <button class="consultant-entry" aria-label="服务顾问" @click="openConsultant"><text>服务</text><text>顾问</text></button>
  <view class="member-heading">
   <image v-if="member.avatarUrl" class="member-avatar" :src="member.avatarUrl" mode="aspectFill"/>
   <view v-else class="member-avatar avatar-letter">{{member.name?.slice(0,1)}}</view>
   <view class="member-information">
    <view class="member-name">{{member.name}}<text v-if="member.badge" class="member-badge">{{member.badge}}</text><text v-else class="member-badge muted">未激活会员</text></view>
    <view class="member-meta">
     <text v-if="member.displayId">ID：{{member.displayId}}</text>
     <text>年级：{{member.gradeLabel || ''}}</text>
     <text>性别：{{member.genderLabel || ''}}</text>
    </view>
   </view>
  </view>
  <view class="member-benefit">
   <text class="benefit-title">陪练卡</text>
   <view class="benefit-body">
    <view>训练：共<text class="hour">{{hour(member.trainingTotal)}}</text>时，已消耗<text class="hour">{{hour(member.trainingUsed)}}</text>时，剩余<text class="hour">{{remain(member.trainingTotal,member.trainingUsed)}}</text>时</view>
    <view>特制：共<text class="hour">{{hour(member.specialTotal)}}</text>时，已消耗<text class="hour">{{hour(member.specialUsed)}}</text>时，剩余<text class="hour">{{remain(member.specialTotal,member.specialUsed)}}</text>时</view>
   </view>
   <button v-if="can('write-feedback')" class="benefit-feedback" @click="feedback('training')">陪练反馈</button>
   <button v-if="can('edit-training')" class="benefit-edit" @click="openHours">编辑</button>
  </view>
  <view class="member-benefit">
   <text class="benefit-title">升学卡</text>
   <view class="benefit-body">
    <view>训练：共<text class="hour">{{hour(admission.total)}}</text>时，已消耗<text class="hour">{{hour(admission.used)}}</text>时，剩余<text class="hour">{{hour(admission.remaining)}}</text>时</view>
    <view v-if="member.admissionNote">{{member.admissionNote}}</view>
   </view>
   <button v-if="can('write-feedback')" class="benefit-feedback" @click="feedback('admission')">升学反馈</button>
   <button v-if="can('edit-training')" class="benefit-edit" @click="openNote('admissionNote','编辑升学卡')">编辑</button>
  </view>
  <view class="member-benefit">
   <text class="benefit-title">智习室</text>
   <view class="benefit-body">{{member.selfStudyNote || '暂无记录'}}</view>
   <button v-if="can('write-feedback')" class="benefit-feedback" @click="feedback('self-study')">智习反馈</button>
   <button v-if="can('edit-training')" class="benefit-edit" @click="openNote('selfStudyNote','编辑智习室')">编辑</button>
  </view>
  <view class="member-benefit">
   <text class="benefit-title">集训营</text>
   <view class="benefit-body">{{member.campNote || '暂无记录'}}</view>
   <button v-if="can('write-feedback')" class="benefit-feedback" @click="feedback('camp')">集训反馈</button>
   <button v-if="can('edit-training')" class="benefit-edit" @click="openNote('campNote','编辑集训营')">编辑</button>
  </view>
  <view class="member-benefit">
   <text class="benefit-title">备注</text>
   <view class="benefit-body">{{member.remark || '暂无备注'}}</view>
   <button v-if="can('edit-training')" class="benefit-edit" @click="openNote('remark','编辑备注')">编辑</button>
  </view>
  <view class="member-footer-actions">
   <button class="action-orders" @click="orders">查看订单</button>
   <button class="action-consultant" @click="openConsultantEditor">编辑顾问</button>
  </view>
 </view>
 <view v-if="editor" class="feature-mask" :class="{'center-mask':editor==='note'}" @click="close">
  <view class="feature-sheet" :class="{'note-dialog':editor==='note'}" @click.stop>
   <template v-if="editor==='note'">
    <view class="dialog-title">{{noteTitle}}</view>
    <textarea v-model="draft.text" :disabled="busy" maxlength="500" placeholder="请输入"/>
    <text v-if="actionError" class="dialog-error">{{actionError}}</text>
    <view class="dialog-actions"><button :disabled="busy" @click="close">取消</button><button class="solid" :disabled="busy" @click="saveNote">保存</button></view>
   </template>
   <template v-else-if="editor==='consultant'">
    <view class="sheet-title">编辑服务顾问<button :disabled="busy||uploading" aria-label="关闭" @click="close"><image src="/static/common/icon-close.png" mode="aspectFit"/></button></view>
    <view class="consultant-field"><text>姓名</text><input v-model="draft.name" :disabled="busy" maxlength="30" placeholder="请输入"/></view>
    <view class="consultant-field"><text>手机号</text><input v-model="draft.phone" type="number" :disabled="busy" maxlength="11" placeholder="请输入"/></view>
    <view class="consultant-field consultant-qr-field"><text>二维码</text><button class="qr-upload" :disabled="busy||uploading" @click="uploadConsultantQr"><image v-if="draft.qrUrl" :src="draft.qrUrl" mode="aspectFit"/><template v-else><text class="qr-plus">+</text><text>{{uploading?'上传中':'上传'}}</text></template></button></view>
    <text v-if="actionError" class="dialog-error">{{actionError}}</text>
    <button class="sheet-submit" :disabled="busy||uploading" @click="saveConsultantEdit">{{busy?'提交中…':'确定'}}</button>
   </template>
   <template v-else>
    <view class="sheet-title">编辑陪练卡课时<button :disabled="busy" aria-label="关闭" @click="close"><image src="/static/common/icon-close.png" mode="aspectFit"/></button></view>
    <view v-for="group in hourGroups" :key="group.id" class="hour-group">
     <view class="hour-heading"><text/>{{group.label}}</view>
     <view class="hour-grid">
      <view><text>课时总数</text><view class="hour-input"><input v-model="draft[group.total]" type="number" :disabled="busy" maxlength="5" placeholder="请输入"/><em>时</em></view></view>
      <view><text>已消耗课时</text><view class="hour-input"><input v-model="draft[group.used]" type="number" :disabled="busy" maxlength="5" placeholder="请输入"/><em>时</em></view></view>
      <view><text>剩余课时</text><view class="hour-input locked"><input :value="remain(draft[group.total],draft[group.used])" disabled placeholder="0"/><em>时</em></view></view>
     </view>
    </view>
    <text v-if="actionError" class="dialog-error">{{actionError}}</text>
    <button class="sheet-submit" :disabled="busy" @click="saveHours">{{busy?'提交中…':'确定'}}</button>
   </template>
  </view>
 </view>
 <view v-if="consultant" class="feature-mask center-mask" @click="closeConsultant">
  <view class="consultant-dialog" @click.stop>
   <text class="consultant-name">{{consultant.name || ''}}</text>
   <button v-if="consultant.phone" class="consultant-phone" @click="callConsultant"><text class="phone-icon">☎</text><text>{{consultant.phone}}</text></button>
   <view class="consultant-qr">
    <image v-if="consultant.qrUrl" :src="consultant.qrUrl" mode="aspectFit"/>
    <BusinessQrCode v-else-if="consultant.qrPayload" ref="consultantQr" :value="consultant.qrPayload" :show-save="false"/>
   </view>
   <button class="consultant-save" :disabled="savingQr" @click="saveConsultant">{{savingQr?'保存中…':'保存图片'}}</button>
  </view>
 </view>
</template>
<script setup>
import {computed,onBeforeUnmount,ref} from 'vue'
import {updateStoreMember,updateMemberConsultant} from '../services/training'
import {uploadProfileImage} from '../services/profile'
import {discardAsset} from '../services/asset-upload'
import BusinessQrCode from './BusinessQrCode.vue'
const props=defineProps({
 member:{type:Object,required:true},
 contextId:{type:String,default:''},
 index:{type:Number,default:0},
 pageAllowedActions:{type:Array,default:()=>[]},
})
const emit=defineEmits(['updated'])
let active=true
const editor=ref(''),busy=ref(false),uploading=ref(false),draft=ref({}),actionError=ref(''),noteTitle=ref(''),noteKey=ref('')
const consultant=ref(null),consultantQr=ref(null),savingQr=ref(false)
const hourGroups=[{id:'training',label:'训练',total:'trainingTotal',used:'trainingUsed'},{id:'special',label:'特制',total:'specialTotal',used:'specialUsed'}]
const admission=computed(()=>admissionHours(props.member))
function can(action){
 const actions=[...(props.member?.allowedActions||[]),...(props.pageAllowedActions||[])]
 return actions.includes(action)
}
function hour(value){const number=Number(value);return Number.isFinite(number)?(Number.isInteger(number)?number:Math.trunc(number)):0}
function remain(total,used){const a=Number(total),b=Number(used);if(!Number.isFinite(a)||!Number.isFinite(b)||String(total)===''||String(used)==='')return 0;return Math.max(0,Math.trunc(a)-Math.trunc(b))}
function admissionHours(member){const value=member?.admissionHours||member?.schoolHours||member?.promotionHours||{},total=value.total??member?.admissionTotal??0,used=value.used??member?.admissionUsed??0;return {total,used,remaining:value.remaining??member?.admissionRemaining??remain(total,used)}}
function payload(patch){const member=props.member;return {version:member.version,trainingTotal:member.trainingTotal,trainingUsed:member.trainingUsed,specialTotal:member.specialTotal,specialUsed:member.specialUsed,selfStudyNote:member.selfStudyNote||'',campNote:member.campNote||'',remark:member.remark||'',admissionNote:member.admissionNote||'',...patch}}
function consultantOf(member){
 const source=member?.consultant||member?.serviceConsultant||{}
 const name=source.name||member?.consultantName||member?.advisorName||''
 const phone=source.phone||member?.consultantPhone||member?.advisorPhone||''
 const qrUrl=source.qrUrl||source.wechatQr||member?.consultantQrUrl||''
 const qrPayload=source.qrPayload||member?.consultantQrPayload||qrUrl||phone||name
 return {name,phone,qrUrl,qrPayload}
}
function openHours(){actionError.value='';draft.value={trainingTotal:props.member.trainingTotal,trainingUsed:props.member.trainingUsed,specialTotal:props.member.specialTotal,specialUsed:props.member.specialUsed};editor.value='hours'}
function openNote(key,title){noteKey.value=key;noteTitle.value=title;actionError.value='';draft.value={text:props.member[key]||''};editor.value='note'}
function openConsultantEditor(){
 const info=consultantOf(props.member)
 actionError.value=''
 draft.value={name:info.name||'',phone:info.phone||'',qrUrl:info.qrUrl||'',qrAssetId:'',qrPayload:info.qrPayload||''}
 editor.value='consultant'
}
function close(){if(!busy.value&&!uploading.value)editor.value=''}
function openConsultant(){consultant.value=consultantOf(props.member)}
function closeConsultant(){if(!savingQr.value)consultant.value=null}
function callConsultant(){const phone=consultant.value?.phone;if(phone)uni.makePhoneCall({phoneNumber:String(phone),fail:()=>{}})}
async function uploadConsultantQr(){
 if(uploading.value||busy.value)return
 uploading.value=true
 actionError.value=''
 try{
  const chosen=await new Promise((resolve,reject)=>uni.chooseImage({count:1,success:resolve,fail:reject}))
  const file=chosen.tempFiles?.[0]
  if(!file||!active)return
  const asset=await uploadProfileImage({path:file.path,size:file.size||1,name:file.name||'',type:file.type||file.mimeType||''},'consultant-qr')
  if(active){const previous=draft.value.qrAssetId;draft.value.qrAssetId=asset.assetId;draft.value.qrUrl=asset.previewUrl;draft.value.qrPayload=asset.previewUrl;if(previous&&previous!==asset.assetId)discardAsset(previous)}
 }catch(reason){if(active&&reason?.message)actionError.value=reason.message}
 finally{if(active)uploading.value=false}
}
async function saveConsultantEdit(){
 if(busy.value||uploading.value||!props.member?.id)return
 busy.value=true
 actionError.value=''
 try{
  await updateMemberConsultant(props.contextId,props.member.id,{name:draft.value.name,phone:draft.value.phone,qrUrl:draft.value.qrUrl,qrAssetId:draft.value.qrAssetId,qrPayload:draft.value.qrPayload||draft.value.phone})
  if(active){editor.value='';emit('updated');uni.showToast({title:'已保存',icon:'success'})}
 }catch(reason){if(active)actionError.value=reason.message||'保存失败'}
 finally{if(active)busy.value=false}
}
async function saveConsultant(){
 if(savingQr.value||!consultant.value)return
 savingQr.value=true
 try{
  if(consultant.value.qrUrl){
   const response=await new Promise((resolve,reject)=>uni.downloadFile({url:consultant.value.qrUrl,success:resolve,fail:reject}))
   if(response.statusCode&&response.statusCode!==200)throw new Error('图片下载失败')
   await new Promise((resolve,reject)=>uni.saveImageToPhotosAlbum({filePath:response.tempFilePath,success:resolve,fail:reject}))
   uni.showToast({title:'已保存',icon:'success'})
  }else if(consultantQr.value?.save){
   consultantQr.value.save()
  }else{
   throw new Error('暂无可保存的二维码')
  }
 }catch(reason){
  if(active)uni.showToast({title:reason?.errMsg?.includes('auth')?'请开启相册权限后重试':(reason.message||'保存失败'),icon:'none'})
 }finally{if(active)savingQr.value=false}
}
function feedback(kind){uni.navigateTo({url:`/pages/feedback/list?contextId=${encodeURIComponent(props.contextId)}&memberId=${encodeURIComponent(props.member.id)}&kind=${kind}`})}
function orders(){uni.navigateTo({url:`/pages/order/list?contextId=${encodeURIComponent(props.contextId)}&memberId=${encodeURIComponent(props.member.id)}`})}
function integers(source){const value={};for(const group of hourGroups){for(const key of [group.total,group.used]){const number=Number(source[key]);if(!Number.isInteger(number))throw new Error('课时须为0—10000的整数');value[key]=number}}return value}
async function saveHours(){if(busy.value||!props.member?.id)return;busy.value=true;actionError.value='';try{const hours=integers(draft.value);await updateStoreMember(props.contextId,props.member.id,payload(hours));if(active){editor.value='';emit('updated');uni.showToast({title:'已保存',icon:'success'})}}catch(reason){if(active)actionError.value=reason.message||'保存失败'}finally{if(active)busy.value=false}}
async function saveNote(){if(busy.value||!props.member?.id)return;busy.value=true;actionError.value='';try{await updateStoreMember(props.contextId,props.member.id,payload({[noteKey.value]:draft.value.text||''}));if(active){editor.value='';emit('updated');uni.showToast({title:'已保存',icon:'success'})}}catch(reason){if(active)actionError.value=reason.message||'保存失败'}finally{if(active)busy.value=false}}
onBeforeUnmount(()=>{active=false})
</script>
<style>@import '../styles/exclusive.css';</style>
<style scoped>
.member-card{position:relative;margin-bottom:.85em;padding:1em .9em .85em;overflow:hidden;border-radius:.85em;background:#353a59;font-size:clamp(14px,3.73vw,16px)}
.member-card button::after{border:0}
.member-index{position:absolute;top:.55em;right:.7em;z-index:1;color:#9aa6c3;font-size:.72em;line-height:1.3}
.member-card .consultant-entry{position:absolute;top:2.35em;right:0;z-index:2;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.12em;min-width:2.85em;min-height:3.35em;margin:0;padding:.55em .48em;border-radius:.65em 0 0 .65em;background:linear-gradient(180deg,#1ec4ff,#2a6bff);color:#fff;font-size:.78em;font-weight:600;line-height:1.15}
.consultant-entry text{display:block;white-space:nowrap}
.member-heading{display:flex;align-items:center;gap:.7em;margin-bottom:.35em;min-width:0;padding-right:3.4em}
.member-avatar{width:3.2em;height:3.2em;border-radius:50%;flex-shrink:0;background:#375682}
.avatar-letter{display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700}
.member-information{flex:1;min-width:0}
.member-name{display:flex;align-items:center;flex-wrap:wrap;gap:.35em;font-weight:700;line-height:1.4}
.member-badge{padding:.05em .5em;border-radius:1em;background:linear-gradient(90deg,#00baff,#3056ff);font-size:.72em;font-weight:500}
.member-badge.muted{background:#4a516c;color:#c5cbe0}
.member-meta{display:flex;flex-wrap:wrap;gap:.15em .65em;margin-top:.3em;color:#a8b8d1;font-size:.82em;line-height:1.45}
.member-benefit{display:flex;align-items:stretch;min-height:3.8em;margin-top:.55em;margin-bottom:.35em;border-radius:.55em;background:#454d6e;overflow:hidden}
.member-heading+.member-benefit{margin-top:1.15em}
.benefit-title,.member-card .member-benefit>button{flex-shrink:0;display:flex;align-items:center;justify-content:center;margin:0;writing-mode:vertical-rl;letter-spacing:.08em;line-height:1.2;font-size:.78em;color:#fff}
.benefit-title{width:1.7em;padding:.45em 0;background:#555e7b;color:#d5dced;border-radius:.55em 0 0 .55em}
.member-card .member-benefit>button{align-self:stretch;min-width:2.35em;padding:.45em .2em;border-radius:0}
.member-card .benefit-feedback{background:#00b861}
.member-card .benefit-edit{background:linear-gradient(180deg,#1aa7ff,#245bff)}
.benefit-body{flex:1;min-width:0;padding:.55em .65em;color:#d7deee;font-size:.84em;line-height:1.55;overflow-wrap:anywhere}
.hour{color:#4eb6ff}
.member-footer-actions{display:flex;align-items:center;justify-content:center;gap:.7em;margin-top:.65em}
.member-card .member-footer-actions button{flex:1;min-width:0;margin:0;padding:.36em 0;border-radius:2em;font-size:.98em;line-height:1.7}
.member-card .action-orders{background:linear-gradient(90deg,#00b7ff,#3157ff);color:#fff}
.member-card .action-consultant{background:transparent;box-shadow:inset 0 0 0 1px #4f9dff;color:#7eb6ff}
.consultant-field{display:flex;align-items:center;gap:.7em;margin-bottom:.85em}
.consultant-field>text{flex:none;width:3.2em;color:#edf4ff}
.consultant-field input{min-width:0;flex:1;height:2.5em;padding:0 .8em;border-radius:.55em;background:#2f3658;color:#fff}
.consultant-qr-field{align-items:flex-start}
.consultant-qr-field>text{padding-top:.85em}
.qr-upload{display:flex;flex-direction:column;align-items:center;justify-content:center;width:4.8em;height:4.8em;margin:0;border-radius:.45em;background:#2f3658;color:#c5cbe0;font-size:.75em;line-height:1.3}
.qr-upload image{width:100%;height:100%;border-radius:.45em}
.qr-plus{font-size:1.6em;line-height:1}
.center-mask{align-items:center;padding:1.2em}
.note-dialog{width:100%;max-width:22em;border-radius:1.1em;background:#3a4164}
.dialog-title,.sheet-title{position:relative;margin-bottom:.8em;text-align:center;font-size:1.05em;font-weight:700}
.sheet-title button{position:absolute;right:0;top:0;background:none;margin:0;padding:0}
.sheet-title image{width:1.2em;height:1.2em}
.note-dialog textarea,.hour-input{box-sizing:border-box;width:100%;border-radius:.4em;background:#4a5170;color:#fff}
.note-dialog textarea{min-height:6.5em;padding:.7em;font-size:.95em}
.dialog-actions{display:grid;grid-template-columns:1fr 1fr;gap:.7em;margin-top:.9em}
.dialog-actions button{border-radius:2em;background:#5a617c;color:#fff;line-height:2.3}
.dialog-actions .solid,.sheet-submit{background:linear-gradient(95deg,#0340ff,#009bff)}
.sheet-submit{width:100%;margin-top:.4em;border-radius:2em;color:#fff;line-height:2.6}
.hour-heading{display:flex;align-items:center;gap:.35em;margin:.2em 0 .55em;font-weight:700}
.hour-heading text{width:.28em;height:.9em;border-radius:.2em;background:#57adff}
.hour-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.4em;margin-bottom:.8em}
.hour-grid>view{min-width:0}
.hour-grid>view>text{display:block;margin-bottom:.3em;color:#d5dced;font-size:.75em}
.hour-input{display:flex;align-items:center;height:2.3em;padding:0 .4em}
.hour-input input{min-width:0;flex:1;height:100%;color:#fff;font-size:.85em}
.hour-input em{flex:none;color:#c5cbe0;font-size:.75em;font-style:normal}
.hour-input.locked{opacity:.8}
.dialog-error{display:block;margin-top:.4em;color:#ffb4c4;font-size:.82em}
.consultant-dialog{width:min(18.5em,calc(100% - 2.4em));padding:1.35em 1.1em 1.15em;border-radius:1.15em;background:#1d2643;text-align:center}
.consultant-name{display:block;margin-bottom:.7em;color:#fff;font-size:1.15em;font-weight:700}
.consultant-phone{display:inline-flex;align-items:center;justify-content:center;gap:.35em;margin:0 auto .95em;padding:.35em 1.1em;border-radius:2em;background:linear-gradient(90deg,#00c6ff,#0072ff);color:#fff;font-size:.92em;line-height:1.4}
.phone-icon{font-size:.95em;transform:rotate(90deg)}
.consultant-qr{width:11.5em;height:11.5em;margin:0 auto .95em;padding:.55em;box-sizing:border-box;border-radius:.35em;background:#fff}
.consultant-qr image,.consultant-qr :deep(.qr-wrap){width:100%;height:100%;margin:0}
.consultant-qr :deep(.qr-code){width:100%;height:100%;padding:0;aspect-ratio:auto}
.consultant-qr :deep(.qr-canvas){position:fixed;left:-9999px}
.consultant-save{width:100%;margin:0;border-radius:2em;background:linear-gradient(90deg,#00c6ff,#0072ff);color:#fff;line-height:2.55}
@media(max-width:340px){.hour-grid{grid-template-columns:1fr}.member-meta{font-size:.72em}}
</style>
