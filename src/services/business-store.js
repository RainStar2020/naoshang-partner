import {config} from '../config'
import {request} from './api'
import {withBusinessContext} from './business'
import {mockBusinessState,saveMockBusinessState,mockClone,mockStoreWorkspace} from './mock/business'
import {mockProfileState} from './mock/profile'
import {mockExclusiveState,saveMockExclusiveState} from './mock/exclusive'
export function getBusinessStore(contextId){return withBusinessContext(contextId,'agency:store-management',async(account,context)=>{
  if(context.module!=='agency')throw new Error('当前身份暂不支持此功能')
  const result=config.useMock?mockStoreWorkspace(account,context):await request('/agency/store-workspace',{data:{assignmentId:context.assignmentId,contextId:context.id,storeId:context.storeId}})
  if(!result?.store?.id||!Array.isArray(result.staff)||!Array.isArray(result.approvals)||!Array.isArray(result.members)||!Array.isArray(result.owners)||!Array.isArray(result.allowedActions))throw new Error('门店信息暂时无法加载，请稍后重试')
  return result
})}
export function saveBusinessCoach(contextId,storeId,id,draft,idempotencyKey){return withBusinessContext(contextId,'agency:store-management',async(account,context)=>{
  const name=String(draft.name||'').trim(),loginAccount=String(draft.loginAccount||'').trim()
  const password=String(draft.password||'')
  if((!id&&!password)||(password&&(password.length<6||password.length>32||/\s/.test(password))))throw new Error('请设置6—32位无空格密码')
  if(!name||Array.from(name).length>24)throw new Error('请输入1—24字健脑官姓名')
  if(!/^[a-zA-Z0-9_-]{4,32}$/.test(loginAccount))throw new Error('登录账号为4—32位字母、数字、下划线或短横线')
  if(!id&&!idempotencyKey)throw new Error('请完整填写信息后再提交')
  if(!config.useMock)return request(`/stores/${encodeURIComponent(storeId)}/coaches${id?`/${encodeURIComponent(id)}`:''}`,{method:id?'PATCH':'POST',data:{name,loginAccount,...(password?{password}:{}),version:draft.version,idempotencyKey,contextId:context.id}})
  const state=mockBusinessState(account,context);if(storeId!==state.store.id)throw new Error('您无权管理此门店')
  const fingerprint=JSON.stringify({id,name,loginAccount,version:draft.version}),previous=state.operations.get(idempotencyKey)
  if(previous){if(previous.fingerprint!==fingerprint)throw new Error('信息已变化，请刷新后重新提交');return mockClone(previous.result)}
  const old=id?state.staff.find(item=>item.id===id):null
  if(id&&(!old||old.version!==draft.version))throw new Error('健脑官资料已更新，请刷新后重试')
  if(state.staff.some(item=>item.id!==id&&item.loginAccount===loginAccount&&!item.layoutSample))throw new Error('登录账号已存在')
  const coach={id:id||`demo-coach-${state.staff.length+1}`,name,loginAccount,status:'ACTIVE',invitationStatus:'ACTIVE',credentialSet:!!password||!!old?.credentialSet,layoutSample:false,version:(old?.version||0)+1}
  if(old)state.staff[state.staff.indexOf(old)]=coach;else state.staff.push(coach)
  state.version++;const result={coach:mockClone(coach),mockOnly:true};state.operations.set(idempotencyKey,{fingerprint,result});saveMockBusinessState(account,context);return result
})}
export function saveBusinessStore(contextId,storeId,draft){return withBusinessContext(contextId,'agency:store-management',async(account,context)=>{
  const profile=draft.managerName!=null
  const managerName=String(draft.managerName||'').trim(),name=String(draft.name||'').trim(),address=String(draft.address||'').trim(),contact=String(draft.contact||'').trim()
  const regionNames=Array.isArray(draft.regionNames)?draft.regionNames:[],regionCodes=Array.isArray(draft.regionCodes)?draft.regionCodes:[]
  if(profile){
    if(!managerName||Array.from(managerName).length>30)throw new Error('请填写1—30字姓名')
    if(!/^1\d{10}$/.test(contact))throw new Error('请填写正确联系手机号')
    if(regionNames.length!==3||regionCodes.length!==3)throw new Error('请选择门店地区')
    if(!address||Array.from(address).length>200)throw new Error('请填写1—200字门店地址')
    if(!Number.isInteger(draft.feeAmount)||draft.feeAmount<0)throw new Error('请输入合店费用')
  }else{
    if(!name||Array.from(name).length>60||!address||Array.from(address).length>200)throw new Error('请填写有效门店名称与地址')
    if(contact&&!/^1\d{10}$/.test(contact))throw new Error('请填写正确联系手机号')
  }
  if(!config.useMock)return request(`/stores/${encodeURIComponent(storeId)}`,{method:'PATCH',data:{...(profile?{managerName,regionNames,regionCodes,feeAmount:draft.feeAmount,storefrontAssetId:draft.storefrontAssetId||''}:{name}),address,contact,version:draft.version,contextId:context.id}})
  const state=mockBusinessState(account,context);if(state.store.id!==storeId||state.store.version!==draft.version)throw new Error('门店资料已变化或无权访问')
  if(profile){
    if(Number.isInteger(state.store.minimumFeeAmount)&&draft.feeAmount<state.store.minimumFeeAmount)throw new Error('合店费用不能低于当前报价')
    const asset=draft.storefrontAssetId?mockProfileState(account).assets.get(draft.storefrontAssetId):null
    if(draft.storefrontAssetId&&asset?.purpose!=='storefront')throw new Error('请上传门头照')
    if(!draft.storefrontAssetId&&!state.store.storefrontUrl)throw new Error('请上传门头照')
    state.store={...state.store,managerName,address,contact,regionNames,regionCodes,feeAmount:draft.feeAmount,storefrontAssetId:draft.storefrontAssetId||state.store.storefrontAssetId||'',storefrontUrl:draft.storefrontUrl||state.store.storefrontUrl||'',version:state.store.version+1}
  }else state.store={...state.store,name,address,contact,version:state.store.version+1}
  state.version++;saveMockBusinessState(account,context);return {store:mockClone(state.store),mockOnly:true}
})}
export function removeBusinessCoach(contextId,storeId,id,version){return withBusinessContext(contextId,'agency:store-management',async(account,context)=>{
  if(!id)throw new Error('未找到该健脑官，请刷新后重试')
  if(!config.useMock)throw new Error('当前暂不支持删除健脑官，请联系平台客服协助处理')
  const state=mockBusinessState(account,context);if(storeId!==state.store.id)throw new Error('您无权管理此门店')
  const index=state.staff.findIndex(item=>item.id===id)
  if(index<0||state.staff[index].version!==version)throw new Error('健脑官资料已更新，请刷新后重试')
  state.staff.splice(index,1);state.version++;saveMockBusinessState(account,context);return {removed:true,mockOnly:true}
})}
export function decideBusinessApplication(contextId,storeId,id,{decision,reason,version,idempotencyKey}){return withBusinessContext(contextId,'agency:store-management',async(account,context)=>{
  const text=String(reason||'').trim();if(!['APPROVE','REJECT'].includes(decision)||!idempotencyKey)throw new Error('审批信息有误，请重新选择审核结果')
  if((decision==='REJECT'&&!text)||Array.from(text).length>200)throw new Error('拒绝申请须填写1—200字原因')
  if(!config.useMock)return request(`/applications/${encodeURIComponent(id)}/decisions`,{method:'POST',data:{decision,reason:text,version,idempotencyKey,contextId:context.id,storeId}})
  const state=mockBusinessState(account,context);if(state.store.id!==storeId)throw new Error('您暂无该门店的审批权限')
  const fingerprint=JSON.stringify({id,decision,text,version}),previous=state.operations.get(idempotencyKey)
  if(previous){if(previous.fingerprint!==fingerprint)throw new Error('申请信息已变化，请刷新后重新审核');return mockClone(previous.result)}
  const application=state.approvals.find(item=>item.id===id);if(!application||application.version!==version||application.status!=='PENDING')throw new Error('申请状态已变化，请刷新后重试')
  const approved=decision==='APPROVE'
  if(application.type==='COSTORE'){
    if(application.paymentStatus!=='PAID')throw new Error('合店申请须付款成功后才能审核')
    application.status=approved?'APPROVED':'REJECTED'
    const own=mockExclusiveState(account).applications.find(item=>item.id===id)
    if(own){own.applicationStatus=application.status;own.reviewedAt=new Date().toISOString();own.rejectionReason=text;if(!approved)own.refundStatus='PENDING';saveMockExclusiveState(account)}
    if(!approved)application.refundStatus='PENDING'
  }else if(application.type==='TRANSFER'){
    const side=application.direction==='IN'||application.bucket==='transfer-in'?'targetApprovalStatus':'sourceApprovalStatus'
    if(application[side]&&application[side]!=='PENDING')throw new Error('本方已审核，请等待对方门店处理')
    application[side]=approved?'APPROVED':'REJECTED'
    application.status=!approved?'REJECTED':application.sourceApprovalStatus==='APPROVED'&&application.targetApprovalStatus==='APPROVED'?'APPROVED':'PENDING'
  }else application.status=approved?'APPROVED':'REJECTED'
  application.reason=text;application.reviewedAt=new Date().toISOString();application.version++;state.version++
  const result={status:application.status,nextStep:application.type==='TRANSFER'?'转店须转出和转入双方同意；实际归属迁移由服务端执行。':!approved?'合店已拒绝，退款结果以支付服务回执为准。':'门店审核已记录，合同与权益状态以服务端结果为准。',mockOnly:true};state.operations.set(idempotencyKey,{fingerprint,result});saveMockBusinessState(account,context);return result
})}
