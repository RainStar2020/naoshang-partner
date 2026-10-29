import {config} from '../config'
import {request,getSession} from './api'
import {mockAgencyApplicationOptions,mockSubmitAgency} from './mock/agency-application'
async function scoped(operation){const s=getSession();if(!s?.user?.id)throw new Error('请先登录');const result=await operation({...s.user});if(getSession()?.token!==s.token||getSession()?.user?.id!==s.user.id)throw new Error('登录状态已变化');return result}
export function getAgencyApplicationOptions(type,promotionId){return scoped(async()=>{
  if(config.useMock)return mockAgencyApplicationOptions(type,promotionId)
  const invitation=await request(`/promotion/invitations/${encodeURIComponent(promotionId)}`)
  const agencyType=String(invitation.agencyType||type).toLowerCase()
  const options=await request('/agency/application-options',{data:{agencyType,promotionCode:invitation.promotionCode||promotionId}})
  const total=options.feeBreakdown?.total
  if(!Number.isFinite(total)||total<0)throw new Error('代理费用数据异常')
  return {...options,agencyType:agencyType.toUpperCase(),promotionId,payableAmount:Math.round(total*100),label:options.agencyTypeLabel,feeNote:options.feeBreakdown?.note}
})}
export function submitAgencyApplication(options,draft,key){return scoped(async user=>{
  if(!key)throw new Error('缺少申请编号')
  if(!draft.agreementAccepted)throw new Error('请先阅读并同意代理协议')
  if(config.useMock)return mockSubmitAgency(user,options,draft,key)
  if(!draft.storefrontAssetId)throw new Error('请上传门头照')
  if(!draft.regionCodes?.length)throw new Error('请选择门店地区')
  const payload={agencyType:options.agencyType.toLowerCase(),tierIndex:options.tierIndex||0,regionCode:draft.regionCodes.at(-1),promotionCode:options.promotionCode||options.promotionId}
  const quote=await request('/agency/application-quotes',{method:'POST',data:payload})
  if(!quote?.id)throw new Error('申请报价异常，请重试')
  return request('/agency/applications',{method:'POST',data:{...payload,name:draft.name,phone:draft.phone,address:draft.address,quoteId:quote.id,idempotencyKey:key,agreements:[{key:'agencyAgreement',accepted:true}],uploads:[{key:'storefrontPhoto',fileId:draft.storefrontAssetId}]}})
})}
