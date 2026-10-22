import {config} from '../config'
import {request,getSession} from './api'
import {mockAgencyApplicationOptions,mockSubmitAgency} from './mock/agency-application'
async function scoped(operation){const s=getSession();if(!s?.user?.id)throw new Error('请先登录');const result=await operation({...s.user});if(getSession()?.token!==s.token||getSession()?.user?.id!==s.user.id)throw new Error('登录状态已变化');return result}
export function getAgencyApplicationOptions(type,promotionId){return scoped(async()=>{const result=config.useMock?mockAgencyApplicationOptions(type,promotionId):await request(`/promotion/invitations/${encodeURIComponent(promotionId)}`);if(!result?.promotionId||!['STORE','COUNTY','CITY','PROVINCE'].includes(result.agencyType)||!Number.isSafeInteger(result.payableAmount))throw new Error('代理邀请信息异常');return result})}
export function submitAgencyApplication(options,draft,key){return scoped(async user=>{if(!key)throw new Error('缺少申请编号');return config.useMock?mockSubmitAgency(user,options,draft,key):request('/agency/applications',{method:'POST',data:{...draft,promotionId:options.promotionId,idempotencyKey:key}})})}
