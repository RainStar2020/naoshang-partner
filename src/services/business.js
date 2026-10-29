import { config } from '../config'
import { getSession,request } from './api'
import { businessModules,findBusinessTool,businessPreview,visibleBusinessTools } from '../features/business/catalog'
import { normalizeContent,isMediaUrl } from '../features/content/rich-content'
import { mockBusinessContexts,mockBusinessOverview,mockBusinessReport,mockBusinessState,mockAgencyTree,mockClone,saveMockBusinessState } from './mock/business'
import { incomePresentation } from './mock/income-detail'
const selectionKey=id=>`naoshang-business-context:${id}`
const promotionCache=new Map()
function yuanToCents(value){if(typeof value!=='number'||!Number.isFinite(value))return NaN;return Math.round(value*100)}
function parseBizTime(value){if(typeof value==='number'&&Number.isFinite(value))return value;if(typeof value==='string'&&value.trim()){const parsed=Date.parse(value);return Number.isFinite(parsed)?parsed:NaN}return NaN}
function withYuanMoney(payload,keys){if(!payload||typeof payload!=='object')return payload;const next={...payload};for(const key of keys){if(next[key]==null)continue;const cents=yuanToCents(next[key]);if(!Number.isSafeInteger(cents)||cents<0)throw new Error('金额数据异常');next[key]=cents}return next}
export function clearPartnerPromotionCache(contextId){if(contextId)promotionCache.delete(contextId);else promotionCache.clear()}
function normalizePromotionReport(result){
  const normalized=normalizeList(result)
  let promotion=normalized.promotion?{...normalized.promotion}:null
  const task=normalized.task&&typeof normalized.task==='object'?{...normalized.task}:null
  if(promotion&&!config.useMock)promotion=withYuanMoney(promotion,['paidAmount','standardAmount','differenceAmount'])
  if(promotion){
    // Claim threshold is always 3 same-rank referrals; VIP equivalent is display copy only.
    const vipEquivalent=({'VIP合伙人':3,'天使合伙人':9,'私董合伙人':18})[promotion.beforeName] ?? promotion.vipEquivalent
    const target=3
    const until=parseBizTime(promotion.validUntil ?? task?.validUntil)
    const expired=Number.isFinite(until)&&until<Date.now()
    const derivedClaim=task?task.achieved===true||task.status==='ACHIEVED':Number(promotion.progress)>=target
    const canClaim=!expired&&task?.status!=='CLAIMED'&&(typeof promotion.canClaim==='boolean'?promotion.canClaim:derivedClaim)
    promotion={...promotion,id:promotion.id||task?.taskId||'',version:promotion.version ?? 1,target,vipEquivalent:vipEquivalent ?? target,canClaim,statusLabel:expired?'已过期':(task?.statusLabel||promotion.statusLabel||'进行中'),daysLeft:promotion.daysLeft ?? task?.daysLeft,taskDescription:promotion.taskDescription||task?.text||''}
    if(Number.isFinite(until))promotion.validUntil=until
  }
  return {...normalized,task,promotion,qrUrl:result.promotionId&&isMediaUrl(result.qrUrl)?result.qrUrl:'',posterUrl:result.promotionId&&isMediaUrl(result.posterUrl)?result.posterUrl:'',shareUrl:result.promotionId&&isMediaUrl(result.shareUrl)?result.shareUrl:''}
}
async function fetchPartnerPromotionTasks(account,context){
  const resource=findBusinessTool('wholesale','promotion')
  const result=config.useMock?mockBusinessReport(account,context,resource,{}):await request('/partner/promotion-tasks',{data:{contextId:context.id,pageSize:20}})
  checkBusinessAccount(account)
  const report=normalizePromotionReport(result)
  promotionCache.set(context.id,report)
  return report
}
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
  if(module==='wholesale'){
    clearPartnerPromotionCache(context.id)
    try{await fetchPartnerPromotionTasks(account,context)}catch{/* overlay can retry if prefetch fails */}
  }else clearPartnerPromotionCache()
  return {...result,annualValidUntil:result.annualValidUntil ?? result.entitlement?.expiresAt ?? null,context,tools:visibleBusinessTools(context,config),benefits:result.benefits.map(item=>({...item,content:normalizeContent(item.content)}))}
}
function normalizeList(result){
  if(result==null)return {items:[],hasMore:false,nextCursor:null}
  if(!Array.isArray(result.items)){
    if(result.items==null)return {...result,items:[],hasMore:false,nextCursor:null}
    throw new Error('经营列表格式异常')
  }
  if(result.hasMore==null)return {...result,hasMore:false,nextCursor:null}
  if(typeof result.hasMore!=='boolean'||(result.hasMore&&(typeof result.nextCursor!=='string'||!result.nextCursor)))throw new Error('经营列表格式异常')
  return result
}
export function getBusinessReport(module,id,contextId,params={}){
  const resource=findBusinessTool(module,id);if(!resource)throw new Error('未知经营功能')
  if(params.month&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(params.month))throw new Error('月份无效')
  return withBusinessContext(contextId,resource.capability,async(account,context)=>{
    if(context.module!==module)throw new Error('经营模块与身份不匹配')
    if(resource.id==='promotion'){
      if(promotionCache.has(context.id))return promotionCache.get(context.id)
      return fetchPartnerPromotionTasks(account,context)
    }
    const result=config.useMock?mockBusinessReport(account,context,resource,params):await request(resource.endpoint,{data:{...params,contextId:context.id,contractId:context.contractId,assignmentId:context.assignmentId,pageSize:20}})
    const normalized=normalizeList(result)
    if(resource.type==='share'&&!config.useMock&&(result.accountId!==account.id||result.contextId!==context.id))throw new Error('分享码身份不匹配')
    return {...normalized,qrUrl:result.promotionId&&isMediaUrl(result.qrUrl)?result.qrUrl:'',posterUrl:result.promotionId&&isMediaUrl(result.posterUrl)?result.posterUrl:'',shareUrl:result.promotionId&&isMediaUrl(result.shareUrl)?result.shareUrl:''}
  })
}
export function getBusinessIncomeDetail(contextId,id){
  return withBusinessContext(contextId,context=>`${context.module}:income`,async(account,context)=>{
    const result=config.useMock?mockClone(mockBusinessState(account,context).entries.find(item=>item.id===id)):await request(`/income/entries/${encodeURIComponent(id)}`,{data:{contextId:context.id}})
    if(!result?.id)throw new Error('收益记录不存在或无权访问')
    if(config.useMock)result.presentation=incomePresentation(result,context)
    return result
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
export async function bindBusinessSuperior(contextId,inviteCode){return withBusinessContext(contextId,'wholesale:superior',async(account,context)=>{
  const code=String(inviteCode||'').trim()
  if(!/^[a-zA-Z0-9_-]{1,64}$/.test(code))throw new Error('请输入正确的上级邀请码')
  if(context.module!=='wholesale')throw new Error('当前身份不能绑定上级')
  if(code===(account.inviteCode||''))throw new Error('不能绑定自己为上级')
  if(config.useMock){const state=mockBusinessState(account,context);if(state.superior)throw new Error('已绑定上级');state.superior={name:code,phone:'',levelLabel:'上级',inviteCode:code};state.version++;saveMockBusinessState(account,context);return {superior:mockClone(state.superior)}}
  return request('/partner/superior-bindings',{method:'POST',data:{contextId:context.id,inviteCode:code}})
})}
// Proposed API: eligibility, VIP-equivalent progress and the resulting rank are server decisions.
export function claimBusinessPromotion(contextId,task,idempotencyKey){return withBusinessContext(contextId,'wholesale:promotion',async(account,context)=>{
  if(context.module!=='wholesale'||!task?.id||!idempotencyKey)throw new Error('晋升任务信息不完整，请刷新')
  if(config.useMock)throw new Error('演示模式不计算晋升资格，请接入晋升API')
  const result=await request('/partner/promotion-claims',{method:'POST',data:{contextId,taskId:task.id,version:task.version,idempotencyKey}})
  clearPartnerPromotionCache(context.id)
  return result
})}
