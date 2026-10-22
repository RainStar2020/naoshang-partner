import {mockFamily} from './family'
import {mockWholesaleOverview,mockWholesaleReport} from './wholesale'
// TODO(API): replace these mock-only fixtures when business APIs are connected.
import { emptyContent } from '../../features/content/rich-content'
const states = new Map()
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value))
const stamp = () => new Date().toISOString()
export function mockBusinessContexts(user) {
  return [
    { id:`wholesale:${user.id}`,module:'wholesale',accountId:user.id,label:'批发商',levelName:'联创合伙人',capabilities:[],storeId:null },
    ...[1,2,3].map(n=>({id:`costore:${user.id}:${n}`,module:'costore',accountId:user.id,label:`合店门店${n}`,contractId:`demo-contract-${n}`,storeId:`demo-store-${n}`,store:{name:`合店门店${n}`,number:`NO.00${n}`,address:'梧桐街成长中心'},validUntil:'2027-10-22T00:00:00+08:00',capabilities:[]})),
    ...['STORE','COUNTY','CITY','PROVINCE'].map((type,n)=>({id:`agency:${user.id}:${type}`,module:'agency',accountId:user.id,label:`${['单店','区县','市级','省级'][n]}代理`,regionLabel:['郑州市高新区单店代理','郑州市高新区代理','郑州市市级代理','河南省代理'][n],agencyType:type,assignmentId:`demo-assignment-${type}`,storeId:type==='STORE'?'demo-store-1':null,scopeLabel:`${['单店经营','区县','城市','省份'][n]}范围`,capabilities:[]})),
  ]
}
export function mockBusinessState(user,context) {
  const key = JSON.stringify([user.id,context.id])
  if(!states.has(key)) {
    const categories=['AGENCY_FEE','SERVICE_FEE','COSTORE_FEE','SUPPLY_CHAIN','SOFTWARE_CARD','SPECIAL_PRODUCT','ADMIN_FEE','COLUMN']
    states.set(key,{version:1,available:200000,pending:5400,quota:20,transferred:0,quotes:new Map(),operations:new Map(),withdrawals:[],quotaLedger:[],
      people:[{id:'demo-person-1',name:'李志远',levelLabel:'普通用户',phone:'',storeId:null,version:1},{id:'demo-person-2',name:'王好梦',levelLabel:'VIP合伙人',phone:'',storeId:null,version:1}],
      entries:categories.map((category,n)=>({id:`demo-income-${n+1}`,sourceOrder:`单号：NS2026102200${n+1}`,title:['代理费：开通区域代理','服务费：会员服务','合店费：开通合店老板','供应链：购买平板','软件卡：购买软件卡','特色品：购买特色产品','行政费：购买行政费','专栏课：购买记忆基础'][n],category,channel:n<3?'B端':n===3?'供应链':'C端',paymentTypeLabel:n<3?'B端业务':'门店交付',identityLabel:context.label,amount:n===5?5400:1200+n*100,baseAmount:10000,rateBps:n===5?500:1200,createdAt:stamp(),allocationStatus:n===5?'PENDING':'ALLOCATED',allocationKind:context.module==='agency'&&context.agencyType!=='STORE'?'inspection':'sales',settlementStatus:n===5?'PENDING_ALLOCATION':'SETTLED',version:1,beneficiaryName:context.label,recommended:{name:'王好梦',roleLabel:'区域合伙人',phone:'19919988991'},buyer:{name:'李志远',roleLabel:'天使合伙人',phone:'19919988991',address:'河南省郑州市管城回族区中州大道'},store:{name:'脑商训练营梧桐街店',number:'NO.001',address:'河南省郑州市管城回族区梧桐街',manager:'李志远/19919988991'},allowedActions:n===5?['allocate']:[]})),
      staff:[{id:'demo-coach-1',name:'王老师',loginAccount:'demo-coach',status:'ACTIVE',invitationStatus:'PENDING',version:1}],approvals:[{id:'demo-approval-1',title:'转店申请',type:'TRANSFER',status:'PENDING',applicantName:'张大伟',version:1}],store:{id:context.storeId||'demo-store-1',name:context.store?.name||'梧桐街训练中心',address:'本地地址',contact:'',version:1},
    })
  }
  const current=states.get(key);if(!current.restored){current.restored=true;try{const saved=uni.getStorageSync(`naoshang-mock-business-v2:${key}`);if(saved?.schema===2&&saved.accountId===user.id){Object.assign(current,saved.value);current.quotes=new Map(saved.quotes||[]);current.operations=new Map(saved.operations||[])}}catch{}}
  return current
}
export function saveMockBusinessState(user,context){const state=mockBusinessState(user,context),key=JSON.stringify([user.id,context.id]),value={...state};delete value.quotes;delete value.operations;uni.setStorageSync(`naoshang-mock-business-v2:${key}`,{schema:2,accountId:user.id,value:clone(value),quotes:[...state.quotes],operations:[...state.operations]})}
export function mockBusinessOverview(user,context) {
  const state=mockBusinessState(user,context)
  const agencyRelations=context.module==='agency'
    ?{superior:{name:'李志远',avatarUrl:'/static/agency/avatar-wang-haomeng.png',agencyLabel:'市代',partnerLabel:'天使合伙人',phone:'19919988991',regionLabel:'河南省郑州市',scopeLabel:'河南省郑州市'},referrer:{name:'王好梦',avatarUrl:'/static/agency/avatar-wang-haomeng.png',agencyLabel:'联创',partnerLabel:'联创合伙人',phone:'19919988991',regionLabel:'河南省郑州市高新区',scopeLabel:'河南省郑州市高新区'}}
    :{superior:{name:'区域上级',scopeLabel:'信息待后台提供'},referrer:{name:'推荐人',scopeLabel:'信息待后台提供'}}
  const agencyPreview=context.module==='agency'?agencySummary(context):{}
  return {...(context.module==='wholesale'?mockWholesaleOverview(state):{}),accountId:user.id,contextId:context.id,name:user.name||'李志远',inviteCode:user.inviteCode||'',levelName:context.levelName||context.label,teamCount:state.people.length,available:state.available,pending:state.pending,quota:state.quota,transferred:state.transferred,...agencyPreview,...agencyRelations,benefits:context.module==='wholesale'?['小批','中批','大批','总批'].map((label,n)=>({id:`tier-${n+1}`,label,content:emptyContent()})):context.module==='agency'?['单店','区县','市代','省代'].map((label,n)=>({id:`agency-tier-${n+1}`,label,content:emptyContent()})):[{id:'costore',label:'等级权益',content:emptyContent()}],mockOnly:true}
}
export function mockBusinessReport(user,context,resource,{month='',filter='',keyword='',parentNodeId=null}={}) {
  const state=mockBusinessState(user,context);let items=[],metrics=[],columns=[]
  if(context.module==='wholesale'){const result=mockWholesaleReport(user,context,state,resource,{month,filter,keyword,parentNodeId});if(result)return clone(result)}
  if(resource.type==='income') {
    items=state.entries.filter(item=>(filter!=='pending'||item.allocationStatus==='PENDING')&&(!keyword||item.title.includes(keyword)))
    metrics=[{label:'可提现金额',value:state.available,kind:'money'},{label:'待结算收益',value:state.pending,kind:'money'}]
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
function teamPerformance(seed=0){
  const amounts=[775800,775800,149412,775800,775800]
  return ['本月业绩','季度业绩','半年业绩','本年业绩','累计业绩'].map((label,index)=>({label,value:amounts[index]+seed*3500,kind:'money'}))
}
function storeRows(seed=0){return [1,2].map(index=>({id:`store-record-${seed}-${index}`,name:'脑商训练营梧桐街店',number:`NO.00${index}`,address:'河南省郑州市管城回族区航海东路与中州大道交叉口西美景龙堂3C-1',monthlyFee:69800,imageUrl:'/static/agency/store-wutong.png'}))}
function ownerRows(seed=0){return [{id:`owner-${seed}-1`,name:'李志远',avatarUrl:'/static/agency/avatar-wang-haomeng.png',partnerLevel:'私董合伙人',storeNames:'脑商训练营梧桐街店'},{id:`owner-${seed}-2`,name:'王好梦',avatarUrl:'/static/agency/avatar-wang-haomeng.png',partnerLevel:'天使合伙人',storeNames:'脑商训练营梧桐街店、脑商训练营梧桐北路店、这里是门店名称'}]}
function territoriesFor(kind){return kind==='CITY'?['河南省郑州市','河南省洛阳市']:kind==='COUNTY'?['郑州市高新区','郑州市管城区']:[]}
function agencyNode({id,parentId=null,name,kind,ordinal=0,hasChildren=false,storeCount=3,ownerCount=14}){
  const meta=agencyMeta[kind]
  return {id,parentId,name,avatarUrl:'/static/agency/avatar-li-zhiyuan.png',displayId:`TS02132${String(ordinal+1).padStart(2,'0')}`,levelLabel:meta.levelLabel,partnerLevel:ordinal%2?'天使合伙人':'私董合伙人',scopeLabel:meta.scopeLabel,regionLabel:meta.regionLabel,territoryList:territoriesFor(kind),managedCount:kind==='CITY'?3:kind==='COUNTY'?3:0,phone:'19919988991',hasChildren,childLabel:kind==='CITY'?'区县代理':kind==='COUNTY'?'单店代理':kind==='STORE'?'门店成员':'下级团队',storeCount,ownerCount,createdAt:'2022-08-21T21:32:12+08:00',performance:teamPerformance(ordinal),stores:['STORE','MEMBER'].includes(kind)?storeRows(ordinal):[],owners:['STORE','MEMBER'].includes(kind)?ownerRows(ordinal):[]}
}
// MOCK-ONLY: API should return only nodes authorized for the selected assignment.
export function mockAgencyTree(context) {
  const all=[]
  const cities=['郑州市','洛阳市'].map((name,index)=>agencyNode({id:`node-city-${index+1}`,name:`${name}代理团队`,kind:'CITY',ordinal:index,hasChildren:true,storeCount:index?12:18,ownerCount:index?48:72}))
  const countySeed=[['高新区','金水区','管城区'],['洛龙区','西工区']]
  const counties=cities.flatMap((city,cityIndex)=>countySeed[cityIndex].map((district,index)=>agencyNode({id:`node-county-${cityIndex+1}-${index+1}`,parentId:city.id,name:`${['郑州市','洛阳市'][cityIndex]}${district}代理`,kind:'COUNTY',ordinal:cityIndex*3+index+1,hasChildren:true,storeCount:3+index,ownerCount:14+index*4})))
  const stores=counties.flatMap((county,countyIndex)=>[0,1].map(index=>agencyNode({id:`node-store-${countyIndex+1}-${index+1}`,parentId:county.id,name:`${['梧桐街','科创路','中州大道','洛龙路','西工路'][countyIndex]}${index+1}号店`,kind:'STORE',ordinal:countyIndex*2+index+7,hasChildren:true,storeCount:1,ownerCount:6+index})))
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
export const mockClone=clone
export function mockStoreWorkspace(user,context){
  const state=mockBusinessState(user,context)
  return {store:clone(state.store),staff:clone(state.staff),owners:[{id:'demo-owner',name:'合店老板',status:'ACTIVE',validUntil:'2027-10-22'}],members:clone(mockFamily(user).members),approvals:clone(state.approvals),allowedActions:['edit-store','save-coach','approve'],mockOnly:true}
}
