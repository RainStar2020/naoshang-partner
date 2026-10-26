<template>
 <view class="account-page store-page feature-page" :class="{'has-dock':(panel==='staff' && tab==='coaches' && can('save-coach'))||panel==='edit'}">
  <FeaturePageState :status="status" :error="error" @retry="load"/>
  <template v-if="status==='ready'">
   <template v-if="panel==='staff'">
    <view class="store-tabs">
     <button :class="{selected:tab==='owners'}" @click="tab='owners'">合店老板</button>
     <button :class="{selected:tab==='coaches'}" @click="tab='coaches'">门店健脑官</button>
    </view>
    <template v-if="tab==='owners'">
     <view v-for="owner in data.owners" :key="owner.id" class="store-card">
      <view class="store-person">
       <view class="store-avatar">
        <image v-if="owner.avatarUrl && !failedAvatars[owner.id]" :src="owner.avatarUrl" mode="aspectFill" @error="markAvatar(owner.id)"/>
        <text v-else>{{owner.name?.slice(0,1) || '—'}}</text>
        <em>{{owner.roleLabel || '合店老板'}}</em>
       </view>
       <view class="store-person-copy">
        <view class="store-person-name">{{owner.name}}</view>
        <view class="store-person-meta">
         <text class="store-id">ID {{owner.displayId || '—'}}</text>
         <text>手机号 {{owner.phone || '—'}}</text>
        </view>
       </view>
      </view>
      <view class="store-performance">
       <view class="store-performance-head"><text>业绩统计</text><view>距合店到期还有 <em>{{dayText(owner.daysRemaining)}}</em>天</view></view>
       <view class="store-metrics">
        <view v-for="metric in owner.performance || []" :key="metric.label"><text>{{metric.label}}</text><strong>{{money(metric.value)}}</strong></view>
       </view>
      </view>
      <view class="store-contract">
       <view><text>合店时长：{{owner.durationLabel || '—'}}</text><text>合店费用：{{feeText(owner.feeAmount)}}</text></view>
       <text>合店开始时间：{{clock(owner.startedAt)}}</text>
       <text>合店到期时间：{{clock(owner.validUntil)}}</text>
      </view>
     </view>
     <EmptyState v-if="!data.owners.length" text="暂无合店老板"/>
    </template>
    <template v-else>
     <view v-for="coach in data.staff" :key="coach.id" class="store-card store-coach">
      <view class="store-coach-copy">
       <view class="store-person-name">{{coach.name}}</view>
       <view class="store-coach-account"><text>账号：{{coach.loginAccount}}</text><text>密码：{{passwordLabel(coach)}}</text></view>
      </view>
      <view class="store-coach-actions">
       <button v-if="can('save-coach')" aria-label="编辑健脑官" @click="editCoach(coach)"><image src="/static/common/icon-edit.png" mode="aspectFit"/></button>
       <button v-if="can('remove-coach')" aria-label="删除健脑官" @click="removeCoach(coach)"><image src="/static/common/icon-delete.png" mode="aspectFit"/></button>
      </view>
     </view>
     <EmptyState v-if="!data.staff.length" text="暂无健脑官"/>
    </template>
    <view v-if="tab==='coaches' && can('save-coach')" class="store-dock"><button :disabled="saving" @click="editCoach(null)">添加健脑官</button></view>
   </template>
   <template v-else-if="panel==='members'">
    <view v-for="member in data.members" :key="member.id" class="store-card store-member">
     <view class="store-person">
      <view class="store-avatar">
       <image v-if="member.avatarUrl && !failedAvatars[member.id]" :src="member.avatarUrl" mode="aspectFill" @error="markAvatar(member.id)"/>
       <text v-else>{{member.name?.slice(0,1) || '—'}}</text>
      </view>
      <view class="store-person-copy">
       <view class="store-person-name">{{member.name}}</view>
       <view class="store-person-meta"><text>用户ID：{{member.displayId || '—'}}</text><text>手机号：{{member.phone || '—'}}</text></view>
       <text class="store-line">门店消费：{{feeText(member.storeConsumptionAmount)}}</text>
      </view>
     </view>
     <view class="store-member-actions">
      <button class="outline" @click="transferMember(member.memberId)">申请转店</button>
      <button @click="memberDetail(member.memberId)">查看会员</button>
      <button @click="memberOrders(member.memberId)">查看订单</button>
     </view>
    </view>
    <EmptyState v-if="!data.members.length" text="暂无门店会员"/>
   </template>
   <template v-else-if="panel==='approvals'">
    <view class="approval-tabs"><button v-for="item in approvalTabs" :key="item.id" :class="{selected:approvalTab===item.id}" @click="approvalTab=item.id">{{item.label}}</button></view>
    <view v-for="item in visibleApprovals" :key="item.id" class="store-card">
     <view class="approval-head"><text>{{approvalTitle(item)}}</text><text :class="approvalTone(item)">{{approvalLabel(item)}}</text></view>
     <view class="store-person">
      <view class="store-avatar">
       <image v-if="item.avatarUrl && !failedAvatars[item.id]" :src="item.avatarUrl" mode="aspectFill" @error="markAvatar(item.id)"/>
       <text v-else>{{item.applicantName?.slice(0,1) || '—'}}</text>
      </view>
      <view class="store-person-copy">
       <view class="store-person-name">{{item.applicantName || '—'}}<text v-if="item.badge" class="approval-badge">{{item.badge}}</text></view>
       <view class="store-person-meta"><text>用户ID：{{item.displayId || '—'}}</text><text>手机号：{{item.phone || '—'}}</text></view>
      </view>
     </view>
     <view class="approval-rows">
      <template v-if="approvalBucket(item)==='costore'">
       <view><text>合店单价</text><text>{{feeMonth(item.unitAmount)}}</text></view>
       <view><text>合店费用</text><text>{{feeText(item.feeAmount)}}</text></view>
      </template>
      <template v-else>
       <view><text>当前门店</text><text>{{item.currentStoreName || '—'}}</text></view>
       <view><text>转入门店</text><text>{{item.targetStoreName || '—'}}</text></view>
      </template>
      <view><text>申请时间</text><text>{{clock(item.appliedAt)}}</text></view>
      <view v-if="item.reviewedAt"><text>审核时间</text><text>{{clock(item.reviewedAt)}}</text></view>
     </view>
     <view v-if="canDecide(item)" class="approval-actions">
      <button class="reject" @click="askDecision(item,'REJECT')">审核拒绝</button>
      <button class="pass" @click="askDecision(item,'APPROVE')">审核通过</button>
     </view>
    </view>
    <EmptyState v-if="!visibleApprovals.length" text="暂无申请"/>
   </template>
   <template v-else-if="panel==='edit'">
    <view class="edit-card">
     <view class="edit-row"><text>姓名</text><input v-model="draft.managerName" :disabled="saving" maxlength="30" placeholder="请输入"/></view>
     <view class="edit-row"><text>手机号</text><input v-model="draft.contact" type="number" :disabled="saving" maxlength="11" placeholder="请输入"/></view>
    </view>
    <view class="edit-card">
     <view class="edit-row"><text>门店地区</text><view class="edit-picker"><RegionPicker plain :label="regionLabel" :codes="draft.regionCodes || []" @change="regionChanged"/></view></view>
     <view class="edit-row edit-address"><text>门店地址</text><textarea v-model="draft.address" :disabled="saving" maxlength="200" placeholder="请输入" auto-height/></view>
     <view class="edit-row edit-photo"><text>门头照</text><button class="upload-tile" :disabled="saving||uploading" @click="uploadStorefront"><image v-if="draft.storefrontUrl" :src="draft.storefrontUrl" mode="aspectFill"/><template v-else><text class="plus">+</text><text>{{uploading?'上传中':'上传'}}</text></template></button></view>
    </view>
    <view class="edit-card">
     <view class="edit-row"><text>合店费用</text><input v-model="draft.feeText" :disabled="saving" maxlength="12" placeholder="请输入"/><text v-if="minimumText" class="minimum">最低{{minimumText}}</text></view>
    </view>
    <text v-if="saveError" class="store-error">{{saveError}}</text>
    <view class="store-dock"><button :disabled="saving||uploading" @click="submitStore">{{saving?'提交中…':'提交申请'}}</button></view>
   </template>
   <template v-else>
    <view class="store-card">
     <view class="store-person-name">{{data.store.name}}</view>
     <text v-if="data.store.number" class="store-line">{{data.store.number}}</text>
     <text class="store-line">{{data.store.address || '地址待后台提供'}}</text>
     <text v-if="data.store.contact" class="store-line">{{data.store.contact}}</text>
     <button v-if="can('edit-store')" class="store-text-link" @click="editStore">编辑门店信息</button>
    </view>
   </template>
  </template>
  <view v-if="editor" class="feature-mask" @click="close">
   <view class="feature-sheet store-sheet" @click.stop>
    <view class="store-sheet-title">{{sheetTitle}}<button :disabled="saving" aria-label="关闭" @click="close"><image src="/static/common/icon-close.png" mode="aspectFit"/></button></view>
    <template v-if="editor==='store'">
     <view class="store-field"><text>门店名称</text><input v-model="draft.name" :disabled="saving" maxlength="60" placeholder="请输入"/></view>
     <view class="store-field"><text>详细地址</text><input v-model="draft.address" :disabled="saving" maxlength="200" placeholder="请输入"/></view>
     <view class="store-field"><text>联系电话</text><input v-model="draft.contact" type="number" :disabled="saving" maxlength="11" placeholder="请输入"/></view>
    </template>
    <template v-else-if="editor==='coach'">
     <view class="store-field"><text>健脑官姓名</text><input v-model="draft.name" :disabled="saving" maxlength="24" placeholder="请输入"/></view>
     <view class="store-field"><text>账号</text><input v-model="draft.loginAccount" :disabled="saving" maxlength="32" placeholder="请输入"/></view>
     <view class="store-field"><text>密码</text><input v-model="draft.password" password :disabled="saving" maxlength="32" placeholder="请输入"/></view>
    </template>
    <template v-else>
     <text class="store-line">请从审批列表重新进入</text>
    </template>
    <text v-if="saveError" class="store-error">{{saveError}}</text>
    <button :disabled="saving" class="store-submit" @click="save">{{saving?'提交中…':'确定'}}</button>
   </view>
  </view>
  <view v-if="decision" class="confirm-mask" @click="cancelDecision">
   <view class="confirm-dialog" role="dialog" aria-label="审批确认" @click.stop>
    <view>{{decision==='APPROVE'?'确定要通过审核吗?':'确定要拒绝审核吗?'}}</view>
    <textarea v-if="decision==='REJECT'" v-model="draft.reason" :disabled="saving" maxlength="200" placeholder="请填写拒绝原因"/>
    <text v-if="saveError" class="store-error">{{saveError}}</text>
    <view class="confirm-actions"><button :disabled="saving" @click="saveDecision">确定</button><button :disabled="saving" @click="cancelDecision">取消</button></view>
   </view>
  </view>
 </view>
</template>
<script setup>
import {computed, reactive, ref, watch, onUnmounted} from 'vue'
import {getBusinessContext} from '../services/business'
import {getBusinessStore, saveBusinessCoach, saveBusinessStore, decideBusinessApplication, removeBusinessCoach} from '../services/business-store'
import {money} from '../features/exclusive/format'
import {useAsyncPage} from '../composables/useAsyncPage'
import FeaturePageState from './FeaturePageState.vue'
import EmptyState from './EmptyState.vue'
import RegionPicker from './RegionPicker.vue'
import {uploadProfileImage} from '../services/profile'
const props=defineProps({pageQuery:Object})
const approvalTabs=[{id:'costore',label:'合店申请'},{id:'transfer-out',label:'转店申请'},{id:'transfer-in',label:'转店审批'}]
const context=ref(null),tab=ref('owners'),approvalTab=ref('costore'),editor=ref(''),draft=ref({}),saving=ref(false),uploading=ref(false),saveError=ref(''),selectedApplication=ref(null),decision=ref(''),failedAvatars=reactive({})
let active=true,attemptKey='',attemptPayload='',storeDraftReady=false
const panel=computed(()=>['members','approvals','info','edit'].includes(props.pageQuery?.view)?props.pageQuery.view:'staff')
const sheetTitle=computed(()=>editor.value==='store'?'编辑门店':editor.value==='coach'?(draft.value.id?'编辑健脑官':'添加健脑官'):'审批确认')
function readContextId(query){let id=String(query?.contextId||'');for(let n=0;n<2&&/%[0-9A-Fa-f]{2}/.test(id);n++){try{const next=decodeURIComponent(id);if(next===id)break;id=next}catch{break}}return id}
const {data,status,error,load}=useAsyncPage(async()=>{const ctx=await getBusinessContext('agency',readContextId(props.pageQuery)||undefined);context.value=ctx;return getBusinessStore(ctx.id)},false)
watch(()=>props.pageQuery,query=>{if(!query)return;if(query.tab==='coaches'||query.tab==='owners')tab.value=query.tab;load()},{immediate:true})
watch(data,()=>{if(panel.value==='edit')fillStoreDraft()})
const can=action=>data.value?.allowedActions?.includes(action)
const visibleApprovals=computed(()=>(data.value?.approvals||[]).filter(item=>approvalBucket(item)===approvalTab.value))
const regionLabel=computed(()=>(draft.value.regionNames||[]).join('')||'请选择')
const minimumText=computed(()=>{const text=money(data.value?.store?.minimumFeeAmount);return text==='—'?'':`¥${text}`})
function approvalBucket(item){if(item?.bucket)return item.bucket;if(item?.type==='COSTORE')return 'costore';return item?.direction==='IN'?'transfer-in':'transfer-out'}
function approvalTitle(item){return item.title||'申请'}
function approvalLabel(item){if(item.type==='COSTORE')return {PENDING:'待门店审核',APPROVED:'门店已通过',REJECTED:'门店已拒绝'}[item.status]||'状态待确认';if(item.type==='TRANSFER'&&item.status==='PENDING'&&(item.sourceApprovalStatus==='APPROVED'||item.targetApprovalStatus==='APPROVED'))return '等待另一方审核';return {PENDING:'待双方审核',APPROVED:'双方已通过',REJECTED:'已拒绝'}[item.status]||'状态待确认'}
function approvalTone(item){return item.status==='REJECTED'?'rejected':item.status==='APPROVED'?'approved':'pending'}
function feeMonth(value){const text=feeText(value);return text==='—'?'—':`${text}/月`}
function canDecide(item){if(item.status!=='PENDING'||!can('approve'))return false;if(approvalBucket(item)==='costore')return item.paymentStatus==='PAID';const side=approvalBucket(item)==='transfer-in'?'targetApprovalStatus':'sourceApprovalStatus';return !item[side]||item[side]==='PENDING'}
function markAvatar(id){failedAvatars[id]=true}
function dayText(value){return Number.isInteger(value)?String(value):'—'}
function feeText(value){const text=money(value);return text==='—'?'—':`¥${text}`}
function clock(value){const date=new Date(value);if(Number.isNaN(date.getTime()))return value||'—';const pad=n=>String(n).padStart(2,'0');return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`}
function passwordLabel(coach){return coach.credentialSet?'******':'待设置'}
function memberQuery(id){return `contextId=${encodeURIComponent(context.value.id)}&memberId=${encodeURIComponent(id)}`}
function memberDetail(id){if(!id)return;uni.navigateTo({url:`/pages/members/detail?${memberQuery(id)}`})}
function memberOrders(id){if(!id)return;uni.navigateTo({url:`/pages/order/list?${memberQuery(id)}`})}
function transferMember(id){if(!id)return;uni.navigateTo({url:`/pages/store/transfer-apply?${memberQuery(id)}`})}
function reset(){saveError.value='';attemptKey='';attemptPayload=''}
function editStore(){uni.navigateTo({url:`/pages/store/index?contextId=${context.value.id}&view=edit`})}
function fillStoreDraft(){if(storeDraftReady||!data.value?.store)return;const store=data.value.store;draft.value={managerName:store.managerName||'',contact:store.contact||'',address:store.address||'',regionNames:[...(store.regionNames||[])],regionCodes:[...(store.regionCodes||[])],feeText:'',storefrontAssetId:'',storefrontUrl:store.storefrontUrl||'',version:store.version,reason:''};storeDraftReady=true}
function regionChanged(value){draft.value={...draft.value,regionNames:value.names,regionCodes:value.codes}}
function yuanToCents(value){const text=String(value??'').trim();if(!/^\d+(\.\d{1,2})?$/.test(text))return null;const [whole,frac='']=text.split('.');const cents=Number(whole)*100+Number((frac+'00').slice(0,2));return Number.isSafeInteger(cents)?cents:null}
function askDecision(item,value){reset();selectedApplication.value=item;decision.value=value;draft.value={...draft.value,reason:''}}
function cancelDecision(){if(!saving.value){decision.value='';saveError.value=''}}
async function uploadStorefront(){if(uploading.value||saving.value)return;uploading.value=true;saveError.value='';try{const result=await new Promise((resolve,reject)=>uni.chooseImage({count:1,success:resolve,fail:reject})),file=result.tempFiles?.[0];if(!file||!active)return;const asset=await uploadProfileImage({path:file.path,size:file.size||1},'storefront');if(active){draft.value.storefrontAssetId=asset.assetId;draft.value.storefrontUrl=asset.previewUrl}}catch(reason){if(active&&reason?.message)saveError.value=reason.message}finally{if(active)uploading.value=false}}
async function submitStore(){if(saving.value||uploading.value)return;const feeAmount=yuanToCents(draft.value.feeText);if(feeAmount==null){saveError.value='请输入合店费用';return}saving.value=true;saveError.value='';try{await saveBusinessStore(context.value.id,data.value.store.id,{managerName:draft.value.managerName,contact:draft.value.contact,address:draft.value.address,regionNames:draft.value.regionNames,regionCodes:draft.value.regionCodes,feeAmount,storefrontAssetId:draft.value.storefrontAssetId,storefrontUrl:draft.value.storefrontUrl,version:draft.value.version});if(!active)return;uni.showToast({title:'申请已提交',icon:'success'});uni.navigateBack({fail:()=>uni.redirectTo({url:`/pages/store/index?contextId=${context.value.id}&view=info`})})}catch(reason){if(active)saveError.value=reason.message||'提交失败'}finally{if(active)saving.value=false}}
async function saveDecision(){if(saving.value||!selectedApplication.value)return;saving.value=true;saveError.value='';const fingerprint=JSON.stringify({id:selectedApplication.value.id,decision:decision.value,reason:draft.value.reason||''});if(fingerprint!==attemptPayload){attemptPayload=fingerprint;attemptKey=`store-${Date.now()}-${Math.random().toString(36).slice(2)}`}try{await decideBusinessApplication(context.value.id,data.value.store.id,selectedApplication.value.id,{decision:decision.value,reason:draft.value.reason,version:selectedApplication.value.version,idempotencyKey:attemptKey});if(!active)return;decision.value='';uni.showToast({title:'审核已记录',icon:'success'});await load()}catch(reason){if(active)saveError.value=reason.message||'提交失败'}finally{if(active)saving.value=false}}
function editCoach(coach){reset();editor.value='coach';draft.value={id:coach?.id||'',name:coach?.name||'',loginAccount:coach?.loginAccount||'',password:'',version:coach?.version}}
function close(){if(!saving.value){draft.value.password='';editor.value=''}}
function removeCoach(coach){if(saving.value)return;uni.showModal({title:'删除健脑官',content:`确定删除${coach.name}？删除后不会回显或保留密码。`,success:async result=>{if(!result.confirm||!active)return;saving.value=true;try{await removeBusinessCoach(context.value.id,data.value.store.id,coach.id,coach.version);if(active){uni.showToast({title:'已删除',icon:'success'});await load()}}catch(reason){if(active)uni.showToast({title:reason.message||'删除失败',icon:'none'})}finally{if(active)saving.value=false}}})}
async function save(){if(saving.value)return;const mode=editor.value;const secret=String(draft.value.password||'');if(mode==='coach'&&secret&&(secret.length<6||secret.length>32)){saveError.value='密码为6—32位，且不会回显';return}saving.value=true;saveError.value='';const coachDraft={name:draft.value.name,loginAccount:draft.value.loginAccount,password:secret,version:draft.value.version};const fingerprint=JSON.stringify({mode,draft:mode==='coach'?coachDraft:draft.value,application:selectedApplication.value?.id,decision:decision.value});if(fingerprint!==attemptPayload){attemptPayload=fingerprint;attemptKey=`store-${Date.now()}-${Math.random().toString(36).slice(2)}`}try{let result;if(mode==='store')result=await saveBusinessStore(context.value.id,data.value.store.id,draft.value);else if(mode==='coach')result=await saveBusinessCoach(context.value.id,data.value.store.id,draft.value.id,coachDraft,attemptKey);else result=await decideBusinessApplication(context.value.id,data.value.store.id,selectedApplication.value.id,{decision:decision.value,reason:draft.value.reason,version:selectedApplication.value.version,idempotencyKey:attemptKey});if(!active)return;draft.value.password='';attemptPayload='';editor.value='';if(mode==='decision')uni.showModal({title:'审核已记录',content:result.nextStep||'请等待后续处理，审批不代表已经开通。',showCancel:false});else uni.showToast({title:'已保存',icon:'success'});await load()}catch(reason){if(active)saveError.value=reason.message||'提交失败'}finally{if(active)saving.value=false}}
onUnmounted(()=>{active=false});defineExpose({refresh:()=>{if(!editor.value)return load()}})
</script>
<style>@import '../styles/account.css';@import '../styles/exclusive.css';@import '../styles/business.css';</style>
<style scoped>
.store-page{color:#edf4ff;font-size:clamp(14px,3.7vw,16px);line-height:1.5}
.store-page button{margin:0;padding:0;background:none;color:inherit;line-height:inherit;font-size:inherit}
.store-page button::after{border:0}
.store-page.has-dock{padding-bottom:calc(5.2em + env(safe-area-inset-bottom))}
.store-tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7em;margin:0 0 .9em}
.store-tabs button{padding:.35em .4em;border-radius:2em;background:#464c6b;color:#c5cbe0;font-size:.95em;line-height:1.7}
.store-tabs button.selected{background:linear-gradient(95deg,#0340ff,#009bff);color:#fff;box-shadow:0 .15em .45em rgba(0,120,255,.35)}
.store-card{margin-bottom:.8em;padding:.9em .85em 1em;border-radius:.75em;background:#353a59}
.store-person{display:flex;gap:.7em;min-width:0}
.store-avatar{position:relative;flex:none;width:3.1em;height:3.1em;border-radius:50%;background:#2f5da5}
.store-avatar image,.store-avatar>text{display:flex;align-items:center;justify-content:center;width:100%;height:100%;border-radius:50%;object-fit:cover}
.store-avatar>em{position:absolute;left:50%;bottom:-.45em;transform:translateX(-50%);padding:0 .45em;border-radius:1em;background:linear-gradient(100deg,#00b7ff,#3157ff);color:#fff;font-size:.62em;font-style:normal;line-height:1.7;white-space:nowrap}
.store-person-copy{min-width:0;flex:1;padding-top:.15em}
.store-person-name{font-size:1.05em;font-weight:700;line-height:1.4;overflow-wrap:anywhere}
.store-person-meta{display:flex;flex-wrap:wrap;gap:.35em .55em;margin-top:.45em;color:#b7c0d8;font-size:.75em}
.store-id{padding:0 .5em;border-radius:1em;background:#4a5170;color:#d5dced;line-height:1.7}
.store-performance{margin-top:.95em}
.store-performance-head{display:flex;align-items:center;justify-content:space-between;gap:.6em;margin-bottom:.45em;font-size:.82em}
.store-performance-head em{color:#8ec8ff;font-style:normal;font-weight:700}
.store-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));padding:.35em 0;border-radius:.45em;background:#464c6b;text-align:center}
.store-metrics>view{min-width:0;padding:.45em .15em}
.store-metrics>view+view{box-shadow:inset 1px 0 0 #5c6484}
.store-metrics>view:nth-child(3n+1){box-shadow:none}
.store-metrics text{display:block;color:#a8b0c8;font-size:.75em}
.store-metrics strong{display:block;margin-top:.2em;font-size:.95em;font-weight:700}
.store-contract{margin-top:.75em;color:#d5dced;font-size:.82em;line-height:1.7}
.store-contract>view{display:flex;justify-content:space-between;gap:.8em}
.store-contract>view>text,.store-contract>text{display:block;min-width:0;overflow-wrap:anywhere}
.store-coach{display:flex;align-items:center;gap:.6em}
.store-coach-copy{min-width:0;flex:1}
.store-coach-account{display:flex;flex-wrap:wrap;gap:.2em .9em;margin-top:.35em;color:#b7c0d8;font-size:.78em}
.store-coach-actions{display:flex;flex:none;gap:.15em}
.store-coach-actions image{width:1.35em;height:1.35em}
.store-line{display:block;margin-top:.35em;color:#b7c0d8;font-size:.82em;line-height:1.6;overflow-wrap:anywhere}
.store-text-link{margin-top:.55em;color:#57adff;font-size:.85em}
.store-member-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.45em;margin-top:.8em}
.store-member-actions button{border-radius:2em;background:linear-gradient(95deg,#0340ff,#009bff);color:#fff;font-size:.78em;line-height:2.2}
.store-member-actions .outline{background:#353a59;box-shadow:inset 0 0 0 1px #3d7dff}
.approval-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin:0 0 .9em}
.approval-tabs button{padding:.15em .2em .55em;background:none;color:#9aa6c3;border-bottom:2px solid transparent;font-size:.95em}
.approval-tabs button.selected{color:#fff;border-bottom-color:#57adff}
.approval-head{display:flex;align-items:flex-start;justify-content:space-between;gap:.6em;margin-bottom:.75em;font-weight:700}
.approval-head>text:last-child{flex:none;font-size:.82em;font-weight:400}
.approval-head .pending{color:#57adff}
.approval-head .approved{color:#9aa6c3}
.approval-head .rejected{color:#ff5a7a}
.approval-badge{display:inline-block;margin-left:.4em;padding:0 .5em;border-radius:1em;background:linear-gradient(90deg,#00b7ff,#3157ff);font-size:.72em;font-weight:400;line-height:1.7}
.approval-rows{margin-top:.8em}
.approval-rows>view{display:flex;justify-content:space-between;gap:.6em;margin-top:.4em;padding:.55em .7em;border-radius:.4em;background:#464c6b;font-size:.78em}
.approval-rows text:first-child{flex:none;color:#b7c0d8}
.approval-rows text:last-child{min-width:0;text-align:right;overflow-wrap:anywhere}
.approval-actions{display:flex;justify-content:center;gap:.8em;margin-top:.9em}
.approval-actions button{width:7.4em;border-radius:2em;color:#fff;font-size:.88em;line-height:2.2}
.approval-actions .reject{background:#7c2348}
.approval-actions .pass{background:linear-gradient(95deg,#0340ff,#009bff)}
.edit-card{margin-bottom:.8em;padding:.15em .9em;border-radius:.75em;background:#353a59}
.edit-row{display:flex;align-items:center;gap:.7em;min-height:3.1em;border-bottom:1px solid #46506f}
.edit-row:last-child{border-bottom:0}
.edit-row>text:first-child{flex:none;width:4.4em;color:#d5dced}
.edit-row input,.edit-row textarea,.edit-picker{min-width:0;flex:1;color:#fff;font-size:1em}
.edit-row textarea{padding:.7em 0;line-height:1.5}
.edit-address,.edit-photo{align-items:flex-start;padding:.7em 0}
.edit-photo>text{padding-top:.8em}
.minimum{flex:none;color:#8b93ad;font-size:.78em}
.upload-tile{display:flex;flex-direction:column;align-items:center;justify-content:center;width:4.6em;height:4.6em;border-radius:.45em;background:#2c3354;color:#c5cbe0;font-size:.75em;line-height:1.3}
.upload-tile image{width:100%;height:100%;border-radius:.45em}
.upload-tile .plus{font-size:1.6em;line-height:1}
.confirm-mask{position:fixed;z-index:120;inset:0;display:flex;align-items:center;justify-content:center;padding:1.5em;background:rgba(0,0,0,.72);box-sizing:border-box}
.confirm-dialog{width:100%;max-width:20em;padding:1.5em 1.2em 1.1em;border-radius:1em;background:#343c62;text-align:center}
.confirm-dialog textarea{box-sizing:border-box;width:100%;min-height:4.5em;margin-top:.8em;padding:.6em;border-radius:.4em;background:#4a5170;color:#fff;text-align:left}
.confirm-actions{display:grid;grid-template-columns:1fr 1fr;margin-top:1.1em}
.confirm-actions button{color:#57adff;font-size:1em;line-height:2}
.store-dock{position:fixed;z-index:40;left:0;right:0;bottom:0;padding:.7em .9em calc(.7em + env(safe-area-inset-bottom));background:linear-gradient(180deg,rgba(39,44,71,0),#272c47 28%)}
.store-dock button,.store-submit{width:100%;max-width:750px;margin:0 auto;border-radius:3em;background:linear-gradient(95deg,#0340ff,#009bff);color:#fff;font-size:1em;line-height:2.7}
.store-sheet{background:#3a4164}
.store-sheet-title{position:relative;margin-bottom:1em;text-align:center;font-size:1.05em;font-weight:700;line-height:1.8}
.store-sheet-title button{position:absolute;right:0;top:0}
.store-sheet-title image{width:1.25em;height:1.25em}
.store-field{margin-bottom:.85em}
.store-field>text{display:block;margin-bottom:.4em;font-size:.95em}
.store-field input,.store-reason{box-sizing:border-box;width:100%;border-radius:.35em;background:#4a5170;color:#fff;font-size:1em}
.store-field input{height:2.6em;padding:0 .8em}
.store-reason{min-height:7em;padding:.8em;line-height:1.6}
.store-error{display:block;margin:.2em 0 .6em;color:#ffb4c4;font-size:.85em}
.store-submit{display:block}
@media(max-width:340px){
 .store-contract>view{flex-direction:column;gap:.15em}
 .store-performance-head{align-items:flex-start;flex-direction:column;gap:.15em}
 .store-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}
 .store-metrics>view+view{box-shadow:none}
 .store-metrics>view:nth-child(odd){box-shadow:none}
 .store-metrics>view:nth-child(even){box-shadow:inset 1px 0 0 #5c6484}
 .store-member-actions button,.approval-tabs button{font-size:.78em}
 .approval-actions{gap:.45em}
 .approval-actions button{width:6.4em}
}
</style>
