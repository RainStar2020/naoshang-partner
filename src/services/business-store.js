import {config} from '../config'
import {request} from './api'
import {withBusinessContext} from './business'
import {mockBusinessState,mockClone,mockStoreWorkspace} from './mock/business'
export function getBusinessStore(contextId){return withBusinessContext(contextId,'agency:store-management',async(account,context)=>{
  if(context.module!=='agency')throw new Error('当前身份不是区域代理')
  const result=config.useMock?mockStoreWorkspace(account,context):await request('/agency/store-workspace',{data:{assignmentId:context.assignmentId,contextId:context.id,storeId:context.storeId}})
  if(!result?.store?.id||!Array.isArray(result.staff)||!Array.isArray(result.approvals)||!Array.isArray(result.members)||!Array.isArray(result.owners)||!Array.isArray(result.allowedActions))throw new Error('门店经营资料异常')
  return result
})}
export function saveBusinessCoach(contextId,storeId,id,draft,idempotencyKey){return withBusinessContext(contextId,'agency:store-management',async(account,context)=>{
  const name=String(draft.name||'').trim(),loginAccount=String(draft.loginAccount||'').trim()
  if(!name||Array.from(name).length>24)throw new Error('请输入1—24字健脑官姓名')
  if(!/^[a-zA-Z0-9_-]{4,32}$/.test(loginAccount))throw new Error('演示登录账号为4—32位字母、数字、下划线或短横线')
  if(!id&&!idempotencyKey)throw new Error('缺少提交编号')
  if(!config.useMock)return request(`/stores/${encodeURIComponent(storeId)}/coaches${id?`/${encodeURIComponent(id)}`:''}`,{method:id?'PATCH':'POST',data:{name,loginAccount,version:draft.version,idempotencyKey,contextId:context.id}})
  const state=mockBusinessState(account,context);if(storeId!==state.store.id)throw new Error('无权管理此门店')
  const fingerprint=JSON.stringify({id,name,loginAccount,version:draft.version}),previous=state.operations.get(idempotencyKey)
  if(previous){if(previous.fingerprint!==fingerprint)throw new Error('重复提交参数不一致');return mockClone(previous.result)}
  const old=id?state.staff.find(item=>item.id===id):null
  if(id&&(!old||old.version!==draft.version))throw new Error('健脑官资料已更新，请刷新后重试')
  if(state.staff.some(item=>item.id!==id&&item.loginAccount===loginAccount))throw new Error('登录账号已存在')
  const coach={id:id||`demo-coach-${state.staff.length+1}`,name,loginAccount,status:old?.status||'PENDING',invitationStatus:old?.invitationStatus||'PENDING',version:(old?.version||0)+1}
  if(old)state.staff[state.staff.indexOf(old)]=coach;else state.staff.push(coach)
  state.version++;const result={coach:mockClone(coach),mockOnly:true};state.operations.set(idempotencyKey,{fingerprint,result});return result
})}
export function saveBusinessStore(contextId,storeId,draft){return withBusinessContext(contextId,'agency:store-management',async(account,context)=>{
  const name=String(draft.name||'').trim(),address=String(draft.address||'').trim(),contact=String(draft.contact||'').trim()
  if(!name||Array.from(name).length>60||!address||Array.from(address).length>200)throw new Error('请填写有效门店名称与地址')
  if(contact&&!/^1\d{10}$/.test(contact))throw new Error('请填写正确联系手机号')
  if(!config.useMock)return request(`/stores/${encodeURIComponent(storeId)}`,{method:'PATCH',data:{name,address,contact,version:draft.version,contextId:context.id}})
  const state=mockBusinessState(account,context);if(state.store.id!==storeId||state.store.version!==draft.version)throw new Error('门店资料已变化或无权访问')
  state.store={...state.store,name,address,contact,version:state.store.version+1};state.version++;return {store:mockClone(state.store),mockOnly:true}
})}
export function decideBusinessApplication(contextId,storeId,id,{decision,reason,version,idempotencyKey}){return withBusinessContext(contextId,'agency:store-management',async(account,context)=>{
  const text=String(reason||'').trim();if(!['APPROVE','REJECT'].includes(decision)||!idempotencyKey)throw new Error('审批参数无效')
  if((decision==='REJECT'&&!text)||Array.from(text).length>200)throw new Error('拒绝申请须填写1—200字原因')
  if(!config.useMock)return request(`/applications/${encodeURIComponent(id)}/decisions`,{method:'POST',data:{decision,reason:text,version,idempotencyKey,contextId:context.id,storeId}})
  const state=mockBusinessState(account,context);if(state.store.id!==storeId)throw new Error('无权审批此门店申请')
  const fingerprint=JSON.stringify({id,decision,text,version}),previous=state.operations.get(idempotencyKey)
  if(previous){if(previous.fingerprint!==fingerprint)throw new Error('重复审批参数不一致');return mockClone(previous.result)}
  const application=state.approvals.find(item=>item.id===id);if(!application||application.version!==version||application.status!=='PENDING')throw new Error('申请状态已变化，请刷新后重试')
  application.status=decision==='APPROVE'?'APPROVED':'REJECTED';application.reason=text;application.version++;state.version++
  const result={status:application.status,nextStep:'仅记录演示审核，不自动改门店归属、不签约、不付款或开通。',mockOnly:true};state.operations.set(idempotencyKey,{fingerprint,result});return result
})}
