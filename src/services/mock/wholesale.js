// MOCK-ONLY / TODO(API): presentation fixtures for designs 17–53, never real pricing or commission rules.
import { config } from '../../config'
const activityBatch={id:'activity-batch-1',title:'后台充值4个活动VIP名额',grantedAt:'2026-10-01T00:00:00+08:00',expiresAt:null,validityLabel:'永久有效',transferable:false,refundable:false,total:4}
export function mockActivityQuota(state){const reserved=Object.values(state.activityReservations || {}).reduce((sum,value)=>sum+value,0),remaining=state.activityQuota ?? activityBatch.total;return {...activityBatch,reserved,remaining,used:Math.max(0,activityBatch.total-remaining-reserved)}}
export function mockWholesaleOverview(state,user={}){const configured=user.partnerStatus ?? state.partnerStatus ?? config.mockWholesalePartnerStatus ?? 'ACTIVE',partnerStatus=configured==='ANGEL_UNPAID'&&state.annualValidUntil?'ANGEL':configured,angel=partnerStatus==='ANGEL'||partnerStatus==='ANGEL_UNPAID',pristine=state.quota===20&&state.transferred===0;return {partnerStatus,annualRemainingDays:partnerStatus==='ANGEL_UNPAID'?null:state.annualValidUntil?Math.max(0,Math.ceil((Date.parse(state.annualValidUntil)-Date.now())/86400000)):partnerStatus==='NONE'?null:99,annualOpenLabel:partnerStatus==='ANGEL_UNPAID'?'支付¥200.00开通1年合伙权益':'',rankDescription:partnerStatus==='NONE'?'您当前不是合伙人，升级可享受合伙人权益':angel?'尊享x项权益，推广同级合伙人可快速升级':'尊享x项权益，您已是最高等级',experience:100,experienceTarget:9980,showcaseTeamCount:29,showcaseQuota:pristine?17:state.quota,showcaseTransferred:pristine?38:state.transferred}}
export function mockWholesaleLevelName(status,fallback){if(status==='NONE')return '普通用户';if(status==='ANGEL'||status==='ANGEL_UNPAID')return '天使合伙人';return fallback}
const levelPlans=[{value:'DEMO-VIP',label:'VIP合伙人',total:1,listPrice:998000},{value:'DEMO-ANGEL',label:'天使合伙人',total:3,listPrice:2980000},{value:'DEMO-BOARD',label:'私董合伙人',total:6,listPrice:5980000},{value:'DEMO-FOUNDER',label:'联创合伙人',total:24,listPrice:23980000}]
export function mockUpgradePlans(person){const current=levelPlans.find(x=>x.label===person?.levelLabel);const currentTotal=current?.total || 0;return levelPlans.map(plan=>({value:plan.value,label:plan.label,listPrice:plan.listPrice,paidAmount:current?.listPrice || 0,currentLabel:current?.label || '',requiredQuota:Math.max(0,plan.total-currentTotal),disabled:plan.total<=currentTotal}))}
const teamPerformance=[{label:'当月总业绩',value:926388,kind:'money'},{label:'当月VIP业绩',value:775800,kind:'money'},{label:'当月产品业绩',value:149412,kind:'money'},{label:'累计总业绩',value:1098000,kind:'money'},{label:'累计VIP业绩',value:795124,kind:'money'},{label:'累计产品业绩',value:201463,kind:'money'}]
const teamJoined='2022-08-21T13:34:12.000Z'
export function mockWholesalePeople(state){return state.people.map((person,index)=>({...person,upgradePlans:mockUpgradePlans(person),displayId:person.displayId||`QZ02132${index+1}`,joinedAt:person.joinedAt||teamJoined,avatarUrl:person.avatarUrl||'/static/partner/avatar-member.png',tagLabel:person.levelLabel==='天使合伙人'?'天使合伙':person.levelLabel,storeName:person.storeName||(person.storeId?({'demo-store-1':'脑商训练营梧桐街店','demo-store-2':'脑商训练营文化路店',headquarters:'总部服务'}[person.storeId]||person.storeId):''),quotaRemaining:person.showPerformance?19:null,performance:person.showPerformance?teamPerformance:[]}))}
export function mockWholesaleReport(user,context,state,resource,params){
 const base={items:[],metrics:[],columns:[],hasMore:false,nextCursor:null,mockOnly:true},people=mockWholesalePeople(state)
 if(resource.id==='team')return {...base,items:people.filter(x=>!params.keyword||`${x.name} ${x.displayId} ${x.phone}`.includes(params.keyword))}
 if(resource.id==='superior'){const status=mockWholesaleOverview(state,user).partnerStatus,sample=status==='ACTIVE'?{name:'李志远',phone:'19919988991',levelLabel:'私董合伙人',avatarUrl:'/static/agency/avatar-li-zhiyuan.png'}:null;return {...base,superior:state.superior||sample}}
 if(resource.id==='promotion')return {...base,promotion:{id:'demo-promotion-task',version:1,beforeName:'私董合伙人',afterName:'联创合伙人',beforeQuota:6,afterQuota:24,taskDescription:'一年内直推达标后申请晋升，折算进度及资格以系统审核结果为准',progress:6,target:18,canClaim:false,statusLabel:'进行中',validUntil:new Date(Date.now()+365*86400000).toISOString()}}
 if(resource.id==='share'){const inviteCode=user.inviteCode||'LXYA023';return {...base,inviteCode,localPayload:`http://localhost:5173/#/pages/register/index?inviteCode=${encodeURIComponent(inviteCode)}`}}
 const layoutAt='2022-08-21T13:34:12.000Z'
 const purchases=state.quotaLedger.filter(x=>x.quantity>0)
 if(resource.id==='quota-ledger')return {...base,standardRemaining:state.quota,activityRemaining:mockActivityQuota(state).remaining,items:purchases.length?purchases:[1,2].map(n=>({id:`layout-purchase-${n}`,title:'购入VIP名额',quantity:15,createdAt:layoutAt}))}
 if(resource.id==='quota-transfers'){
  const moved=state.quotaLedger.filter(x=>x.quantity<0 || x.activityQuantity<0).map(x=>({...x,quantity:x.quantity+(x.activityQuantity || 0),targetDisplayId:people.find(p=>p.name===x.targetName)?.displayId,targetLevel:people.find(p=>p.name===x.targetName)?.levelLabel}))
  const samples=[{id:'layout-transfer-1',title:'划转VIP名额',quantity:-15,createdAt:layoutAt,targetDisplayId:'VIP9747575',targetLevel:'VIP合伙人'},{id:'layout-transfer-2',title:'划转VIP名额',quantity:-10,createdAt:layoutAt,targetDisplayId:'TS9747575',targetLevel:'天使合伙人',peerAward:199000}]
  return {...base,items:moved.length?moved:samples}
 }
 if(resource.id==='quota-batches')return {...base,items:[mockActivityQuota(state)]}
 if(resource.id==='experience'){
  const promotion=[{id:'experience-p1',name:'李志远',phone:'19919988991',title:'合伙人：升为VIP合伙人',amount:9980,initialLevel:'普通用户',quotaUsed:2},{id:'experience-p2',name:'李志远',phone:'19919988991',title:'合店费：开通合店老板6个月',amount:19820},{id:'experience-p3',name:'李志远',phone:'19919988991',title:'代理费：成为区县代理',amount:40000}]
  const products=['供应链：购买平板','软件卡：购买软件卡','特色品：购买特色产品','专栏课：购买记忆法'].map((title,n)=>({id:`experience-product-${n}`,name:'李志远',phone:'19919988991',title,amount:9980}))
  return {...base,promotionExperience:69800,productExperience:39920,items:(params.filter==='products'?products:promotion).map(x=>({...x,createdAt:layoutAt}))}
 }
 if(resource.id==='global-awards'){
  // Fixture strings for the two designed headers. Pages render the DTO and do not decide eligibility.
  const matured=String(params.month)<'2023-10'
  const header=matured?{eligibilityLabel:'当月分红权益：生效中',eligibilityNote:'（您每月需要直推1个VIP才能享有当月分红权益）'}:{eligibilityLabel:'无条件分红权益剩余：2年11个月',eligibilityNote:'（到期后您每月需要直推1个VIP才能享有当月分红权益）'}
  const columns=[{key:'month',label:'月份'},{key:'eligibility',label:'分红资格'},{key:'amount',label:'总分红',kind:'money'},{key:'weightedAmount',label:'加权分红',kind:'money'},{key:'performanceAmount',label:'业绩分红',kind:'money'},{key:'vipSold',label:'本月VIP卖出'},{key:'shareBps',label:'个人业绩占比',kind:'percent'},{key:'founderCount',label:'联创总数量'},{key:'poolAmount',label:'本月奖池累计',kind:'money'}]
  const row=(id,eligibility)=>({id,month:params.month,eligibility,amount:60000,weightedAmount:37500,performanceAmount:22500,vipSold:'10个',shareBps:3000,founderCount:2,poolAmount:150000})
  return {...base,...header,metrics:[{label:'总分红',value:60000,kind:'money'},{label:'加权分红',value:37500,kind:'money'},{label:'业绩分红',value:22500,kind:'money'}],summary:[{label:'本月VIP卖出',value:'10个'},{label:'个人业绩占比',value:3000,kind:'percent'},{label:'联创总数量',value:2},{label:'本月奖池累计',value:150000,kind:'money'}],columns,items:[row('global-1','无条件分红'),row('global-2',matured?'当月无分红权':'无条件分红'),row('global-3',matured?'当月有分红权':'无条件分红')]}
 }
 if(resource.id==='income'){
  const person='李志远/19919988991',entry=index=>state.entries[index]?.id
  const cards=[
   {id:entry(3)||'layout-income-1',sourceName:person,title:'供应链：下级购买平板',amount:5000,channel:'复购奖',createdAt:layoutAt,details:[{label:'用户身份',value:'VIP合伙人'},{label:'订单金额',value:250000,kind:'money'},{label:'复购提点',value:200,kind:'percent'}]},
   {id:entry(2)||'layout-income-2',sourceName:person,title:'合店费：下级开通合店老板6个月',amount:50000,channel:'复购奖',createdAt:layoutAt,details:[{label:'用户身份',value:'天使合伙人'},{label:'开通金额',value:1000000,kind:'money'},{label:'复购提点',value:200,kind:'percent'}]},
   {id:'layout-income-software',layoutOnly:true,sourceName:person,title:'软件卡：下级购买xx软件卡',amount:5000,channel:'直推奖',createdAt:layoutAt,details:[{label:'用户身份',value:'普通用户'},{label:'计件金额',value:100000,kind:'money'},{label:'直推提点',value:500,kind:'percent'}]},
   {id:entry(0)||'layout-income-3',sourceName:person,title:'代理费：下级开通二七区代理',amount:500000,channel:'直推奖',createdAt:layoutAt,details:[{label:'品牌费',value:10000000,kind:'money'},{label:'直推提点',value:500,kind:'percent'}]},
   {id:'layout-income-rights',layoutOnly:true,sourceName:person,title:'权益费：下级解锁合伙人权益',amount:1000,channel:'直推奖',createdAt:layoutAt,details:[{label:'解锁费用',value:20000,kind:'money'},{label:'直推提点',value:500,kind:'percent'}]},
   {id:entry(4)||'layout-income-4',sourceName:person,title:'合伙人：购买10个VIP名额',amount:175000,channel:'平级奖',createdAt:layoutAt,details:[{label:'拿货提点',value:'2%/个'},{label:'单个VIP提成',value:'175'}]},
   {id:'layout-income-out',layoutOnly:true,sourceName:person,title:'划拨2个VIP名额（同级合伙人）',amount:-20000,channel:'平级奖支出',createdAt:layoutAt,details:[]},
  ]
  return {...base,available:225800,metrics:[{label:'直推奖',value:32746,kind:'money'},{label:'复购奖',value:98124,kind:'money'},{label:'平级奖',value:59962,kind:'money'}],items:cards.filter(item=>!params.keyword||item.title.includes(params.keyword))}
 }
 return null
}
