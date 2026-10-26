import {config} from '../config'
import {request,getSession} from './api'
import {withBusinessContext} from './business'
import {normalizeContent,isMediaUrl} from '../features/content/rich-content'
import * as mock from './mock/training'
import {isCoachAccount} from './account-channel'
const scoped=(contextId,operation)=>withBusinessContext(contextId,'agency:store-management',operation)
function actions(value){if(!Array.isArray(value?.allowedActions))throw new Error('操作权限数据异常');return value}
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
export function getStoreMember(contextId,id){return scoped(contextId,async user=>{const result=config.useMock?{member:mock.mockTrainingMember(user,id),allowedActions:['edit-training','write-feedback','transfer','read-orders']}:await request(`/members/${encodeURIComponent(id)}/store-profile`,{data:{contextId}});if(result?.member?.id!==id)throw new Error('会员资料不匹配');return actions(result)})}
export function getStoreMemberProfiles(contextId,memberId){return scoped(contextId,async user=>{if(!config.useMock){const result=await getStoreMember(contextId,memberId);return {items:[result.member],allowedActions:result.allowedActions}}const items=mock.mockStoreProfiles(user);if(!items.length)throw new Error('暂无门店会员');return {items,allowedActions:['edit-training','write-feedback','transfer','read-orders']}})}
export function updateStoreMember(contextId,id,draft){return scoped(contextId,async user=>config.useMock?mock.mockUpdateTraining(user,id,draft):request(`/members/${encodeURIComponent(id)}/training`,{method:'PATCH',data:{...draft,contextId}}))}
export function getTrainingFeedback(contextId,memberId,kind){return scoped(contextId,async user=>{const result=config.useMock?{...mock.mockFeedbackList(user,memberId,kind),allowedActions:['write-feedback']}:await request(`/members/${encodeURIComponent(memberId)}/training-feedback`,{data:{contextId,kind}});if(!Array.isArray(result?.items)||typeof result.hasMore!=='boolean')throw new Error('反馈列表数据异常');return actions(result)})}
export function saveTrainingFeedback(contextId,memberId,draft,key){return scoped(contextId,async user=>config.useMock?mock.mockSaveFeedback(user,memberId,draft,key):request('/training-feedback',{method:'POST',data:{...draft,memberId,contextId,idempotencyKey:key}}))}
export function getTransferOptions(contextId,memberId,filters={}){return scoped(contextId,async(user,context)=>{const result=config.useMock?mock.mockTransferOptions(user,context,memberId):await request('/store-transfer/options',{data:{contextId,memberId,...filters}});if(!result?.currentStore?.id||!Array.isArray(result.stores))throw new Error('转店选项数据异常');if(!config.useMock)return result;const regionCodes=filters.regionCodes?.length?filters.regionCodes:(result.defaultRegion?.codes||[]);return {...result,stores:result.stores.filter(x=>(!filters.keyword||`${x.name} ${x.address}`.includes(filters.keyword))&&(!regionCodes.length||regionCodes.every((code,n)=>x.regionCodes[n]===code)))}})}
export function applyStoreTransfer(contextId,memberId,draft,key){return scoped(contextId,async(user,context)=>config.useMock?mock.mockApplyTransfer(user,context,memberId,draft,key):request('/store-transfer/applications',{method:'POST',data:{...draft,contextId,memberId,idempotencyKey:key}}))}
export async function getTrainingFeedbackDetail(memberId,id,contextId){if(contextId)return scoped(contextId,async user=>normalizeTrainingFeedback(config.useMock?mock.mockFeedback(user,memberId,id):await request(`/training-feedback/${encodeURIComponent(id)}`,{data:{memberId,contextId}}),memberId,id));const s=getSession();if(!s?.user?.id)throw new Error('请先登录');const result=config.useMock?mock.mockFeedback(s.user,memberId,id):await request(`/training-feedback/${encodeURIComponent(id)}`,{data:{memberId}});if(getSession()?.token!==s.token||getSession()?.user?.id!==s.user.id)throw new Error('账号已变化');return normalizeTrainingFeedback(result,memberId,id)}
