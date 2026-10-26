<template>
 <view class="shop-page member-detail">
  <BusinessPageHeader title="会员信息"/>
  <view class="shop-body">
   <FeaturePageState :status="status" :error="error" @retry="load"/>
   <template v-if="data">
    <view v-for="(member,index) in data.items" :key="member.id" class="member-card">
     <text class="member-index">会员{{index+1}}</text>
     <view class="member-heading">
      <image v-if="member.avatarUrl" class="member-avatar" :src="member.avatarUrl" mode="aspectFill"/>
      <view v-else class="member-avatar avatar-letter">{{member.name?.slice(0,1)}}</view>
      <view class="member-information">
       <view class="member-name">{{member.name}}<text>{{member.badge || '未激活会员'}}</text></view>
       <view class="member-meta">ID：{{member.displayId || member.id}}　年级：{{member.gradeLabel || '—'}}　性别：{{member.genderLabel || '—'}}</view>
      </view>
     </view>
     <view class="member-row">
      <text class="row-label">陪练卡</text>
      <view class="row-body">
       <view>训练：共 <em>{{hour(member.trainingTotal)}}</em> 时，已消耗 <em>{{hour(member.trainingUsed)}}</em> 时，剩余 <em>{{remain(member.trainingTotal,member.trainingUsed)}}</em> 时</view>
       <view>特制：共 <em>{{hour(member.specialTotal)}}</em> 时，已消耗 <em>{{hour(member.specialUsed)}}</em> 时，剩余 <em>{{remain(member.specialTotal,member.specialUsed)}}</em> 时</view>
      </view>
      <button v-if="can('write-feedback')" class="row-side green" @click="feedback(member,'training')">陪练反馈</button>
      <button v-if="can('edit-training')" class="row-side blue" @click="openHours(member)">编辑</button>
     </view>
     <view class="member-row">
      <text class="row-label">智习室</text>
      <view class="row-body">{{member.selfStudyNote || '暂无记录'}}</view>
      <button v-if="can('write-feedback')" class="row-side green" @click="feedback(member,'self-study')">智习反馈</button>
     </view>
     <view class="member-row">
      <text class="row-label">集训营</text>
      <view class="row-body">{{member.campNote || '暂无记录'}}</view>
      <button v-if="can('write-feedback')" class="row-side green" @click="feedback(member,'camp')">集训反馈</button>
      <button v-if="can('edit-training')" class="row-side blue" @click="openNote(member,'campNote','编辑集训营')">编辑</button>
     </view>
     <view class="member-row">
      <text class="row-label">备注</text>
      <view class="row-body">{{member.remark || '暂无备注'}}</view>
      <button v-if="can('edit-training')" class="row-side blue" @click="openNote(member,'remark','编辑备注')">编辑</button>
     </view>
     <button v-if="can('read-orders')" class="member-orders" @click="orders(member)">查看订单</button>
    </view>
   </template>
  </view>
  <view v-if="editor" class="feature-mask" :class="{'center-mask':editor==='note'}" @click="close">
   <view class="feature-sheet" :class="{'note-dialog':editor==='note'}" @click.stop>
    <template v-if="editor==='note'">
     <view class="dialog-title">{{noteTitle}}</view>
     <textarea v-model="draft.text" :disabled="busy" maxlength="500" placeholder="请输入"/>
     <text v-if="actionError" class="dialog-error">{{actionError}}</text>
     <view class="dialog-actions"><button :disabled="busy" @click="close">取消</button><button class="solid" :disabled="busy" @click="saveNote">保存</button></view>
    </template>
    <template v-else>
     <view class="sheet-title">编辑陪练卡课时<button :disabled="busy" aria-label="关闭" @click="close"><image src="/static/common/icon-close.png" mode="aspectFit"/></button></view>
     <view v-for="group in hourGroups" :key="group.id" class="hour-group">
      <view class="hour-heading"><text/>{{group.label}}</view>
      <view class="hour-grid">
       <view><text>课时总数</text><view class="hour-input"><input v-model="draft[group.total]" type="number" :disabled="busy" maxlength="5" placeholder="请输入"/><em>时</em></view></view>
       <view><text>已消耗课时</text><view class="hour-input"><input v-model="draft[group.used]" type="number" :disabled="busy" maxlength="5" placeholder="请输入"/><em>时</em></view></view>
       <view><text>剩余课时</text><view class="hour-input locked"><input :value="remain(draft[group.total],draft[group.used])" disabled placeholder="—"/><em>时</em></view></view>
      </view>
     </view>
     <text v-if="actionError" class="dialog-error">{{actionError}}</text>
     <button class="sheet-submit" :disabled="busy" @click="saveHours">{{busy?'提交中…':'确定'}}</button>
    </template>
   </view>
  </view>
 </view>
</template>
<script setup>
import {ref} from 'vue'
import {onLoad,onShow,onUnload} from '@dcloudio/uni-app'
import {useAuth} from '../../composables/useAuth'
import {useAsyncPage} from '../../composables/useAsyncPage'
import {getStoreMemberProfiles,updateStoreMember} from '../../services/training'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
import FeaturePageState from '../../components/FeaturePageState.vue'
useAuth()
let contextId='',memberId='',active=true
const editor=ref(''),busy=ref(false),draft=ref({}),actionError=ref(''),noteTitle=ref(''),noteKey=ref(''),current=ref(null)
const hourGroups=[{id:'training',label:'训练',total:'trainingTotal',used:'trainingUsed'},{id:'special',label:'特制',total:'specialTotal',used:'specialUsed'}]
const {data,status,error,load}=useAsyncPage(()=>getStoreMemberProfiles(contextId,memberId),false)
const can=action=>data.value?.allowedActions?.includes(action)
const hour=value=>Number.isInteger(value)?value:'—'
function readRouteId(value){let text=value||'';for(let i=0;i<2&&text.includes('%');i++){try{const next=decodeURIComponent(text);if(next===text)break;text=next}catch{break}}return text}
function remain(total,used){const a=Number(total),b=Number(used);return Number.isInteger(a)&&Number.isInteger(b)?Math.max(0,a-b):(Number.isFinite(a)&&Number.isFinite(b)&&String(total)!==''&&String(used)!==''?Math.max(0,Math.trunc(a)-Math.trunc(b)):'—')}
function payload(member,patch){return {version:member.version,trainingTotal:member.trainingTotal,trainingUsed:member.trainingUsed,specialTotal:member.specialTotal,specialUsed:member.specialUsed,selfStudyNote:member.selfStudyNote||'',campNote:member.campNote||'',remark:member.remark||'',...patch}}
function openHours(member){current.value=member;actionError.value='';draft.value={trainingTotal:member.trainingTotal,trainingUsed:member.trainingUsed,specialTotal:member.specialTotal,specialUsed:member.specialUsed};editor.value='hours'}
function openNote(member,key,title){current.value=member;noteKey.value=key;noteTitle.value=title;actionError.value='';draft.value={text:member[key]||''};editor.value='note'}
function close(){if(!busy.value)editor.value=''}
function feedback(member,kind){uni.navigateTo({url:`/pages/feedback/list?contextId=${contextId}&memberId=${member.id}&kind=${kind}`})}
function orders(member){uni.navigateTo({url:`/pages/order/list?contextId=${contextId}&memberId=${member.id}`})}
function integers(source){const value={};for(const group of hourGroups){for(const key of [group.total,group.used]){const number=Number(source[key]);if(!Number.isInteger(number))throw new Error('课时须为0—10000的整数');value[key]=number}}return value}
async function saveHours(){if(busy.value||!current.value)return;busy.value=true;actionError.value='';try{const hours=integers(draft.value);await updateStoreMember(contextId,current.value.id,payload(current.value,hours));if(active){editor.value='';await load();uni.showToast({title:'已保存',icon:'success'})}}catch(reason){if(active)actionError.value=reason.message||'保存失败'}finally{if(active)busy.value=false}}
async function saveNote(){if(busy.value||!current.value)return;busy.value=true;actionError.value='';try{await updateStoreMember(contextId,current.value.id,payload(current.value,{[noteKey.value]:draft.value.text||''}));if(active){editor.value='';await load();uni.showToast({title:'已保存',icon:'success'})}}catch(reason){if(active)actionError.value=reason.message||'保存失败'}finally{if(active)busy.value=false}}
onLoad(query=>{contextId=readRouteId(query.contextId);memberId=readRouteId(query.memberId)})
onShow(()=>{if(!editor.value)load()})
onUnload(()=>{active=false})
</script>
<style>@import '../../styles/commerce.css';@import '../../styles/exclusive.css';</style>
<style scoped>
.member-detail{max-width:750px;margin:0 auto;font-size:clamp(14px,3.7vw,16px)}
.member-card{position:relative;margin-bottom:1em;padding:1.1em .85em .9em;border-radius:.75em;background:#353a59}
.member-index{position:absolute;top:0;right:0;padding:.15em .7em;border-radius:0 .75em 0 .7em;background:#596381;font-size:.78em}
.member-heading{display:flex;gap:.7em;align-items:center;margin-bottom:.8em;padding-right:3.2em}
.member-avatar{width:3.1em;height:3.1em;border-radius:50%;flex:none;background:#375682}
.avatar-letter{display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700}
.member-information{min-width:0;flex:1}
.member-name{font-size:1.05em;font-weight:700;overflow-wrap:anywhere}
.member-name text{display:inline-block;margin-left:.4em;padding:0 .55em;border-radius:1em;background:linear-gradient(90deg,#00b7ff,#3157ff);font-size:.72em;font-weight:400;line-height:1.7}
.member-meta{margin-top:.25em;color:#a8b8d1;font-size:.78em;line-height:1.6;overflow-wrap:anywhere}
.member-row{display:flex;min-height:4.2em;margin-bottom:.45em;overflow:hidden;border-radius:.45em;background:#454d6e}
.row-label{display:flex;align-items:center;justify-content:center;width:2.4em;flex:none;padding:.4em .35em;background:#555e7b;color:#d5dced;font-size:.78em;line-height:1.25;text-align:center}
.row-body{min-width:0;flex:1;padding:.55em .6em;color:#e7eefb;font-size:.78em;line-height:1.65;overflow-wrap:anywhere}
.row-body em{color:#fff;font-style:normal;font-weight:700}
.row-side{display:flex;align-items:center;justify-content:center;width:2.6em;flex:none;margin:0;padding:.35em .15em;color:#fff;font-size:.75em;line-height:1.25;text-align:center;white-space:normal}
.row-side.green{background:#16b86a}
.row-side.blue{background:linear-gradient(180deg,#1aa7ff,#245bff)}
.member-orders{display:block;width:8.5em;margin:.7em auto 0;border-radius:2em;background:linear-gradient(95deg,#0340ff,#009bff);color:#fff;font-size:.9em;line-height:2.3}
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
@media(max-width:340px){.hour-grid{grid-template-columns:1fr}.member-meta{font-size:.72em}}
</style>
