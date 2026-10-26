import {mockFamily} from './family'
import {mockWholesaleOverview,mockWholesaleReport,mockWholesaleLevelName} from './wholesale'
// TODO(API): replace these mock-only fixtures when business APIs are connected.
import { emptyContent } from '../../features/content/rich-content'
const states = new Map()
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value))
const stamp = () => new Date().toISOString()
export function mockBusinessContexts(user) {
  return [
    { id:`wholesale:${user.id}`,module:'wholesale',accountId:user.id,label:'批发商',levelName:'联创合伙人',capabilities:[],storeId:null },
    ...costoreContextFixtures(user),
    ...agencyContextFixtures(user),
  ]
}
function wholesaleTeamLayout(){const joined='2022-08-21T13:34:12.000Z',avatar='/static/partner/avatar-member.png'
  return [
    {id:'demo-person-1',name:'李志远',levelLabel:'普通用户',phone:'19919988991',storeId:null,displayId:'QZ0213214',joinedAt:joined,avatarUrl:avatar,version:1},
    {id:'demo-person-2',name:'李志远',levelLabel:'普通用户',phone:'19919988991',storeId:'demo-store-1',storeName:'脑商线下店梧桐街店',displayId:'QZ0213214',joinedAt:joined,avatarUrl:avatar,version:1},
    {id:'demo-person-3',name:'李志远',levelLabel:'天使合伙人',phone:'19919988991',storeId:'demo-store-1',storeName:'脑商线下店梧桐街店',displayId:'TS0213214',joinedAt:joined,avatarUrl:avatar,showPerformance:true,version:1},
    {id:'demo-person-4',name:'李志远',levelLabel:'VIP合伙人',phone:'19919988991',storeId:'demo-store-1',storeName:'脑商线下店梧桐街店',displayId:'VIP0213214',joinedAt:joined,avatarUrl:avatar,version:1},
  ]
}
export function mockBusinessState(user,context) {
  const key = JSON.stringify([user.id,context.id])
  if(!states.has(key)) {
    const categories=['AGENCY_FEE','SERVICE_FEE','COSTORE_FEE','SUPPLY_CHAIN','SOFTWARE_CARD','SPECIAL_PRODUCT','ADMIN_FEE','COLUMN']
    states.set(key,{version:1,available:200000,pending:5400,quota:20,transferred:0,quotes:new Map(),operations:new Map(),withdrawals:[{id:'layout-withdraw-1',amount:56700,accountType:'COMPANY',accountName:'示例科技有限公司',bankName:'中国银行',maskedBankNumber:'****1452',status:'PENDING_REVIEW',createdAt:'2022-08-21T13:31:12.000Z'},{id:'layout-withdraw-2',amount:56700,accountType:'PERSONAL',accountName:'李志远',bankName:'中国银行',maskedBankNumber:'****1452',status:'SUCCEEDED',createdAt:'2022-08-21T13:31:12.000Z',reviewedAt:'2022-08-02T13:34:12.000Z',voucherUrl:'/static/common/empty-content.png'},{id:'layout-withdraw-3',amount:56700,accountType:'PERSONAL',accountName:'李志远',bankName:'中国银行',maskedBankNumber:'****1452',status:'REJECTED',createdAt:'2022-08-21T13:31:12.000Z',reviewedAt:'2022-08-02T13:34:12.000Z',rejectionReason:'资料未通过审核'}],quotaLedger:[],
      people:wholesaleTeamLayout(),
      entries:categories.map((category,n)=>incomeEntry(context,category,n)),
      staff:[{id:'demo-coach-1',name:'王老师',loginAccount:'demo-coach',status:'ACTIVE',invitationStatus:'PENDING',version:1}],approvals:[{id:'demo-approval-1',title:'转店申请',type:'TRANSFER',status:'PENDING',applicantName:'张大伟',version:1}],store:{id:context.storeId||'demo-store-1',name:context.store?.name||'梧桐街训练中心',address:'本地地址',contact:'',version:1},
    })
  }
  const current=states.get(key);if(!current.restored){current.restored=true;try{const saved=uni.getStorageSync(`naoshang-mock-business-v2:${key}`);if(saved?.schema===2&&saved.accountId===user.id){Object.assign(current,saved.value);current.quotes=new Map(saved.quotes||[]);current.operations=new Map(saved.operations||[])}}catch{}}
  if(context.module==='wholesale'&&!current.people?.some(person=>person.id==='demo-person-3')&&current.people?.every(person=>(person.version||1)===1&&!person.storeId))current.people=wholesaleTeamLayout()
  if(context.module==='wholesale'&&Array.isArray(current.people)&&!current.people.some(person=>person.id==='demo-person-4')&&current.people.every(person=>(person.version||1)===1)){const vip=wholesaleTeamLayout().find(person=>person.id==='demo-person-4');if(vip)current.people.push(vip)}
  if(context.agencyType==='STORE')alignStoreLayout(current,context)
  return current
}
export function saveMockBusinessState(user,context){const state=mockBusinessState(user,context),key=JSON.stringify([user.id,context.id]),value={...state};delete value.quotes;delete value.operations;uni.setStorageSync(`naoshang-mock-business-v2:${key}`,{schema:2,accountId:user.id,value:clone(value),quotes:[...state.quotes],operations:[...state.operations]})}
export function mockBusinessOverview(user,context) {
  const state=mockBusinessState(user,context)
  const agencyRelations=context.module==='agency'
    ?{superior:{name:'李志远',avatarUrl:'/static/agency/avatar-li-zhiyuan.png',agencyLabel:'市代',partnerLabel:'天使合伙人',rankLabel:'区县代理',phone:'19919988991',regionLabel:'河南省郑州市',scopeLabel:'河南省郑州市'},referrer:{name:'王好梦',avatarUrl:'/static/agency/avatar-wang-haomeng.png',agencyLabel:'联创',partnerLabel:'',rankLabel:'联创合伙人',phone:'19919988991',regionLabel:'河南省郑州市高新区',scopeLabel:'河南省郑州市高新区'}}
    :{superior:{name:'区域上级',scopeLabel:'信息待后台提供'},referrer:{name:'推荐人',scopeLabel:'信息待后台提供'}}
  const agencyPreview=context.module==='agency'?agencySummary(context):{}
  const wholesalePortrait=context.module==='wholesale'&&(!user.name||user.name==='脑商体验官')
  return {...(context.module==='wholesale'?mockWholesaleOverview(state,user):{}),accountId:user.id,contextId:context.id,name:wholesalePortrait?'纳兰不败':(user.name||'李志远'),inviteCode:user.inviteCode||(context.module==='wholesale'?'LXYA023':''),avatarUrl:user.avatarUrl||(wholesalePortrait?'/static/partner/avatar-nalan.png':''),displayId:user.displayId||user.id,levelName:context.module==='wholesale'?mockWholesaleLevelName(mockWholesaleOverview(state,user).partnerStatus,context.levelName||context.label):context.levelName||context.label,teamCount:context.module==='wholesale'?29:state.people.length,available:state.available,pending:state.pending,quota:state.quota,transferred:state.transferred,...agencyPreview,...agencyRelations,benefits:context.module==='wholesale'?['小批','中批','大批','总批'].map((label,n)=>({id:`tier-${n+1}`,label,content:emptyContent()})):context.module==='agency'?['单店','区县','市代','省代'].map((label,n)=>({id:`agency-tier-${n+1}`,label,content:emptyContent()})):[{id:'costore',label:'等级权益',content:emptyContent()}],mockOnly:true}
}
export function mockBusinessReport(user,context,resource,{month='',filter='',keyword='',parentNodeId=null}={}) {
  const state=mockBusinessState(user,context);let items=[],metrics=[],columns=[]
  if(context.module==='wholesale'){const result=mockWholesaleReport(user,context,state,resource,{month,filter,keyword,parentNodeId});if(result)return clone(result)}
  if(context.module==='costore'&&resource.type==='income'){
    const person='李志远/19919988991',at='2022-08-21T21:34:12+08:00'
    const card=id=>({id,sourceName:person,title:'合店费：开通合店老板6个月',amount:54400,channel:'个人收益',createdAt:at,details:[{label:'实付金额',value:158000,kind:'money'},{label:'个人提点',value:1300,kind:'percent'}]})
    items=[1,2,3].map(n=>card(`costore-income-${n}`)).filter(item=>!keyword||`${item.sourceName} ${item.title}`.includes(keyword))
    return clone({items,metrics:[{label:'累计收益',value:225800,kind:'money'},{label:'可提现金额',value:225800,kind:'money'}],available:225800,columns:[],hasMore:false,nextCursor:null,mockOnly:true})
  }
  if(context.module==='costore'&&resource.type==='dividends'){
    const cardDividend=resource.id==='card-dividends'
    const columns=cardDividend
      ?[{key:'month',label:'月份'},{key:'eligibility',label:'分红资格'},{key:'amount',label:'总分红',kind:'money'},{key:'weightedAmount',label:'加权分红',kind:'money'},{key:'performanceAmount',label:'业绩分红',kind:'money'},{key:'salesAmount',label:'本月会员卡业绩',kind:'money'},{key:'shareBps',label:'个人业绩占比',kind:'percent'},{key:'ownerCount',label:'合店老板总数量'},{key:'poolAmount',label:'本月奖池累计',kind:'money'}]
      :[{key:'month',label:'月份'},{key:'amount',label:'总分红',kind:'money'},{key:'weightedAmount',label:'加权分红',kind:'money'},{key:'performanceAmount',label:'业绩分红',kind:'money'},{key:'salesAmount',label:'本月推广业绩',kind:'money'},{key:'shareBps',label:'个人业绩占比',kind:'percent'},{key:'ownerCount',label:'合店老板总数量'},{key:'poolAmount',label:'本月奖池累计',kind:'money'}]
    items=[1,2,3,4,5,6,7,8].map(n=>({id:`costore-dividend-${resource.id}-${n}`,month:month||'2026-02',eligibility:n%2?'当月有分红权':'当月无分红权',amount:60000,weightedAmount:37500,performanceAmount:22500,salesAmount:1000000,shareBps:3000,ownerCount:'2个',poolAmount:150000}))
    const summary=[{label:cardDividend?'本月会员卡业绩':'本月推广业绩',value:1000000,kind:'money'},{label:'个人业绩占比',value:3000,kind:'percent'},{label:'合店老板总数',value:5},{label:'本月奖池累计',value:100000,kind:'money'}]
    return clone({items,metrics:[{label:'总分红',value:60000,kind:'money'},{label:'加权分红',value:37500,kind:'money'},{label:'业绩分红',value:22500,kind:'money'}],summary,columns,eligibilityLabel:cardDividend?'当月分红权益：生效中':'',eligibilityNote:cardDividend?'您每月需要业绩达标2900元才能享有分红权益，当前业绩：0/2900，推广合店老板、门店软件卡、直推合伙人都会计入业绩':'',hasMore:false,nextCursor:null,mockOnly:true})
  }
  if(resource.type==='income') {
    items=state.entries.filter(item=>(filter!=='pending'||item.allocationStatus==='PENDING')&&(!keyword||item.title.includes(keyword)))
    metrics=context.module==='agency'
      ?[{label:'可提现金额',value:225800,kind:'money'},{label:'B端',value:32746,kind:'money'},{label:'C端',value:98124,kind:'money'},{label:'供应链',value:59962,kind:'money'},{label:'待结算收益',value:state.pending,kind:'money'}]
      :[{label:'可提现金额',value:state.available,kind:'money'},{label:'待结算收益',value:state.pending,kind:'money'}]
  } else if(resource.type==='dividends') {
    metrics=[{label:'总分红',value:60000,kind:'money'},{label:'加权分红',value:37500,kind:'money'},{label:'业绩分红',value:22500,kind:'money'},{label:'本月业绩',value:100000,kind:'money'},{label:'业绩占比',value:3000,kind:'percent'},{label:'合店老板总数',value:5,kind:'number'}]
    columns=[{key:'month',label:'月份'},{key:'eligibility',label:'分红资格'},{key:'amount',label:'总分红',kind:'money'},{key:'weightedAmount',label:'加权分红',kind:'money'},{key:'performanceAmount',label:'业绩分红',kind:'money'},{key:'salesAmount',label:'本月业绩',kind:'money'},{key:'shareBps',label:'业绩占比',kind:'percent'},{key:'ownerCount',label:'合店老板总数'},{key:'poolAmount',label:'奖池累计',kind:'money'}]
    items=[{id:`demo-dividend-${month}`,month,eligibility:'资格',amount:60000,weightedAmount:37500,performanceAmount:22500,salesAmount:100000,shareBps:3000,ownerCount:5,poolAmount:100000}]
  } else if(resource.id==='quota-batches') {
    metrics=[{label:'标准名额余额',value:state.quota,kind:'number'},{label:'活动名额',value:0,kind:'number'}];items=[{id:'demo-batch',title:'标准名额批次',remaining:state.quota,quantity:20,expiresAt:null}]
  } else if(['quota-ledger','quota-transfers'].includes(resource.id)) items=state.quotaLedger
  else if(resource.id==='experience') items=[{id:'demo-exp',title:'推广经验',quantity:10,sourceLabel:'业务推广',createdAt:stamp()}]
  else if(resource.id==='global-awards'){metrics=[{label:'资格',value:'资格'},{label:'本月全球奖',value:1000,kind:'money'}];items=[{id:'demo-global',title:`${month}全球奖`,amount:1000,createdAt:stamp()}]}
  else if(resource.type==='tasks') items=[{id:'demo-task-1',title:'推广任务（）',progressLabel:'1 / 3',description:'仅测试任务进度展示；不自动提升真实等级。'},{id:'demo-task-2',title:'补差价晋升',description:'请使用开通/升级入口获取报价。'}]
  else if(resource.type==='relations') items=[{id:'demo-superior',title:state.superior?.name||'上级',description:state.superior?.phone||'尚未绑定上级'}]
  else if(resource.type==='share') return {items:[],metrics:[],columns:[],qrUrl:'',posterUrl:'',shareUrl:'',localPayload:`http://localhost:5173/#/pages/register/index?inviteCode=${encodeURIComponent(user.inviteCode||user.id)}`,hasMore:false,nextCursor:null,mockOnly:true}
  else if(resource.type==='team') {
    if(context.module==='wholesale')items=state.people
    else {const tree=mockAgencyTree(context);if(parentNodeId&&!tree.some(node=>node.id===parentNodeId))throw new Error('无权访问该团队节点');items=tree.filter(node=>node.parentId===(parentNodeId||null))}
  }
  if(keyword)items=items.filter(item=>String(item.title||item.name||'').includes(keyword))
  return clone({items,metrics,columns,hasMore:false,nextCursor:null,mockOnly:true})
}
function costoreContextFixtures(user){
  const address='河南省郑州市管城回族区航海东路与中州大道交叉口西美景龙堂3c-1'
  const store={name:'脑商训练营梧桐街店',number:'NO.001',address,imageUrl:'/static/agency/store-wutong.png',daysRemaining:93}
  return [1,2,3].map(n=>({id:`costore:${user.id}:${n}`,module:'costore',accountId:user.id,label:store.name,contractId:`demo-contract-${n}`,storeId:`demo-store-${n}`,store:{...store},validUntil:'2027-10-22T00:00:00+08:00',capabilities:[]}))
}
function agencyContextFixtures(user){
  const rows=[
    {type:'COUNTY',suffix:'',regionLabel:'郑州市高新区代理',scopeLabel:'区县代理',assignmentId:'demo-assignment-COUNTY'},
    {type:'PROVINCE',suffix:'',regionLabel:'河南省代理',scopeLabel:'省代',assignmentId:'demo-assignment-PROVINCE'},
    {type:'PROVINCE',suffix:':anhui',regionLabel:'安徽省代理',scopeLabel:'省代',assignmentId:'demo-assignment-PROVINCE-anhui'},
    {type:'CITY',suffix:'',regionLabel:'河南省郑州市代理',scopeLabel:'市代',assignmentId:'demo-assignment-CITY'},
    {type:'COUNTY',suffix:':erqi',regionLabel:'郑州市二七区代理',scopeLabel:'区县代理',assignmentId:'demo-assignment-COUNTY-erqi'},
    {type:'COUNTY',suffix:':zhongyuan',regionLabel:'郑州市中原区代理',scopeLabel:'区县代理',assignmentId:'demo-assignment-COUNTY-zhongyuan'},
    {type:'STORE',suffix:'',regionLabel:'脑商训练营桐柏路店',scopeLabel:'河南省郑州市中原区桐柏北路xxx这里是地址...',assignmentId:'demo-assignment-STORE',storeId:'demo-store-1',store:{name:'脑商训练营桐柏路店',number:'NO.001',address:'河南省郑州市中原区桐柏北路xxx这里是地址...'}},
    {type:'STORE',suffix:':2',regionLabel:'脑商线下桐柏路店',scopeLabel:'河南省郑州市中原区桐柏北路xxx这里是地址...',assignmentId:'demo-assignment-STORE-2',storeId:'demo-store-2',store:{name:'脑商线下桐柏路店',number:'NO.002',address:'河南省郑州市中原区桐柏北路xxx这里是地址...'}}
  ]
  return rows.map(item=>({id:`agency:${user.id}:${item.type}${item.suffix}`,module:'agency',accountId:user.id,label:item.regionLabel,regionLabel:item.regionLabel,agencyType:item.type,assignmentId:item.assignmentId,storeId:item.storeId||null,store:item.store||null,scopeLabel:item.scopeLabel,capabilities:[]}))
}
function incomeEntry(context,category,n){
  const agency=context.module==='agency'
  const pending=n===5
  return {id:`demo-income-${n+1}`,sourceOrder:`单号：NS2026102200${n+1}`,partyLabel:agency?'李志远/19919988991':'',title:(agency?['代理费：开通西二区单店代理','合店费：开通合店老板6个月','服务费：所在区域合伙人服务费','供应链：购买平板','软件卡：购买xx软件卡','特色品：购买特色产品','行政费：购买行政费','专栏课：购买记忆基础']:['代理费：开通区域代理','服务费：会员服务','合店费：开通合店老板','供应链：购买平板','软件卡：购买软件卡','特色品：购买特色产品','行政费：购买行政费','专栏课：购买记忆基础'])[n],category,channel:n<3?'B端':n===3?'供应链':'C端',paymentTypeLabel:n<3?'B端业务':'门店交付',identityLabel:context.label,amount:agency?6750000:(pending?5400:1200+n*100),baseAmount:10000,rateBps:pending?500:1200,createdAt:agency?'2022-08-21T21:34:12+08:00':stamp(),allocationStatus:pending?'PENDING':'ALLOCATED',allocationKind:context.module==='agency'&&context.agencyType!=='STORE'?'inspection':'sales',settlementStatus:pending?'PENDING_ALLOCATION':'SETTLED',version:1,beneficiaryName:context.label,pendingNote:agency&&pending?'本单存在待分配提成，收益暂不计入可提现金额':'',recommended:{name:'王好梦',roleLabel:'区域合伙人',phone:'19919988991'},buyer:{name:'李志远',roleLabel:'天使合伙人',phone:'19919988991',address:'河南省郑州市管城回族区中州大道'},store:{name:'脑商训练营梧桐街店',number:'NO.001',address:'河南省郑州市管城回族区梧桐街',manager:'李志远/19919988991'},allowedActions:pending?['allocate']:[]}
}
function agencySummary(context){
  const teamCount={STORE:14,COUNTY:12,CITY:28,PROVINCE:86}[context.agencyType]||0
  return {teamCount,agencyIncome:698421}
}
const agencyMeta={
  CITY:{levelLabel:'市代',regionLabel:'河南省郑州市二七区',scopeLabel:'郑州市代理区域'},
  COUNTY:{levelLabel:'区县代理',regionLabel:'河南省郑州市二七区',scopeLabel:'高新区代理区域'},
  STORE:{levelLabel:'单店代理',regionLabel:'河南省郑州市二七区',scopeLabel:'高新区门店'},
  MEMBER:{levelLabel:'门店成员',regionLabel:'河南省郑州市二七区',scopeLabel:'门店成员'}
}
function teamPerformance(){
  const amounts=[775800,775800,149412,775800,775800]
  return ['本月业绩','季度业绩','半年业绩','本年业绩','累计业绩'].map((label,index)=>({label,value:amounts[index],kind:'money'}))
}
function storeRows(seed=0){return [1,2].map(index=>({id:`store-record-${seed}-${index}`,name:'脑商训练营梧桐街店',number:`NO.00${index}`,address:'河南省郑州市管城回族区航海东路与中州大道交叉口西美景龙堂3C-1',monthlyFee:69800,imageUrl:'/static/agency/store-wutong.png'}))}
function ownerRows(seed=0){return [{id:`owner-${seed}-1`,name:'李志远',avatarUrl:'/static/agency/avatar-li-zhiyuan.png',partnerLevel:'私董合伙人',storeNames:'脑商训练营梧桐街店'},{id:`owner-${seed}-2`,name:'李志远',avatarUrl:'/static/agency/avatar-wang-haomeng.png',partnerLevel:'天使合伙人',storeNames:'脑商训练营梧桐街店、脑商训练营梧桐北路店、这里是门店名称'}]}
function territoriesFor(kind){return kind==='CITY'?['河南省洛阳市','郑州市']:kind==='COUNTY'?['郑州市高新区','郑州市管城区']:[]}
function agencyNode({id,parentId=null,name,kind,ordinal=0,hasChildren=false,storeCount=3,ownerCount=14}){
  const meta=agencyMeta[kind]
  return {id,parentId,name,avatarUrl:'/static/agency/avatar-li-zhiyuan.png',displayId:'TS0213214',levelLabel:meta.levelLabel,partnerLevel:ordinal%2?'天使合伙人':'私董合伙人',scopeLabel:meta.scopeLabel,regionLabel:meta.regionLabel,territoryList:territoriesFor(kind),managedCount:kind==='CITY'?3:kind==='COUNTY'?3:0,phone:'19919988991',hasChildren,childLabel:kind==='CITY'?'区县代理':kind==='COUNTY'?'单店代理':kind==='STORE'?'门店成员':'下级团队',storeCount,ownerCount,createdAt:'2022-08-21T21:32:12+08:00',performance:teamPerformance(),stores:['STORE','MEMBER'].includes(kind)?storeRows(ordinal):[],owners:['STORE','MEMBER'].includes(kind)?ownerRows(ordinal):[]}
}
// MOCK-ONLY: API should return only nodes authorized for the selected assignment.
export function mockAgencyTree(context) {
  const all=[]
  const cities=['郑州市','洛阳市'].map((_,index)=>agencyNode({id:`node-city-${index+1}`,name:'李志远',kind:'CITY',ordinal:index,hasChildren:true,storeCount:index?12:18,ownerCount:index?48:72}))
  const countySeed=[['高新区','金水区','管城区'],['洛龙区','西工区']]
  const counties=cities.flatMap((city,cityIndex)=>countySeed[cityIndex].map((_,index)=>agencyNode({id:`node-county-${cityIndex+1}-${index+1}`,parentId:city.id,name:'李志远',kind:'COUNTY',ordinal:cityIndex*3+index+1,hasChildren:true,storeCount:3+index,ownerCount:14+index*4})))
  const stores=counties.flatMap((county,countyIndex)=>[0,1].map(index=>agencyNode({id:`node-store-${countyIndex+1}-${index+1}`,parentId:county.id,name:'李志远',kind:'STORE',ordinal:countyIndex*2+index+7,hasChildren:true,storeCount:3,ownerCount:14})))
  const members=stores.flatMap((store,storeIndex)=>[0,1,2].map(index=>agencyNode({id:`node-member-${storeIndex+1}-${index+1}`,parentId:store.id,name:['李志远','王好梦','张小伟'][index],kind:'MEMBER',ordinal:storeIndex*3+index+20,hasChildren:false,storeCount:1,ownerCount:0})))
  all.push(...cities,...counties,...stores,...members)
  const roots={PROVINCE:cities,CITY:counties.filter(node=>node.parentId==='node-city-1'),COUNTY:stores.filter(node=>node.parentId==='node-county-1-1'),STORE:members.filter(node=>node.parentId==='node-store-1-1')}
  const allowed=new Set()
  const collect=node=>{if(allowed.has(node.id))return;allowed.add(node.id);all.filter(child=>child.parentId===node.id).forEach(collect)}
  const visibleRoots=roots[context.agencyType]||[]
  visibleRoots.forEach(collect)
  const rootIds=new Set(visibleRoots.map(node=>node.id))
  return all.filter(node=>allowed.has(node.id)).map(node=>rootIds.has(node.id)?{...node,parentId:null}:node)
}
function storeStaffLayout(){
  return [1,2,3,4].map(n=>({id:`demo-coach-${n}`,name:'李志远',loginAccount:'19919988991',status:'ACTIVE',invitationStatus:'ACTIVE',credentialSet:true,layoutSample:true,version:1}))
}
function storeOwnerLayout(){
  const performance=()=>[{label:'本月业绩',value:775800},{label:'季度业绩',value:775800},{label:'半年业绩',value:149412},{label:'本年业绩',value:775800},{label:'累计业绩',value:775800}].map(item=>({...item,kind:'money'}))
  return [1,2].map(n=>({id:`demo-owner-${n}`,name:'李志远',avatarUrl:'/static/agency/avatar-li-zhiyuan.png',roleLabel:'合店老板',displayId:'TS0213214',phone:'19919988991',daysRemaining:68,durationLabel:'6个月',feeAmount:418800,startedAt:'2022-08-21T21:34:12+08:00',validUntil:'2022-08-21T21:34:12+08:00',performance:performance()}))
}
function storeCustomerLayout(user){const memberId=mockFamily(user).members[0]?.id||'';return [1,2,3,4].map(n=>({id:`store-customer-${n}`,memberId,name:'李志远',avatarUrl:'/static/agency/avatar-li-zhiyuan.png',displayId:'TS0213214',phone:'19919988991',storeConsumptionAmount:541184}))}
function storeApprovalLayout(){
  const person={name:'李志远',avatarUrl:'/static/agency/avatar-li-zhiyuan.png',badge:'天使合伙人',displayId:'TS0213214',phone:'19919988991'}
  const at='2022-08-21T21:34:12+08:00'
  const stores={currentStoreName:'脑商线下店梧桐街店',targetStoreName:'脑商线下店王城大道店',appliedAt:at}
  const row=(id,extra)=>({id,version:1,applicantName:person.name,...person,...extra})
  return [
    row('layout-costore-pending',{bucket:'costore',type:'COSTORE',title:'申请开通6个月合店老板',status:'PENDING',unitAmount:69800,feeAmount:418800,appliedAt:at}),
    row('layout-costore-approved',{bucket:'costore',type:'COSTORE',title:'申请开通6个月合店老板',status:'APPROVED',unitAmount:69800,feeAmount:418800,appliedAt:at,reviewedAt:at}),
    row('layout-costore-rejected',{bucket:'costore',type:'COSTORE',title:'申请开通6个月合店老板',status:'REJECTED',unitAmount:69800,feeAmount:418800,appliedAt:at,reviewedAt:at}),
    row('layout-out-pending',{bucket:'transfer-out',type:'TRANSFER',direction:'OUT',title:'我发起的转店申请',status:'PENDING',...stores}),
    row('layout-out-approved',{bucket:'transfer-out',type:'TRANSFER',direction:'OUT',title:'我发起的转店申请',status:'APPROVED',...stores,reviewedAt:at}),
    row('layout-out-rejected',{bucket:'transfer-out',type:'TRANSFER',direction:'OUT',title:'我发起的转店申请',status:'REJECTED',...stores,reviewedAt:at}),
    row('layout-in-pending',{bucket:'transfer-in',type:'TRANSFER',direction:'IN',title:'待您审批的转店申请',status:'PENDING',...stores}),
    row('layout-in-approved',{bucket:'transfer-in',type:'TRANSFER',direction:'IN',title:'已审批的转店申请',status:'APPROVED',...stores,reviewedAt:at}),
    row('layout-in-rejected',{bucket:'transfer-in',type:'TRANSFER',direction:'IN',title:'已审批的转店申请',status:'REJECTED',...stores,reviewedAt:at})
  ]
}
function alignStoreLayout(state,context){
  const legacyStaff=state.staff?.length===1&&state.staff[0]?.loginAccount==='demo-coach'&&state.staff[0]?.name==='王老师'&&(state.staff[0].version||1)===1
  if(legacyStaff)state.staff=storeStaffLayout()
  const legacyName=['梧桐街训练中心','脑商线下桐柏路店','本地地址'].includes(state.store?.name)
  if(context.store?.name&&legacyName&&(state.store.version||1)===1)state.store={...state.store,name:context.store.name,address:context.store.address||state.store.address,number:context.store.number||'',managerName:state.store.managerName||'张大伟',contact:state.store.contact||'19919988991',regionNames:state.store.regionNames||['河南省','郑州市','管城回族区'],regionCodes:state.store.regionCodes||['410000','410100','410104'],minimumFeeAmount:Number.isInteger(state.store.minimumFeeAmount)?state.store.minimumFeeAmount:69800}
  const legacyApproval=state.approvals?.length===1&&state.approvals[0]?.id==='demo-approval-1'&&state.approvals[0]?.status==='PENDING'&&(state.approvals[0].version||1)===1
  if(legacyApproval)state.approvals=storeApprovalLayout()
  if((state.store.version||1)===1&&(!Number.isInteger(state.store.minimumFeeAmount)||!state.store.managerName||!state.store.contact||!state.store.address||state.store.address==='本地地址'))state.store={...state.store,managerName:state.store.managerName||'张大伟',contact:state.store.contact||'19919988991',regionNames:state.store.regionNames||['河南省','郑州市','管城回族区'],regionCodes:state.store.regionCodes||['410000','410100','410104'],address:state.store.address&&state.store.address!=='本地地址'?state.store.address:'中州大道与航海路交叉口东南角美林河畔1栋',minimumFeeAmount:Number.isInteger(state.store.minimumFeeAmount)?state.store.minimumFeeAmount:69800}
}
export const mockClone=clone
export function mockStoreWorkspace(user,context){
  const state=mockBusinessState(user,context)
  if(context.agencyType==='STORE')alignStoreLayout(state,context)
  return {store:clone(state.store),staff:clone(state.staff),owners:storeOwnerLayout(),members:storeCustomerLayout(user),approvals:clone(state.approvals),allowedActions:['edit-store','save-coach','remove-coach','approve'],mockOnly:true}
}
