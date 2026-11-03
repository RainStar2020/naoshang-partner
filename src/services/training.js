import {config} from '../config'
import {request,getSession} from './api'
import {withBusinessContext} from './business'
import {normalizeContent,isMediaUrl} from '../features/content/rich-content'
import * as mock from './mock/training'
import {isCoachAccount} from './account-channel'
const scoped=(contextId,operation)=>withBusinessContext(contextId,'agency:store-management',operation)
function actions(value){
 if(value==null)return {allowedActions:[]}
 if(value.allowedActions==null)return {...value,allowedActions:[]}
 if(!Array.isArray(value.allowedActions))throw new Error('操作权限数据异常')
 return value
}
export function normalizeTrainingFeedback(value,memberId,id){if(value?.id!==id||value.memberId!==memberId||typeof value.title!=='string')throw new Error('反馈会员或数据不匹配');return {...value,content:normalizeContent(value.content),images:(value.images||[]).filter(url=>config.useMock||isMediaUrl(url)),attachments:(value.attachments||[]).filter(item=>item&&typeof item.assetId==='string'&&['file','video'].includes(item.kind)&&(config.useMock||isMediaUrl(item.previewUrl)))}}
export async function getCoachWorkspace(contextId){
  const session=getSession()
  if(isCoachAccount(session)){
    // TODO(API): dedicated staff bootstrap; no agency/parent preview grants.
    if(config.useMock)throw new Error('请联系门店开通健脑官账号')
    const result=await request('/coach/workspace')
    if(getSession()?.token!==session.token||getSession()?.user?.id!==session.user.id)throw new Error('登录账号已变化')
    if(!result?.store?.id||!result.contextId||!Array.isArray(result.members))throw new Error('健脑官工作台数据异常')
    return actions(result)
  }
  return scoped(contextId,async(user,context)=>{const members=config.useMock?mock.mockCoachMembers(user):null;const result=config.useMock?{contextId:context.id,name:user.name||'健脑官',store:mock.mockCoachStore(user,context,members[0].id),members,allowedActions:['manage-members','read-orders','write-feedback']}:await request('/coach/workspace',{data:{contextId:context.id}});if(!result?.store?.id||!Array.isArray(result.members))throw new Error('健脑官工作台数据异常');return actions(result)})
}
function selfStudyText(pack,fallback=''){
  if(typeof fallback==='string'&&fallback.trim())return fallback
  const note=pack?.selfStudyNote||pack?.selfStudy?.note||''
  if(note)return note
  const study=pack?.selfStudy
  if(!study?.startDate&&!study?.expireDate)return ''
  const months=study.months!=null?`，为期${study.months}个月`:''
  const start=study.startDate?`${study.startDate}开始`:''
  const end=study.expireDate?`${study.expireDate}到期`:''
  return [start+months,end].filter(Boolean).join('，')
}
function normalizeMemberActions(list){
  const actions=Array.isArray(list)?[...list]:[]
  const aliases=[
    ['view-orders','read-orders'],
    ['training-feedback','write-feedback'],
    ['promotion-feedback','write-feedback'],
    ['self-study-feedback','write-feedback'],
    ['camp-feedback','write-feedback'],
    ['create-feedback','write-feedback'],
  ]
  for(const [from,to] of aliases){if(actions.includes(from)&&!actions.includes(to))actions.push(to)}
  return actions
}
function normalizeStoreMember(member){
  if(!member||typeof member!=='object')return member
  const pack=member.training&&typeof member.training==='object'?member.training:null
  const info=member.trainInfo&&typeof member.trainInfo==='object'?member.trainInfo:null
  const number=value=>{const n=Number(value);return Number.isFinite(n)?n:0}
  const trainingTotal=number(member.trainingTotal??pack?.trainingTotal??pack?.total??info?.trainingTotal)
  const trainingUsed=number(member.trainingUsed??pack?.trainingUsed??pack?.used??info?.trainingUsed)
  const specialTotal=number(member.specialTotal??pack?.specialTotal??member.customHours?.total??info?.specialTotal)
  const specialUsed=number(member.specialUsed??pack?.specialUsed??member.customHours?.used??info?.specialUsed)
  const admissionTotal=number(member.admissionTotal??pack?.promotionTotal??pack?.admissionTotal??info?.admissionTotal)
  const admissionUsed=number(member.admissionUsed??pack?.promotionUsed??pack?.admissionUsed??info?.admissionUsed)
  const consultant=member.consultant||member.serviceConsultant||null
  return {
    ...member,
    badge:member.badge||member.memberLevelName||'',
    trainingTotal,
    trainingUsed,
    specialTotal,
    specialUsed,
    admissionTotal,
    admissionUsed,
    admissionRemaining:number(member.admissionRemaining??pack?.promotionRemaining??remainSafe(admissionTotal,admissionUsed)),
    selfStudyNote:selfStudyText(pack,member.selfStudyNote??info?.selfStudyNote??''),
    campNote:member.campNote??pack?.campNote??info?.campNote??'',
    remark:member.remark??pack?.remark??info?.remark??'',
    admissionNote:member.admissionNote??pack?.admissionNote??info?.admissionNote??'',
    consultant:consultant?{...consultant,qrUrl:consultant.qrUrl||consultant.wechatQr||'',qrPayload:consultant.qrPayload||consultant.phone||consultant.name||''}:null,
    allowedActions:normalizeMemberActions(member.allowedActions),
    memberIndex:member.memberIndex||null,
  }
}
function remainSafe(total,used){return Math.max(0,numberOrZero(total)-numberOrZero(used))}
function numberOrZero(value){const n=Number(value);return Number.isFinite(n)?n:0}
export function getStoreMember(contextId,id){return scoped(contextId,async user=>{const result=config.useMock?{member:mock.mockTrainingMember(user,id),allowedActions:['edit-training','write-feedback','transfer','read-orders','edit-consultant']}:await request(`/members/${encodeURIComponent(id)}/store-profile`,{data:{contextId}});if(result?.member?.id!==id)throw new Error('会员资料不匹配');return actions({...result,member:normalizeStoreMember(result.member)})})}
export function getStoreMemberProfiles(contextId,accountId){return scoped(contextId,async(user,context)=>{
  if(config.useMock){
    const items=mock.mockStoreProfilesForAccount(user,accountId).map(normalizeStoreMember)
    if(!items.length)throw new Error('暂无会员')
    return {items,allowedActions:['edit-training','write-feedback','transfer','read-orders','edit-consultant']}
  }
  // Prefer children already returned by store-workspace for this store user.
  const workspace=await request('/agency/store-workspace',{data:{assignmentId:context.assignmentId,contextId:context.id,storeId:context.storeId}})
  const parents=Array.isArray(workspace?.members)?workspace.members:[]
  const parent=parents.find(item=>[item.id,item.accountId,item.userId].some(value=>String(value||'')===String(accountId)))
  let children=Array.isArray(parent?.children)?parent.children:[]
  if(!children.length&&Array.isArray(workspace?.childMembers)){
    const alone=workspace.childMembers.find(item=>String(item.id)===String(accountId))
    if(alone)children=[alone]
  }
  if(!children.length)throw new Error('暂无会员')
  // Listed under this store workspace ⇒ store-owned; grant consultant edit without per-member action flags.
  const items=children.map(member=>{
    const normalized=normalizeStoreMember(member)
    const next=normalizeMemberActions([...(normalized.allowedActions||[]),'edit-consultant','read-orders'])
    return {...normalized,allowedActions:next}
  })
  const allowedActions=normalizeMemberActions([].concat(...items.map(item=>item.allowedActions||[]),parent?.allowedActions||[],['edit-consultant','read-orders']))
  return actions({items,allowedActions})
})}
export function updateStoreMember(contextId,id,draft){return scoped(contextId,async user=>config.useMock?mock.mockUpdateTraining(user,id,draft):request(`/members/${encodeURIComponent(id)}/training`,{method:'PATCH',data:{...draft,contextId}}))}
export function updateMemberConsultant(contextId,memberId,draft){return scoped(contextId,async user=>{
  const name=String(draft.name||'').trim(),phone=String(draft.phone||'').trim()
  if(!name||Array.from(name).length>30)throw new Error('请填写1—30字顾问姓名')
  if(!/^1\d{10}$/.test(phone))throw new Error('请填写正确手机号')
  if(config.useMock)return mock.mockUpdateConsultant(user,memberId,{name,phone,qrUrl:draft.qrUrl||'',qrPayload:draft.qrPayload||phone,qrAssetId:draft.qrAssetId||''})
  // TODO(API): replace with the real consultant update endpoint when backend is ready.
  throw new Error('编辑顾问接口暂未开通，请稍后')
})}
export function getTrainingFeedback(contextId,memberId,kind){return scoped(contextId,async user=>{const result=config.useMock?{...mock.mockFeedbackList(user,memberId,kind),allowedActions:['write-feedback']}:await request(`/members/${encodeURIComponent(memberId)}/training-feedback`,{data:{contextId,kind}});const page=result==null||result.items==null?{...(result||{}),items:[],hasMore:false,nextCursor:null}:result;if(!Array.isArray(page.items)||(page.hasMore!=null&&typeof page.hasMore!=='boolean'))throw new Error('反馈列表数据异常');return actions({...page,hasMore:page.hasMore===true,nextCursor:page.nextCursor||null})})}
export function saveTrainingFeedback(contextId,memberId,draft,key){return scoped(contextId,async user=>config.useMock?mock.mockSaveFeedback(user,memberId,draft,key):request('/training-feedback',{method:'POST',data:{...draft,memberId,contextId,idempotencyKey:key}}))}
function normalizeTransferStore(store){
  if(!store||typeof store!=='object')return store
  const manager=store.manager
  const managerName=store.managerName||(typeof manager==='string'?manager:manager?.name)||store.manager_name||''
  const phone=store.phone||store.contact||(typeof manager==='object'&&manager?manager.phone:'')||store.managerPhone||''
  const coverUrl=store.coverUrl||store.storefrontUrl||store.imageUrl||store.cover||''
  const number=store.number||store.storeNo||store.storeNumber||''
  const regionCodes=Array.isArray(store.regionCodes)?store.regionCodes.map(String):[]
  return {...store,managerName,manager:managerName,phone,coverUrl,number,regionCodes,address:store.address||''}
}
export function getTransferOptions(contextId,memberId){return scoped(contextId,async(user,context)=>{
  // API returns the full store list; province/city filtering is done on the page.
  const result=config.useMock?mock.mockTransferOptions(user,context,memberId):await request('/store-transfer/options',{data:{contextId,memberId}})
  if(!result?.currentStore?.id||!Array.isArray(result.stores))throw new Error('转店选项数据异常')
  return {...result,stores:result.stores.map(normalizeTransferStore)}
})}
export function applyStoreTransfer(contextId,memberId,draft,key){return scoped(contextId,async(user,context)=>{
  const result=config.useMock?mock.mockApplyTransfer(user,context,memberId,draft,key):await request('/store-transfer/applications',{method:'POST',data:{...draft,contextId,memberId,idempotencyKey:key}})
  const application=result?.application
  if(!application?.id||application.type!=='TRANSFER'||application.status!=='PENDING')throw new Error('转店申请结果异常')
  return result
})}
export async function getTrainingFeedbackDetail(memberId,id,contextId){if(contextId)return scoped(contextId,async user=>normalizeTrainingFeedback(config.useMock?mock.mockFeedback(user,memberId,id):await request(`/training-feedback/${encodeURIComponent(id)}`,{data:{memberId,contextId}}),memberId,id));const s=getSession();if(!s?.user?.id)throw new Error('请先登录');const result=config.useMock?mock.mockFeedback(s.user,memberId,id):await request(`/training-feedback/${encodeURIComponent(id)}`,{data:{memberId}});if(getSession()?.token!==s.token||getSession()?.user?.id!==s.user.id)throw new Error('账号已变化');return normalizeTrainingFeedback(result,memberId,id)}
