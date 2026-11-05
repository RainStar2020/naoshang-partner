import { config } from '../config'
import { getSession,request,getCachedMyInviteCode } from './api'
import { businessModules,findBusinessTool,businessPreview,visibleBusinessTools } from '../features/business/catalog'
import { wholesaleLevelDisplay } from '../features/business/account-rank'
import { normalizeContent,isMediaUrl } from '../features/content/rich-content'
import { mockMeBootstrap,mockBusinessOverview,mockBusinessReport,mockBusinessState,mockAgencyTree,mockClone } from './mock/business'
import { incomePresentation } from './mock/income-detail'
import { buildRegisterInviteUrl } from './agency-promotion-link'
import { normalizeAgencyTeamItem, normalizeAgencyStore, fillAgencyTeamMetrics } from '../features/agency/team-display'
const selectionKey=id=>`naoshang-business-context:${id}`
const promotionCache=new Map()
const globalAwardsCache=new Map()
const agencyIncomeCache=new Map()
const awardCopy={平级奖:'孵化补贴',复购奖:'运维补贴',全球奖:'总批补贴',创始奖:'总裁补贴'}
function awardDisplay(value){return typeof value==='string'?Object.entries(awardCopy).reduce((text,[source,target])=>text.replaceAll(source,target),value):value}
function incomeDisplay(value){return typeof value==='string'?awardDisplay(value).replaceAll('收益','积分').replaceAll('提点','').replace(/订单金额|开通金额|计件金额|待分配金额|实付金额|计价金额/g,'有效值'):value}
function currentAwardMonth(){return new Date().toISOString().slice(0,7)}
function parseGlobalAwardEligibility(report){
  if(!report||typeof report!=='object')return {eligible:false,reason:''}
  const label=String(report.eligibilityLabel||report.reason||'').trim()
  if(typeof report.eligible==='boolean')return {eligible:report.eligible,reason:label}
  // Current + future denial payloads: "非联创无资格" or eligibility-only bodies.
  if(/无资格|无权限|不合格|非联创/.test(label))return {eligible:false,reason:label}
  const meaningfulKeys=Object.keys(report).filter(key=>{
    if(['eligibilityLabel','reason','eligible','hasMore','nextCursor','mockOnly'].includes(key))return false
    const value=report[key]
    if(value==null)return false
    if(Array.isArray(value))return value.length>0
    if(typeof value==='object')return Object.keys(value).length>0
    return String(value).trim()!==''
  })
  if(!meaningfulKeys.length&&label)return {eligible:false,reason:label}
  return {eligible:true,reason:label}
}
function parseBizTime(value){
  if(typeof value==='number'&&Number.isFinite(value))return value
  if(typeof value==='string'&&value.trim()){
    if(/^\d+$/.test(value.trim())){const n=Number(value);return Number.isFinite(n)?n:NaN}
    const parsed=Date.parse(value);return Number.isFinite(parsed)?parsed:NaN
  }
  return NaN
}
function normalizeAnnualUntil(value){
  const time=parseBizTime(value)
  return Number.isFinite(time)?time:value??null
}
function withYuanMoney(payload,keys){if(!payload||typeof payload!=='object')return payload;const next={...payload};for(const key of keys){if(next[key]==null)continue;const amount=Number(next[key]);if(!Number.isFinite(amount)||amount<0)throw new Error('金额数据异常');next[key]=amount}return next}
export function clearPartnerPromotionCache(contextId){
  if(contextId){promotionCache.delete(contextId);globalAwardsCache.delete(contextId)}
  else{promotionCache.clear();globalAwardsCache.clear()}
}
export function clearAgencyIncomeCache(contextId){if(contextId)agencyIncomeCache.delete(contextId);else agencyIncomeCache.clear()}
function cacheGlobalAwards(contextId,month,report){
  const eligibility=parseGlobalAwardEligibility(report)
  globalAwardsCache.set(contextId,{month,report,eligibility})
  return eligibility
}
async function fetchPartnerGlobalAwards(account,context,params={}){
  const month=params.month||currentAwardMonth()
  const cached=globalAwardsCache.get(context.id)
  if(cached&&cached.month===month&&!params.force)return cached
  const resource=findBusinessTool('wholesale','global-awards')
  const result=config.useMock
    ?mockBusinessReport(account,context,resource,{month,filter:params.filter||'promotion',keyword:params.keyword||''})
    :await request('/partner/global-awards',{data:{month,filter:params.filter||'promotion',keyword:params.keyword||'',contextId:context.id,contractId:context.contractId||'',assignmentId:context.assignmentId||'',pageSize:20}})
  checkBusinessAccount(account)
  const normalized=presentAwardCopy(normalizeList(result))
  const eligibility=cacheGlobalAwards(context.id,month,normalized)
  return {month,report:normalized,eligibility}
}
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
function normalizeBootstrapPartner(person){
  if(!person||typeof person!=='object')return null
  // Prefer cleartext phone; do not fall back to masked display values.
  const levelLabel=person.levelLabel||person.tierLabel||''
  const partnerLevelLabel=wholesaleLevelDisplay(levelLabel)
  const storeName=person.storeName||person.store?.name||''
  return {...person,phone:person.phone||'',levelLabel,tagLabel:person.tagLabel||person.tierLabel||partnerLevelLabel,storeName}
}
function filterBootstrapMembers(members,keyword){
  const rows=(Array.isArray(members)?members:[]).map(normalizeBootstrapPartner).filter(Boolean)
  const q=String(keyword||'').trim()
  if(!q)return rows
  return rows.filter(item=>`${item.name||''} ${item.displayId||''} ${item.phone||''}`.includes(q))
}
function pickCount(...values){
  for(const value of values){
    if(value==null||value==='')continue
    const n=typeof value==='number'?value:Number(value)
    if(Number.isFinite(n))return n
  }
  return undefined
}
function wholesaleBootstrapExtras(bootstrap){
  if(!bootstrap||typeof bootstrap!=='object')return {}
  const team=bootstrap.team&&typeof bootstrap.team==='object'?{summary:bootstrap.team.summary||null,members:filterBootstrapMembers(bootstrap.team.members)}:null
  const vipDetails=bootstrap.vipDetails&&typeof bootstrap.vipDetails==='object'?{...bootstrap.vipDetails,teamVipMembers:filterBootstrapMembers(bootstrap.vipDetails.teamVipMembers)}:null
  const memberCount=team?.summary?.memberCount
  const remaining=pickCount(vipDetails?.remainingCount,vipDetails?.standardRemaining)
  const transferred=pickCount(vipDetails?.transferredCount,vipDetails?.transferred,vipDetails?.transferredVip,vipDetails?.quotaTransferred)
  return {
    displayId:bootstrap.displayId||undefined,
    entitlement:bootstrap.entitlement||undefined,
    storeBinding:bootstrap.storeBinding||undefined,
    storeBound:bootstrap.storeBound,
    storeBindingRequired:bootstrap.storeBindingRequired,
    frozen:bootstrap.entitlement?.frozen,
    globalAwardEligibility:bootstrap.globalAwardEligibility??null,
    superior:normalizeBootstrapPartner(bootstrap.superior),
    team,
    vipDetails,
    // Fill overview counters from bootstrap; leave showcase* to /partner/overview fixtures when present.
    teamCount:memberCount!==undefined?memberCount:undefined,
    quota:remaining,
    transferred,
  }
}
function applyWholesaleBootstrap(result,bootstrap){
  const extras=wholesaleBootstrapExtras(bootstrap)
  const entitlement=extras.entitlement||result.entitlement
  const transferred=pickCount(
    result.transferred,
    result.transferredCount,
    result.transferredVip,
    result.quotaTransferred,
    extras.transferred,
    bootstrap?.vipDetails?.transferredCount,
    bootstrap?.vipDetails?.transferred,
  )
  return {
    ...result,
    ...Object.fromEntries(Object.entries(extras).filter(([,value])=>value!==undefined)),
    entitlement,
    annualValidUntil:normalizeAnnualUntil(result.annualValidUntil ?? entitlement?.expiresAt ?? null),
    // Transferred VIP count: keep API zero, and default missing to 0 (not em dash).
    transferred:transferred??0,
  }
}
function canWholesaleTool(context,toolId){
  const resource=findBusinessTool('wholesale',toolId)
  return !!(resource&&(businessPreview(config)||context.capabilities?.includes(resource.capability)))
}
async function loadWholesaleToolPayload(account,context,toolId,params={}){
  const resource=findBusinessTool('wholesale',toolId)
  if(!resource||!canWholesaleTool(context,toolId))return null
  try{
    const result=config.useMock
      ?mockBusinessReport(account,context,resource,params)
      :await request(resource.endpoint,{data:{...params,contextId:context.id,pageSize:20}})
    checkBusinessAccount(account)
    return result&&typeof result==='object'?result:null
  }catch{
    return null
  }
}
/** Prefer transfer-ledger summary fields used by 划转明细 (totalSold / inCirculation). */
function transferredFromTransfersReport(transfers){
  if(!transfers||typeof transfers!=='object')return undefined
  const fromSummary=pickCount(
    transfers.summary?.inCirculation,
    transfers.summary?.totalSold,
    transfers.summary?.transferredCount,
    transfers.summary?.transferred,
    transfers.inCirculation,
    transfers.totalSold,
    transfers.transferredCount,
    transfers.transferred,
  )
  if(fromSummary!=null)return fromSummary
  if(!Array.isArray(transfers.items)||!transfers.items.length)return undefined
  const sum=transfers.items.reduce((total,item)=>{
    if(!item||typeof item!=='object')return total
    const direction=String(item.direction||'').toLowerCase()
    const category=String(item.category||item.kind||'').toLowerCase()
    const qty=Number(item.qty??item.quantity??item.amount)
    if(!Number.isFinite(qty)||qty===0)return total
    // Count outbound transfers; ignore inbound receipts and non-transfer rows when marked.
    if(direction==='in'||direction==='inbound'||direction==='receive')return total
    if(category&&category!=='transfer'&&!direction)return total
    return total+Math.abs(qty)
  },0)
  return sum
}
// Dashboard counters: always hit team + quota ledger APIs on wholesale enter (not bootstrap-only).
async function fetchWholesaleDashboardStats(account,context){
  const [team,ledger,transfers]=await Promise.all([
    loadWholesaleToolPayload(account,context,'team'),
    loadWholesaleToolPayload(account,context,'quota-ledger'),
    // Match 划转明细 payload (summary.totalSold / inCirculation); do not require direction=out.
    loadWholesaleToolPayload(account,context,'quota-transfers'),
  ])
  const teamCount=pickCount(
    team?.summary?.memberCount,
    team?.memberCount,
    team?.summary?.total,
    // Live list length is a last-resort fallback when summary is absent.
    !config.useMock&&Array.isArray(team?.items)?team.items.length:undefined,
  )
  const remaining=pickCount(ledger?.standardRemaining,ledger?.remainingCount,ledger?.quota)
  const activityRemaining=pickCount(ledger?.activityRemaining)
  const transferred=pickCount(
    transferredFromTransfersReport(transfers),
    ledger?.transferredCount,
    ledger?.transferred,
    ledger?.transferredVip,
    ledger?.quotaTransferred,
  )
  const vipDetails={
    ...(remaining!=null?{remainingCount:remaining,standardRemaining:remaining}:{}),
    ...(activityRemaining!=null?{activityRemaining}:{}),
    ...(transferred!=null?{transferredCount:transferred,transferred}:{}),
  }
  const stats={
    ...(teamCount!=null?{teamCount}:{}),
    ...(remaining!=null?{quota:remaining}:{}),
    ...(transferred!=null?{transferred}:{}),
    ...(Object.keys(vipDetails).length?{vipDetails}:{}),
  }
  if(team?.summary||teamCount!=null){
    stats.team={
      summary:{...(team?.summary||{}),...(teamCount!=null?{memberCount:teamCount}:{})},
      members:Array.isArray(team?.items)?team.items:undefined,
    }
  }
  return stats
}
function mergeWholesaleDashboardStats(overview,stats){
  if(!stats||!Object.keys(stats).length)return overview
  // Prefer live transfer-ledger totals over a stale overview/bootstrap zero.
  const transferred=stats.transferred!=null?stats.transferred:(overview.transferred??0)
  return {
    ...overview,
    ...Object.fromEntries(Object.entries(stats).filter(([key,value])=>key!=='vipDetails'&&key!=='team'&&key!=='transferred'&&value!==undefined)),
    team:stats.team?{...(overview.team||{}),...stats.team,summary:{...(overview.team?.summary||{}),...(stats.team.summary||{})}}:overview.team,
    vipDetails:stats.vipDetails?{...(overview.vipDetails||{}),...stats.vipDetails,transferredCount:stats.vipDetails.transferredCount??transferred,transferred:stats.vipDetails.transferred??transferred}:overview.vipDetails,
    transferred,
    transferredCount:transferred,
  }
}
function normalizeAgencyRelation(person){
  if(!person||typeof person!=='object')return null
  const agencyLabel=String(person.agencyLabel||person.levelLabel||person.rankLabel||person.scopeLabel||'').trim()
  const partnerLabel=String(person.partnerLabel||'').trim()
  const regionLabel=String(person.regionLabel||person.scopeLabel||person.areaLabel||'').trim()
  return {
    ...person,
    name:String(person.name||'').trim(),
    avatarUrl:person.avatarUrl||'',
    agencyLabel,
    partnerLabel,
    regionLabel,
    scopeLabel:String(person.scopeLabel||regionLabel).trim(),
  }
}
function applyAgencyOverview(result){
  const superior=normalizeAgencyRelation(result.superior??result.relations?.superior)
  const referrer=normalizeAgencyRelation(result.referrer??result.relations?.referrer)
  const teamCount=pickCount(result.teamCount,result.team?.summary?.memberCount,result.summary?.memberCount,result.memberCount)
  const agencyIncome=pickCount(result.agencyIncome,result.available,result.incomeAvailable,result.pointsBalance,result.pointBalance,result.points)
  return {
    ...result,
    superior,
    referrer,
    ...(teamCount!=null?{teamCount}:{}),
    ...(agencyIncome!=null?{agencyIncome,available:result.available??agencyIncome}:{}),
  }
}
function canAgencyTool(context,toolId){
  const resource=findBusinessTool('agency',toolId)
  return !!(resource&&(businessPreview(config)||context.capabilities?.includes(resource.capability)))
}
async function loadAgencyToolPayload(account,context,toolId,params={}){
  const resource=findBusinessTool('agency',toolId)
  if(!resource||!canAgencyTool(context,toolId))return null
  try{
    const result=config.useMock
      ?mockBusinessReport(account,context,resource,params)
      :await request(resource.endpoint,{data:{...params,contextId:context.id,assignmentId:context.assignmentId,pageSize:20}})
    checkBusinessAccount(account)
    return result&&typeof result==='object'?result:null
  }catch{
    return null
  }
}
function metricAmount(income,...labels){
  const rows=Array.isArray(income?.metrics)?income.metrics:[]
  for(const label of labels){
    const row=rows.find(item=>item?.label===label)
    const amount=pickCount(row?.value)
    if(amount!=null)return amount
  }
  return undefined
}
function pickAgencyIncomeAmount(income){
  if(!income||typeof income!=='object')return undefined
  return pickCount(
    income.available,
    income.agencyIncome,
    income.summary?.available,
    metricAmount(income,'收益合计','积分合计','可提现金额'),
    income.pointsBalance,
    income.pointBalance,
    income.points,
  )
}
// Prefetch /income/entries on agency home; reuse for the income page.
async function fetchAgencyIncomeReport(account,context,{force=false}={}){
  if(!force&&agencyIncomeCache.has(context.id))return agencyIncomeCache.get(context.id)
  const resource=findBusinessTool('agency','income')
  if(!resource)return null
  try{
    const raw=config.useMock
      ?mockBusinessReport(account,context,resource,{filter:'',keyword:''})
      :await request('/income/entries',{data:{filter:'',keyword:'',contextId:context.id,contractId:context.contractId||'',assignmentId:context.assignmentId,pageSize:20}})
    checkBusinessAccount(account)
    if(!raw||typeof raw!=='object')return null
    const report=presentAwardCopy(normalizeList(raw))
    agencyIncomeCache.set(context.id,report)
    return report
  }catch{
    return null
  }
}
// Non-store agency home: team count + cached points income.
async function fetchAgencyDashboardStats(account,context){
  const incomePromise=fetchAgencyIncomeReport(account,context)
  if(context.agencyType==='STORE'){
    const income=await incomePromise
    const agencyIncome=pickAgencyIncomeAmount(income)
    return agencyIncome!=null?{agencyIncome}:{}
  }
  const [team,income]=await Promise.all([
    loadAgencyToolPayload(account,context,'team'),
    incomePromise,
  ])
  const teamCount=pickCount(
    team?.summary?.memberCount,
    team?.memberCount,
    team?.summary?.total,
    team?.totalCount,
    !config.useMock&&Array.isArray(team?.items)?team.items.length:undefined,
  )
  const agencyIncome=pickAgencyIncomeAmount(income)
  return {
    ...(teamCount!=null?{teamCount}:{}),
    ...(agencyIncome!=null?{agencyIncome}:{}),
  }
}
function validateBusinessContexts(account,result){
  if(!Array.isArray(result?.businessContexts))throw new Error('经营身份数据格式异常')
  const rows=result.businessContexts.filter(item=>item.accountId===account.id&&businessModules.some(module=>module.id===item.module)&&(!item.validUntil||Date.parse(item.validUntil)>Date.now()))
  if(rows.some(item=>!item.id||!Array.isArray(item.capabilities)||(item.module==='costore'&&(!item.storeId||!item.contractId))||(item.module==='agency'&&(!item.assignmentId||!['STORE','COUNTY','CITY','PROVINCE'].includes(item.agencyType))))||new Set(rows.map(item=>item.id)).size!==rows.length)throw new Error('经营身份配置异常')
  return rows
}
export function businessAccount(){const session=getSession();if(!session?.user?.id)throw new Error('请先登录');return {...session.user,sessionToken:session.token}}
export function checkBusinessAccount(account){const session=getSession();if(session?.user?.id!==account.id||session.token!==account.sessionToken)throw new Error('登录账号已变化，请重新加载')}
export async function getMeBootstrapData(){
  const account=businessAccount()
  const result=config.useMock?mockMeBootstrap(account):await request('/me/bootstrap')
  checkBusinessAccount(account)
  validateBusinessContexts(account,result)
  return result
}
export async function getBusinessContexts(){
  const account=businessAccount(),result=await getMeBootstrapData();checkBusinessAccount(account)
  return validateBusinessContexts(account,result)
}
export async function getBusinessContext(module,id){
  const account=businessAccount(),contexts=await getBusinessContexts();checkBusinessAccount(account)
  const stored=uni.getStorageSync(selectionKey(account.id))
  const byId=id?contexts.find(item=>item.id===id&&(!module||item.module===module)):null
  const byStored=!id?contexts.find(item=>item.id===stored?.contextId&&(!module||item.module===module)):null
  // Prefer wholesale as the default landing module when nothing is explicitly selected.
  const byModule=!id
    ?(module
      ?(contexts.find(item=>item.module===module)||(module==='wholesale'?(contexts.find(item=>item.module==='wholesale')||contexts[0]):null))
      :(contexts.find(item=>item.module==='wholesale')||contexts[0]))
    :null
  const current=byId||byStored||byModule||null
  if(!current){const error=new Error('当前经营身份不存在、已到期或无权访问');error.code='FORBIDDEN';throw error}
  return current
}
export async function selectBusinessContext(id){const context=await getBusinessContext(null,id);uni.setStorageSync(selectionKey(businessAccount().id),{contextId:context.id,module:context.module});return context}
export async function withBusinessContext(contextId,capability,operation){
  if(typeof contextId!=='string'||!contextId)throw new Error('缺少经营身份编号，请从工作台重新进入')
  const account=businessAccount(),context=await getBusinessContext(null,contextId);checkBusinessAccount(account)
  const required=typeof capability==='function'?capability(context):capability
  // Null/empty capability means context-scoped only (e.g. points redeem).
  if(required&&!businessPreview(config)&&!context.capabilities.includes(required)){const error=new Error('当前身份没有此功能权限');error.code='FORBIDDEN';throw error}
  const result=await operation(account,context);checkBusinessAccount(account);return result
}
export async function getBusinessOverview(module,id){
  const account=businessAccount()
  const [bootstrap,context]=await Promise.all([getMeBootstrapData(),getBusinessContext(module,id)])
  checkBusinessAccount(account)
  const result=config.useMock?mockBusinessOverview(account,context):await request(module==='wholesale'?'/partner/overview':module==='agency'?'/agency/overview':'/costore/overview',{data:{contextId:context.id,assignmentId:context.assignmentId,contractId:context.contractId}})
  checkBusinessAccount(account)
  if(result?.accountId!==account.id||result.contextId!==context.id||!Array.isArray(result.benefits))throw new Error('工作台身份或数据格式异常')
  if(module==='agency'){
    clearPartnerPromotionCache()
    const base=applyAgencyOverview({...result,annualValidUntil:normalizeAnnualUntil(result.annualValidUntil ?? result.entitlement?.expiresAt ?? null)})
    const stats=await fetchAgencyDashboardStats(account,context)
    const merged={...base,...Object.fromEntries(Object.entries(stats).filter(([,value])=>value!==undefined))}
    return {...merged,context,tools:visibleBusinessTools(context,config),benefits:result.benefits.map(item=>({...item,content:normalizeContent(item.content)}))}
  }
  if(module!=='wholesale'){
    clearPartnerPromotionCache()
    const merged={...result,annualValidUntil:normalizeAnnualUntil(result.annualValidUntil ?? result.entitlement?.expiresAt ?? null)}
    return {...merged,context,tools:visibleBusinessTools(context,config),benefits:result.benefits.map(item=>({...item,content:normalizeContent(item.content)}))}
  }
  clearPartnerPromotionCache(context.id)
  const base=applyWholesaleBootstrap(result,bootstrap)
  const [,stats,globalAwards]=await Promise.all([
    fetchPartnerPromotionTasks(account,context).catch(()=>null),
    fetchWholesaleDashboardStats(account,context),
    // Prefetch 总批补贴 eligibility; hide home entry when not eligible.
    fetchPartnerGlobalAwards(account,context).catch(()=>({eligibility:{eligible:false,reason:''},report:null})),
  ])
  const merged=mergeWholesaleDashboardStats(base,stats)
  const inviteCode=String(merged.inviteCode||account.inviteCode||getCachedMyInviteCode()?.inviteCode||bootstrap?.inviteCode||'').trim()
  const name=String(merged.name||merged.nickname||merged.userName||account.name||account.nickname||'').trim()
  return {
    ...merged,
    ...(name?{name}:{}),
    ...(inviteCode?{inviteCode}:{}),
    globalAwardEligibility:globalAwards?.eligibility||{eligible:false,reason:''},
    rawLevelName:merged.levelName,
    levelName:module==='wholesale'?wholesaleLevelDisplay(merged.levelName):merged.levelName,
    context,
    tools:visibleBusinessTools(context,config),
    benefits:result.benefits.map(item=>({...item,content:normalizeContent(item.content)})),
  }
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
/** Live quota ledger uses qty/at; UI expects quantity/createdAt/title. */
function normalizeQuotaLedgerItem(item,index=0){
  if(!item||typeof item!=='object')return null
  const quantity=Number(item.quantity??item.qty??item.amount??0)
  const createdAt=item.createdAt??item.at??item.occurredAt??item.time??null
  const id=item.id||`${item.type||'quota'}-${createdAt||index}-${quantity}`
  const isActivity=item.type==='activity'||item.category==='activity'
  return {
    ...item,
    id,
    // 收到划转与自行购入均属于购入名额；活动批次单独标记为赠送。
    title:isActivity?'活动获得赠送':'购入名额',
    quantity:Number.isFinite(quantity)?quantity:0,
    createdAt,
  }
}
function normalizeQuotaTransferItem(item,index=0){
  if(!item||typeof item!=='object')return null
  // Ledger / design payload: {title,quantity,createdAt,targetDisplayId,targetLevel}
  if(item.category==null&&(item.quantity!=null||item.qty!=null)&&(item.createdAt!=null||item.at!=null)){
    const raw=Number(item.quantity??item.qty)
    const at=Number(item.at)
    const stamp=Number.isFinite(at)?at:Date.parse(item.createdAt)
    if(!Number.isFinite(raw)||!Number.isFinite(stamp))return null
    const qty=Math.abs(Math.trunc(raw))
    const direction=raw<0||item.direction==='out'?'out':'in'
    const category=/升级/.test(String(item.title||item.actionLabel||''))?'upgrade':'transfer'
    return {
      id:String(item.id||`transfer-${index}-${stamp}`),
      category,
      direction,
      qty,
      at:stamp,
      actionLabel:String(item.title||item.actionLabel||(category==='upgrade'?'消耗名额升级':'划转VIP名额')),
      senderId:String(item.senderId||'—'),
      senderName:String(item.senderName||'—'),
      senderTier:String(item.senderTier||''),
      downlineId:String(item.targetDisplayId||item.downlineId||item.receiverId||'—'),
      downlineName:String(item.targetName||item.downlineName||item.receiverName||'—'),
      downlineTier:String(item.targetLevel||item.downlineTier||item.receiverTier||''),
      senderRemaining:null,
      receiverRemaining:null,
    }
  }
  if(!item.id)return null
  if(!['transfer','upgrade'].includes(item.category)||!['in','out'].includes(item.direction))return null
  const qty=Number(item.qty)
  const at=Number(item.at)
  if(!Number.isInteger(qty)||qty<0||!Number.isFinite(at))return null
  const senderRemaining=Number(item.senderRemaining)
  const receiverRemaining=item.receiverRemaining==null?null:Number(item.receiverRemaining)
  return {
    ...item,
    id:String(item.id),qty,at,
    actionLabel:String(item.actionLabel|| (item.category==='upgrade'?'消耗名额升级':item.direction==='out'?'划转VIP名额':'收到划转名额')),
    senderId:String(item.senderId||'—'),senderName:String(item.senderName||'—'),senderTier:String(item.senderTier||''),
    downlineId:String(item.downlineId||item.receiverId||item.targetDisplayId||'—'),downlineName:String(item.downlineName||item.receiverName||'—'),downlineTier:String(item.downlineTier||item.receiverTier||item.targetLevel||''),
    senderRemaining:Number.isFinite(senderRemaining)?senderRemaining:null,
    receiverRemaining:item.category==='transfer'&&Number.isFinite(receiverRemaining)?receiverRemaining:null,
  }
}
function normalizeQuotaTransferReport(report){
  const summary=report?.summary&&typeof report.summary==='object'?report.summary:{}
  const count=value=>{const n=Number(value);return Number.isFinite(n)&&n>=0?n:0}
  return {...report,items:report.items.map(normalizeQuotaTransferItem).filter(Boolean),summary:{totalSold:count(summary.totalSold),upgradeConsumed:count(summary.upgradeConsumed),inCirculation:count(summary.inCirculation)}}
}
function presentAwardCopy(report){
  return {...report,
    metrics:Array.isArray(report.metrics)?report.metrics.map(metric=>({...metric,label:incomeDisplay(metric.label)})):report.metrics,
    items:Array.isArray(report.items)?report.items.map(item=>({...item,channel:incomeDisplay(item.channel),title:incomeDisplay(item.title),pendingNote:incomeDisplay(item.pendingNote),details:Array.isArray(item.details)?item.details.map(detail=>({...detail,label:incomeDisplay(detail.label),value:incomeDisplay(detail.value)})):item.details})):report.items}
}
function reportFromBootstrap(resource,bootstrap,params){
  if(resource.id==='team'&&Array.isArray(bootstrap?.team?.members)){
    return {items:filterBootstrapMembers(bootstrap.team.members,params.keyword),summary:bootstrap.team.summary||null,hasMore:false,nextCursor:null}
  }
  if(resource.id==='superior'&&bootstrap?.superior){
    return {items:[],superior:normalizeBootstrapPartner(bootstrap.superior),hasMore:false,nextCursor:null}
  }
  // Prefer bootstrap activity batches only when the server already provided rows.
  if(resource.id==='quota-batches'&&Array.isArray(bootstrap?.vipDetails?.activityBatches)&&bootstrap.vipDetails.activityBatches.length){
    return {items:bootstrap.vipDetails.activityBatches,hasMore:false,nextCursor:null}
  }
  return null
}
function mergeVipDetails(report,bootstrap){
  const vip=bootstrap?.vipDetails
  if(!vip||typeof vip!=='object')return report
  return {
    ...report,
    remainingCount:vip.remainingCount ?? report.remainingCount,
    standardRemaining:vip.standardRemaining ?? report.standardRemaining,
    activityRemaining:vip.activityRemaining ?? report.activityRemaining,
    activityBatches:Array.isArray(vip.activityBatches)?vip.activityBatches:report.activityBatches,
  }
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
    if(resource.id==='global-awards'){
      const month=params.month||currentAwardMonth()
      const cached=globalAwardsCache.get(context.id)
      if(cached?.month===month&&cached.report)return cached.report
      const loaded=await fetchPartnerGlobalAwards(account,context,{month,filter:params.filter,keyword:params.keyword,force:true})
      return loaded.report
    }
    const filter=String(params.filter||'')
    const keyword=String(params.keyword||'').trim()
    const defaultIncomePage=module==='agency'&&resource.id==='income'&&!params.cursor&&!filter&&!keyword
    if(defaultIncomePage&&agencyIncomeCache.has(context.id))return agencyIncomeCache.get(context.id)
    const bootstrap=module==='wholesale'?await getMeBootstrapData():null
    // Temporary: wholesale share codes are local register deep links; skip /promotion/share-code.
    if(resource.id==='share'||resource.type==='share'){
      const inviteCode=String(account.inviteCode||getCachedMyInviteCode()?.inviteCode||bootstrap?.inviteCode||'').trim()
      const localPayload=buildRegisterInviteUrl(inviteCode)
      if(!inviteCode||!localPayload)throw new Error('暂无分享码，请重新登录后再试')
      return {
        items:[],
        metrics:[],
        columns:[],
        inviteCode,
        qrUrl:'',
        posterUrl:'',
        shareUrl:localPayload,
        localPayload,
        hasMore:false,
        nextCursor:null,
      }
    }
    if(module==='wholesale'&&!config.useMock){
      const fromBootstrap=reportFromBootstrap(resource,bootstrap,params)
      if(fromBootstrap)return fromBootstrap
    }
    const result=config.useMock?mockBusinessReport(account,context,resource,params):await request(resource.endpoint,{data:{...params,filter,keyword,contextId:context.id,contractId:context.contractId||'',assignmentId:context.assignmentId,pageSize:20}})
    let normalized=normalizeList(result)
    if(module==='agency'&&resource.id==='team'){
      normalized={
        ...normalized,
        items:normalized.items.map(normalizeAgencyTeamItem).filter(Boolean),
      }
    }
    if(module==='wholesale'&&resource.id==='quota-ledger'){
      normalized={
        ...normalized,
        items:normalized.items.map(normalizeQuotaLedgerItem).filter(Boolean),
      }
    }
    if(module==='wholesale'&&resource.id==='quota-transfers')normalized=normalizeQuotaTransferReport(normalized)
    if(module==='wholesale'&&['quota-ledger','quota-batches'].includes(resource.id))normalized=mergeVipDetails(normalized,bootstrap)
    if(module==='wholesale'&&resource.id==='superior'&&!normalized.superior&&bootstrap?.superior)normalized={...normalized,superior:normalizeBootstrapPartner(bootstrap.superior)}
    if(module==='wholesale'&&resource.id==='team'&&!normalized.items.length&&Array.isArray(bootstrap?.team?.members)){
      normalized={...normalized,items:filterBootstrapMembers(bootstrap.team.members,params.keyword),summary:bootstrap.team.summary||null}
    }
    const presented=(resource.type==='income'||resource.id==='global-awards')?presentAwardCopy(normalized):normalized
    const payload={...presented,qrUrl:result.promotionId&&isMediaUrl(result.qrUrl)?result.qrUrl:'',posterUrl:result.promotionId&&isMediaUrl(result.posterUrl)?result.posterUrl:'',shareUrl:result.promotionId&&isMediaUrl(result.shareUrl)?result.shareUrl:''}
    if(defaultIncomePage)agencyIncomeCache.set(context.id,payload)
    return payload
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
/** Live `/agency/team/{id}` returns `{node,members,stores}`; mock keeps a flat node. */
function normalizeAgencyTeamNodeDetail(result){
  if(!result||typeof result!=='object')return null
  const raw=result.node&&typeof result.node==='object'?result.node:result
  if(!raw?.id)return null
  const memberSource=Array.isArray(result.members)?result.members:(Array.isArray(raw.members)?raw.members:null)
  const storeSource=Array.isArray(result.stores)?result.stores:(Array.isArray(raw.stores)?raw.stores:[])
  const stores=storeSource.map(normalizeAgencyStore).filter(Boolean)
  const base=normalizeAgencyTeamItem({...raw,stores,owners:Array.isArray(raw.owners)?raw.owners:[]})
  if(!base)return null
  return {
    ...base,
    performance:fillAgencyTeamMetrics(raw.performance ?? result.performance),
    members:memberSource?memberSource.map(normalizeAgencyTeamItem).filter(Boolean):null,
    childPage:{
      hasMore:result.hasMore===true,
      nextCursor:typeof result.nextCursor==='string'?result.nextCursor:null,
    },
  }
}
export function getBusinessTeamNode(contextId,id){
  return withBusinessContext(contextId,'agency:team',async(account,context)=>{
    if(context.module!=='agency')throw new Error('仅区域代理身份可查看此团队')
    const result=config.useMock?mockClone(mockAgencyTree(context).find(item=>item.id===id)):await request(`/agency/team/${encodeURIComponent(id)}`,{data:{assignmentId:context.assignmentId,contextId:context.id}})
    const node=normalizeAgencyTeamNodeDetail(result)
    if(!node?.id)throw new Error('团队节点不存在或无权访问')
    return node
  })
}
function normalizeWithdrawalItem(item,index=0){
  if(!item||typeof item!=='object')return null
  const applicantRole=['partner','agent','costore'].includes(item.applicantRole)?item.applicantRole:'partner'
  const applicantRoleLabel=item.applicantRoleLabel||({partner:'合伙人',agent:'代理',costore:'合店老板'}[applicantRole])
  const points=Number(item.points??item.amount??0)
  const amountYuan=Number(item.amountYuan??item.amountYuanValue??points)
  const identity=['partner','agent','costore'].includes(item.identity)?item.identity:applicantRole
  const identityLabel=item.identityLabel||({partner:'合伙人',agent:'区域代理',costore:'合店老板'}[identity])
  const redemptionId=String(item.redemptionId||item.id||`withdrawal-${index}`)
  return {...item,id:redemptionId,redemptionId,redemptionNo:String(item.redemptionNo||redemptionId),identity,identityLabel,identityScopeLabel:item.identityScopeLabel||'',applicantRole,applicantRoleLabel,points:Number.isFinite(points)?points:0,amountYuan:Number.isFinite(amountYuan)?amountYuan:0,rejectReason:item.rejectReason??item.rejectionReason??''}
}
export function getBusinessWithdrawals(contextId,cursor=null){
  return withBusinessContext(contextId,null,async(account,context)=>{
    const result=normalizeList(config.useMock?{items:mockClone(mockBusinessState(account,context).withdrawals),hasMore:false,nextCursor:null}:await request('/wallet/withdrawals',{data:{contextId:context.id,cursor,pageSize:20}}))
    return {...result,items:result.items.map(normalizeWithdrawalItem).filter(Boolean)}
  })
}
export { normalizeList }
export async function bindBusinessSuperior(contextId,inviteCode){return withBusinessContext(contextId,'wholesale:superior',async(account,context)=>{
  const code=String(inviteCode||'').trim()
  if(!/^[a-zA-Z0-9_-]{1,64}$/.test(code))throw new Error('请输入正确的运营商邀请码')
  if(context.module!=='wholesale')throw new Error('当前身份不能绑定运营商')
  // Superior binding is headquarters-owned in mock fixtures; live API still accepts the request for HQ-operated accounts.
  if(config.useMock)throw new Error('仅总部可设置运营商关系')
  if(code===(account.inviteCode||''))throw new Error('不能绑定自己为运营商')
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
