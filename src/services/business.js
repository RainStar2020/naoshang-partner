import { config } from '../config'
import { getSession,request } from './api'
import { businessModules,findBusinessTool,businessPreview,visibleBusinessTools } from '../features/business/catalog'
import { normalizeContent,isMediaUrl } from '../features/content/rich-content'
import { mockBusinessContexts,mockBusinessOverview,mockBusinessReport,mockBusinessState,mockAgencyTree,mockClone } from './mock/business'
const selectionKey=id=>`naoshang-business-context:${id}`
export function businessAccount(){const session=getSession();if(!session?.user?.id)throw new Error('请先登录');return {...session.user,sessionToken:session.token}}
export function checkBusinessAccount(account){const session=getSession();if(session?.user?.id!==account.id||session.token!==account.sessionToken)throw new Error('登录账号已变化，请重新加载')}
export async function getBusinessContexts(){
  const account=businessAccount(),result=config.useMock?{businessContexts:mockBusinessContexts(account)}:await request('/me/bootstrap')
  checkBusinessAccount(account)
  if(!Array.isArray(result?.businessContexts))throw new Error('经营身份数据格式异常')
  const rows=result.businessContexts.filter(item=>item.accountId===account.id&&businessModules.some(module=>module.id===item.module)&&(!item.validUntil||Date.parse(item.validUntil)>Date.now()))
  if(rows.some(item=>!item.id||!Array.isArray(item.capabilities)||(item.module==='costore'&&(!item.storeId||!item.contractId))||(item.module==='agency'&&(!item.assignmentId||!['STORE','COUNTY','CITY','PROVINCE'].includes(item.agencyType))))||new Set(rows.map(item=>item.id)).size!==rows.length)throw new Error('经营身份配置异常')
  return rows
}
export async function getBusinessContext(module,id){
  const account=businessAccount(),contexts=await getBusinessContexts();checkBusinessAccount(account)
  const stored=uni.getStorageSync(selectionKey(account.id)),current=contexts.find(item=>id?item.id===id&&(!module||item.module===module):item.id===stored?.contextId&&(!module||item.module===module))||(!id?contexts.find(item=>!module||item.module===module):null)
  if(!current){const error=new Error('当前经营身份不存在、已到期或无权访问');error.code='FORBIDDEN';throw error}
  return current
}
export async function selectBusinessContext(id){const context=await getBusinessContext(null,id);uni.setStorageSync(selectionKey(businessAccount().id),{contextId:context.id,module:context.module});return context}
export async function withBusinessContext(contextId,capability,operation){
  if(typeof contextId!=='string'||!contextId)throw new Error('缺少经营身份编号，请从工作台重新进入')
  const account=businessAccount(),context=await getBusinessContext(null,contextId);checkBusinessAccount(account)
  const required=typeof capability==='function'?capability(context):capability
  if(!businessPreview(config)&&!context.capabilities.includes(required)){const error=new Error('当前身份没有此功能权限');error.code='FORBIDDEN';throw error}
  const result=await operation(account,context);checkBusinessAccount(account);return result
}
export async function getBusinessOverview(module,id){
  const account=businessAccount(),context=await getBusinessContext(module,id);checkBusinessAccount(account)
  const result=config.useMock?mockBusinessOverview(account,context):await request(module==='wholesale'?'/partner/overview':module==='agency'?'/agency/overview':'/costore/overview',{data:{contextId:context.id,assignmentId:context.assignmentId,contractId:context.contractId}})
  checkBusinessAccount(account)
  if(result?.accountId!==account.id||result.contextId!==context.id||!Array.isArray(result.benefits))throw new Error('工作台身份或数据格式异常')
  return {...result,context,tools:visibleBusinessTools(context,config),benefits:result.benefits.map(item=>({...item,content:normalizeContent(item.content)}))}
}
function normalizeList(result){if(!Array.isArray(result?.items)||typeof result.hasMore!=='boolean'||(result.hasMore&&(typeof result.nextCursor!=='string'||!result.nextCursor)))throw new Error('经营列表格式异常');return result}
export function getBusinessReport(module,id,contextId,params={}){
  const resource=findBusinessTool(module,id);if(!resource)throw new Error('未知经营功能')
  if(params.month&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(params.month))throw new Error('月份无效')
  return withBusinessContext(contextId,resource.capability,async(account,context)=>{
    if(context.module!==module)throw new Error('经营模块与身份不匹配')
    const result=config.useMock?mockBusinessReport(account,context,resource,params):await request(resource.endpoint,{data:{...params,contextId:context.id,contractId:context.contractId,assignmentId:context.assignmentId,pageSize:20}})
    const normalized=normalizeList(result)
    if(resource.type==='share'&&!config.useMock&&(result.accountId!==account.id||result.contextId!==context.id))throw new Error('分享码身份不匹配')
    return {...normalized,qrUrl:result.promotionId&&isMediaUrl(result.qrUrl)?result.qrUrl:'',posterUrl:result.promotionId&&isMediaUrl(result.posterUrl)?result.posterUrl:'',shareUrl:result.promotionId&&isMediaUrl(result.shareUrl)?result.shareUrl:''}
  })
}
export function getBusinessIncomeDetail(contextId,id){
  return withBusinessContext(contextId,context=>`${context.module}:income`,async(account,context)=>{
    const result=config.useMock?mockClone(mockBusinessState(account,context).entries.find(item=>item.id===id)):await request(`/income/entries/${encodeURIComponent(id)}`,{data:{contextId:context.id}})
    if(!result?.id)throw new Error('收益记录不存在或无权访问');return result
  })
}
export function getBusinessTeamNode(contextId,id){
  return withBusinessContext(contextId,'agency:team',async(account,context)=>{
    if(context.module!=='agency')throw new Error('仅区域代理身份可查看此团队')
    const result=config.useMock?mockClone(mockAgencyTree(context).find(item=>item.id===id)):await request(`/agency/team/${encodeURIComponent(id)}`,{data:{assignmentId:context.assignmentId,contextId:context.id}})
    if(!result?.id)throw new Error('团队节点不存在或无权访问');return result
  })
}
export function getBusinessWithdrawals(contextId,cursor=null){
  return withBusinessContext(contextId,'wallet:read',async(account,context)=>normalizeList(config.useMock?{items:mockClone(mockBusinessState(account,context).withdrawals),hasMore:false,nextCursor:null}:await request('/wallet/withdrawals',{data:{contextId:context.id,cursor,pageSize:20}})))
}
export { normalizeList }
export function bindBusinessSuperior(contextId,phone){return withBusinessContext(contextId,'wholesale:superior',async(account,context)=>{if(context.module!=='wholesale'||!/^1\d{10}$/.test(String(phone)))throw new Error('请输入正确的上级手机号');if(!config.useMock)return request('/partner/superior',{method:'POST',data:{contextId,phone}});const state=mockBusinessState(account,context);if(state.superior)throw new Error('已绑定上级，请联系门店调整');state.superior={name:'合伙团队负责人',phone,scopeLabel:'合伙团队'};return {superior:state.superior}})}
