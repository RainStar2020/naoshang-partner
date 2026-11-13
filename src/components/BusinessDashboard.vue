<template><AgencyDashboard v-if="(status==='shell'||status==='ready') && context?.module==='agency'" ref="agencyRef" @left="leaveAgency"/><CostoreDashboard v-else-if="(status==='shell'||status==='ready') && context?.module==='costore'" ref="costoreRef" @left="leaveAgency"/><view v-else class="business-page feature-page" :class="{'wholesale-dashboard':context?.module==='wholesale','ordinary-dashboard':isOrdinary}"><SilentRefreshBar :active="refreshing"/><image class="business-background" src="/static/partner/bg-overview.png" mode="scaleToFill"/><view class="business-header"><text>{{moduleInfo?.title||'联营中心'}}</text></view><FeaturePageState :status="status" :error="error" mode="skeleton" skeleton-variant="dashboard" @retry="load"/><template v-if="(status==='shell'||status==='ready')&&overview"><view class="business-identity"><view class="business-person"><view v-if="context.module==='wholesale'" class="business-avatar"><image v-if="overview.avatarUrl && !avatarFailed" :src="overview.avatarUrl" mode="aspectFill" @error="avatarFailed=true"/><text v-else>{{displayName.slice(0,1)}}</text></view><view><view class="business-name">{{context.module==='wholesale'?displayName:context.label}}</view><view class="business-profile-meta"><text class="business-muted">{{context.module==='wholesale'?`ID：${overview.displayId || ""}`:context.scopeLabel||`共${moduleContexts.length}家门店`}}</text><button v-if="context.module==='wholesale'&&overview.inviteCode" class="business-text-button business-invite" @click="copyInvite"><text>邀请码：{{overview.inviteCode}}</text><image src="/static/common/icon-copy.png" mode="aspectFit"/></button></view><button v-if="context.module==='agency'" class="business-text-button" @click="contextOpen=true">切换身份</button></view></view><button v-if="isOrdinary" class="business-switch ordinary-superior" @click="openId('superior')"><image src="/static/common/icon-superior-muted.png" mode="aspectFit"/><text>上级</text></button><button v-else class="business-switch" @click="moduleOpen=true"><image src="/static/common/icon-switch.png" mode="aspectFit"/><text>切换模块</text></button></view><view v-if="context.module==='wholesale'" class="business-card rank-card"><text class="business-badge">当前等级</text><view class="rank-title">{{overview.levelName}}</view><text class="business-muted">{{overview.rankDescription || '尊享合伙权益'}}</text><view v-if="needsEntitlementOpen" class="rank-footer"><text class="business-muted">您暂未开通权益收益费</text></view><view v-else-if="overview.partnerStatus!=='NONE'" class="rank-footer"><text class="business-muted">{{annualExpiryLabel}}</text><view v-if="canShowPromotion" class="rank-links"><button @click="openId('promotion')">晋升任务</button></view></view></view><button v-if="context.module==='wholesale'&&needsEntitlementOpen" class="annual-open" :disabled="entitlementBusy" @click="openAnnualConfirm">{{annualOpenButtonLabel}}</button><view v-if="context.module==='costore'" class="business-card business-store"><image src="/static/partner/icon-store-info.png" mode="aspectFit"/><view><view class="business-name">{{context.store?.name||context.label}}</view><text class="business-muted">{{context.store?.number}} {{context.store?.fullAddress || context.store?.address}}</text><text class="business-muted">{{context.validUntil?`有效期至 ${context.validUntil.slice(0,10)}`:'有效期以后台为准'}}</text><button class="business-text-button" @click="contextOpen=true">切换门店</button></view></view><view v-if="context.module==='agency'" class="business-relations"><button @click="showRelation('superior')"><text>区域上级</text><view>{{overview.superior?.name||'暂未提供'}}</view></button><button @click="showRelation('referrer')"><text>推荐人</text><view>{{overview.referrer?.name||'暂未提供'}}</view></button></view><FeaturePageSkeleton v-if="status==='shell'" variant="dashboard-body"/><view v-if="status==='ready' && !isOrdinary && !annualLocked" class="business-tool-grid" :class="{compact:context.module!=='wholesale'}"><button v-for="item in (overview.partnerStatus==='NONE'?[]:homeTools)" :key="item.id" @click="openTool(item)"><image :src="item.icon" mode="aspectFit"/><text>{{item.label}}</text></button></view><view v-if="status==='ready' && !isOrdinary && !annualLocked && !tools.length" class="business-muted business-empty">当前身份暂无经营功能权限</view><view v-if="status==='ready' && context.module==='wholesale' && overview.partnerStatus!=='NONE' && !annualLocked" class="business-stats"><button @click="openId('team')"><text>团队人数</text><text v-if="!teamCountPending" class="business-stat-value">{{teamCountLabel}}</text><MetricSkeleton v-else size="block" :inline="false"/><text class="business-stat-link">服务商明细<text class="business-stat-arrow">▶</text></text></button><button @click="openId('quota-ledger')"><text>剩余VIP</text><text v-if="!quotaCountPending" class="business-stat-value">{{quotaCountLabel}}</text><MetricSkeleton v-else size="block" :inline="false"/><text class="business-stat-link">进货明细<text class="business-stat-arrow">▶</text></text></button><button @click="openId('quota-transfers')"><text>已划拨VIP</text><text v-if="!transferredCountPending" class="business-stat-value">{{transferredCountLabel}}</text><MetricSkeleton v-else size="block" :inline="false"/><text class="business-stat-link">划转明细<text class="business-stat-arrow">▶</text></text></button></view><view v-if="status==='ready'" class="business-benefits"><view class="business-section-title"><view class="benefits-rule" aria-hidden="true"/><text class="benefits-spark">✦</text><text class="benefits-label">等级权益</text><text class="benefits-spark">✦</text><view class="benefits-rule" aria-hidden="true"/></view><view v-if="overview.benefits.length>1" class="business-benefit-tabs"><button v-for="item in overview.benefits" :key="item.id" :class="{selected:tierId===item.id}" @click="tierId=item.id"><text>{{item.label}}</text></button></view><view v-if="benefit" class="business-benefit-panel"><view class="business-benefit-panel-glow" aria-hidden="true"/><view class="business-benefit-panel-head"><text class="business-benefit-tier">{{benefitTitle}}</text><text class="business-benefit-tier-hint">合伙人权益说明</text></view><ManagedRichContent :content="benefit.content"/></view><EmptyState v-if="context.module==='wholesale' && !benefit?.content?.nodes?.length"/></view></template><view v-if="moduleOpen" class="business-mask" @click="moduleOpen=false"><view class="business-dialog" @click.stop><view class="business-dialog-title">切换模块<button aria-label="关闭模块切换" @click="moduleOpen=false"><image src="/static/common/icon-close.png" mode="aspectFit"/></button></view><view class="business-module-options" :style="moduleGridStyle"><button v-for="item in modules" :key="item.id" @click="switchModule(item.id)"><image :src="item.icon" mode="aspectFit"/><text>{{item.label}}</text><text v-if="context?.module===item.id" class="business-muted">当前身份</text></button></view></view></view><view v-if="contextOpen" class="feature-mask" @click="contextOpen=false"><view class="feature-sheet" @click.stop><view class="panel-heading">{{context.module==='costore'?'切换门店':'切换身份'}}<button class="close-feature" aria-label="关闭身份选择" @click="contextOpen=false"><image src="/static/common/icon-close.png" mode="aspectFit"/></button></view><button v-for="item in moduleContexts" :key="item.id" class="business-context-option" @click="switchContext(item.id)"><view>{{item.label}}</view><text>{{item.scopeLabel||item.store?.address||item.validUntil?.slice(0,10)}}</text><image :src="item.id===context.id?'/static/common/icon-radio-checked.png':'/static/common/icon-radio-unchecked.png'" mode="aspectFit"/></button></view></view><view v-if="relationOpen" class="business-mask business-relation-mask" @click="relationOpen=null"><view class="business-relation-dialog" @click.stop><button class="business-relation-close" aria-label="关闭关系信息" @click="relationOpen=null">×</button><view class="business-relation-title">{{relationTitle}}</view><view class="business-relation-profile"><view class="business-relation-avatar">{{(relation.name||"").slice(0,1)}}</view><view><view>{{relation.name||"暂未提供"}}</view><text>{{relation.scopeLabel||"信息待后台提供"}}</text></view></view><text class="business-relation-note">关系与授权范围由后台确认</text></view></view><view v-if="entitlementConfirm" class="business-mask business-entitlement-mask" @click="!entitlementBusy && (entitlementConfirm=false)"><view class="business-entitlement-dialog" @click.stop><view class="business-entitlement-title">确认支付<template v-if="!entitlementFeePending">{{entitlementFeeLabel}}</template><MetricSkeleton v-else size="compact"/>元开通权益收益费吗？开通以后可享受多项权益</view><view class="business-entitlement-actions"><button class="business-entitlement-cancel" :disabled="entitlementBusy" @click="entitlementConfirm=false">取消</button><button class="business-entitlement-ok" :disabled="entitlementBusy||entitlementFeePending" @click="confirmAnnualEntitlement">{{entitlementBusy?'处理中…':'确定'}}</button></view></view></view><WholesaleReport v-if="wholesaleOverlay" :key="wholesaleOverlay" :tool-id="wholesaleOverlay" :page-query="overlayQuery" overlay @close="wholesaleOverlay=''"/><AppTabBar active="partners"/></view></template>
<script setup>
import {ref,computed,onMounted,onUnmounted} from 'vue'
import {config} from '../config'
import {useAuth} from '../composables/useAuth'
import {useAppTabBar} from '../composables/useAppTabBar'
import {businessModules,businessPreview,businessHomeTools} from '../features/business/catalog'
import {isOrdinaryAccount} from '../features/business/account-rank'
import {money} from '../features/exclusive/format'
import {getSession} from '../services/api'
import {getBusinessContexts,getBusinessContext,getBusinessOverview,selectBusinessContext} from '../services/business'
import {prefetchPartnerWorkspace,scheduleIdle} from '../services/prefetch'
import {getWholesaleBenefitCatalog} from '../services/partner-catalog'
import {createEntitlementFeeOrder} from '../services/entitlement-fee'
import {isMetricPending,pickMetricNumber} from '../features/business/metric-display'
import FeaturePageState from './FeaturePageState.vue'
import FeaturePageSkeleton from './FeaturePageSkeleton.vue'
import MetricSkeleton from './MetricSkeleton.vue'
import SilentRefreshBar from './SilentRefreshBar.vue'
import ManagedRichContent from './ManagedRichContent.vue'
import AppTabBar from './AppTabBar.vue'
import AgencyDashboard from './AgencyDashboard.vue'
import CostoreDashboard from './CostoreDashboard.vue'
import EmptyState from './EmptyState.vue'
import WholesaleReport from './WholesaleReport.vue'
const props=defineProps({initialModule:{type:String,default:''}})
useAuth();useAppTabBar()
const preview=businessPreview(config),status=ref('loading'),error=ref(''),refreshing=ref(false),overview=ref(null),contexts=ref([]),tierId=ref(''),moduleOpen=ref(false),contextOpen=ref(false),relationOpen=ref('')
const avatarFailed=ref(false),entitlementConfirm=ref(false),entitlementBusy=ref(false)
const entitlementFeeValue=computed(()=>pickMetricNumber(overview.value?.entitlement?.amount,overview.value?.entitlementAmount))
const entitlementFeePending=computed(()=>entitlementFeeValue.value==null)
const entitlementFee=computed(()=>entitlementFeeValue.value)
const entitlementFeeLabel=computed(()=>entitlementFeePending.value?'':money(entitlementFeeValue.value))
const annualOpenButtonLabel=computed(()=>{
  if(overview.value?.annualOpenLabel)return overview.value.annualOpenLabel
  if(entitlementFeePending.value)return '开通/续费权益'
  return `开通/续费 ${entitlementFeeLabel.value} 元权益`
})
const isOrdinary=computed(()=>overview.value?.context?.module==='wholesale' && isOrdinaryAccount(overview.value?.displayId, overview.value?.partnerStatus, overview.value?.isPartner))
const displayName=computed(()=>{
  const row=overview.value||{}
  return String(row.name||row.nickname||row.userName||row.profileName||'').trim()
    ||String(getSession()?.user?.name||getSession()?.user?.nickname||'').trim()
    ||String(row.displayId||'').trim()
    ||'用户'
})
const entitlementCanOpen=computed(()=>overview.value?.entitlement?.canOpen===true || overview.value?.canOpenEntitlement===true || overview.value?.canOpenEntitlement===1)
const entitlementOpened=computed(()=>overview.value?.entitlementOpened??overview.value?.entitlement?.entitlementOpened)
const needsEntitlementOpen=computed(()=>{
  if(!entitlementCanOpen.value)return false
  return entitlementOpened.value!==1 && entitlementOpened.value!=='1'
})
const annualLocked=computed(()=>needsEntitlementOpen.value)
function formatAnnualUntil(value){
  if(value==null||value==='')return ''
  const time=typeof value==='number'?value:(typeof value==='string'&&/^\d+$/.test(value.trim())?Number(value):Date.parse(value))
  if(!Number.isFinite(time))return String(value).slice(0,10)
  const date=new Date(time),pad=n=>String(n).padStart(2,'0')
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`
}
const annualExpiryLabel=computed(()=>overview.value?.annualValidUntil ? `权益到期：${formatAnnualUntil(overview.value.annualValidUntil)}` : overview.value?.annualRemainingDays==null ? '' : `权益将在${overview.value.annualRemainingDays}天后到期`)
const wholesaleOverlay=ref(''),agencyRef=ref(null),costoreRef=ref(null),overlayQuery=computed(()=>({contextId:context.value?.id}))
let epoch=0,contextId='',switching=false
const storeBindingMissing=computed(()=>overview.value?.storeBindingRequired===true&&overview.value?.storeBound===false)
const homeTools=computed(()=>storeBindingMissing.value?[]:businessHomeTools(tools.value,context.value,overview.value?.partnerStatus,overview.value?.globalAwardEligibility))
const BENEFIT_FULL_LABELS={ 'DEMO-VIP':'小批发商',小批:'小批发商',VIP:'小批发商','DEMO-ANGEL':'中批发商',中批:'中批发商',天使:'中批发商','DEMO-BOARD':'大批发商',大批:'大批发商',私董:'大批发商','DEMO-FOUNDER':'总批发商',总批:'总批发商',联创:'总批发商' }
const context=computed(()=>overview.value?.context),moduleInfo=computed(()=>businessModules.find(item=>item.id===context.value?.module)),modules=computed(()=>businessModules.filter(item=>contexts.value.some(ctx=>ctx.module===item.id))),moduleGridStyle=computed(()=>({gridTemplateColumns:`repeat(${Math.min(Math.max(modules.value.length,1),3)},minmax(0,1fr))`})),moduleContexts=computed(()=>contexts.value.filter(item=>item.module===context.value?.module)),tools=computed(()=>overview.value?.tools||[]),benefit=computed(()=>overview.value?.benefits.find(item=>item.id===tierId.value)),benefitTitle=computed(()=>{const item=benefit.value;if(!item)return '';return BENEFIT_FULL_LABELS[item.id]||BENEFIT_FULL_LABELS[item.label]||item.label}),relation=computed(()=>overview.value?.[relationOpen.value]||{}),relationTitle=computed(()=>relationOpen.value==='superior'?'区域上级':'推荐人')
const canShowPromotion=computed(()=>String(overview.value?.rawLevelName||context.value?.levelName||'')!=='联创合伙人')
// Pending metrics render MetricSkeleton; finite 0 from API still shows "0".
const metricsSettled=computed(()=>status.value==='ready')
const teamCountValue=computed(()=>pickMetricNumber(overview.value?.team?.summary?.memberCount,overview.value?.teamCount,overview.value?.showcaseTeamCount))
const quotaCountValue=computed(()=>pickMetricNumber(overview.value?.vipDetails?.remainingCount,overview.value?.quota,overview.value?.showcaseQuota))
const transferredCountValue=computed(()=>pickMetricNumber(overview.value?.transferred,overview.value?.transferredCount,overview.value?.transferredVip,overview.value?.quotaTransferred,overview.value?.vipDetails?.transferredCount,overview.value?.vipDetails?.transferred,overview.value?.showcaseTransferred))
const teamCountPending=computed(()=>isMetricPending(teamCountValue.value,{settled:metricsSettled.value}))
const quotaCountPending=computed(()=>isMetricPending(quotaCountValue.value,{settled:metricsSettled.value}))
const transferredCountPending=computed(()=>isMetricPending(transferredCountValue.value,{settled:metricsSettled.value}))
const teamCountLabel=computed(()=>teamCountPending.value?'':String(teamCountValue.value??0))
const quotaCountLabel=computed(()=>quotaCountPending.value?'':String(quotaCountValue.value??0))
const transferredCountLabel=computed(()=>transferredCountPending.value?'':String(transferredCountValue.value??0))
function paintWholesaleShell(selected,rows){
  contexts.value=rows
  contextId=selected.id
  const session=getSession()
  overview.value={
    context:selected,
    benefits:[],
    tools:[],
    name:session?.user?.name||session?.user?.nickname||'',
    displayId:session?.user?.displayId||session?.user?.id||'',
    inviteCode:session?.user?.inviteCode||'',
    levelName:selected.levelName||'',
  }
  avatarFailed.value=false
  status.value='shell'
}
async function load(options={}){
  const force=options.force===true
  const current=++epoch
  const silent=!force&&status.value==='ready'&&!!overview.value
  error.value=''
  if(silent)refreshing.value=true
  else{
    refreshing.value=false
    moduleOpen.value=false
    contextOpen.value=false
    relationOpen.value=''
    wholesaleOverlay.value=''
    entitlementConfirm.value=false
    if(!(status.value==='shell'&&overview.value?.context))status.value='loading'
  }
  try{
    const rows=await getBusinessContexts()
    const preferredModule=contextId?null:(props.initialModule||'wholesale')
    const selected=await getBusinessContext(preferredModule,contextId||undefined)
    if(!contextId&&selected.module==='wholesale'){
      try{await selectBusinessContext(selected.id)}catch{/* keep local selection even if persistence fails */}
    }
    if(current!==epoch)return
    // Agency/costore dashboards load their own overview; hand off as soon as context is known.
    if(selected.module==='agency'||selected.module==='costore'){
      contextId=selected.id
      contexts.value=rows
      overview.value={context:selected,benefits:[],tools:[]}
      avatarFailed.value=false
      status.value='ready'
      return
    }
    if(!silent)paintWholesaleShell(selected,rows)
    else{
      contexts.value=rows
      contextId=selected.id
    }
    let result=await getBusinessOverview(selected.module,selected.id)
    if(selected.module==='wholesale'){
      try{
        const benefits=await getWholesaleBenefitCatalog()
        if(benefits)result={...result,benefits}
      }catch(reason){
        console.warn('[partner benefits] 等级权益读取失败，保留概览数据：',reason?.message||reason)
        if(!result.benefits?.some(item=>item?.content?.nodes?.length))uni.showToast({title:reason?.message||'等级权益加载失败',icon:'none'})
      }
    }
    if(current!==epoch)return
    contextId=selected.id
    contexts.value=rows
    overview.value=result
    avatarFailed.value=false
    tierId.value=result.benefits.some(item=>item.id===tierId.value)?tierId.value:result.benefits[1]?.id||result.benefits[0]?.id||''
    status.value='ready'
    scheduleIdle(()=>prefetchPartnerWorkspace(result))
  }catch(reason){
    if(current===epoch){
      error.value=reason.message||'工作台加载失败'
      if(!silent||!overview.value?.accountId)status.value=reason.code==='FORBIDDEN'?'forbidden':'error'
    }
  }finally{
    if(current===epoch)refreshing.value=false
  }
}
async function switchContext(id){if(switching)return;switching=true;moduleOpen.value=false;contextOpen.value=false;try{const selected=await selectBusinessContext(id);contextId=selected.id;await load()}catch(reason){uni.showToast({title:reason.message||'身份切换未完成，请稍后重试',icon:'none'})}finally{switching=false}}
function switchModule(module){const selected=contexts.value.find(item=>item.module===module);if(selected)switchContext(selected.id)}
function openTool(item){if(context.value.module==='wholesale' && ['superior','promotion','share'].includes(item.id)){wholesaleOverlay.value=item.id;return}uni.navigateTo({url:`${item.path}?contextId=${encodeURIComponent(context.value.id)}`})}
function openId(id){if(storeBindingMissing.value&&['team','quota-ledger','quota-transfers','income','withdrawals','quota-transfer','upgrade'].includes(id)){uni.navigateTo({url:'/pages/partner/bind-store'});return}const item=tools.value.find(item=>item.id===id);if(item)openTool(item);else uni.showToast({title:'当前身份暂无此功能权限',icon:'none'})}
function openAnnualConfirm(){if(entitlementBusy.value)return;entitlementConfirm.value=true}
async function confirmAnnualEntitlement(){
  if(entitlementBusy.value||entitlementFeePending.value)return
  entitlementBusy.value=true
  try{
    const result=await createEntitlementFeeOrder(entitlementFee.value)
    entitlementConfirm.value=false
    if(result?.status==='SUCCEEDED'&&!result?.orderId){
      uni.showToast({title:'开通成功',icon:'success'})
      await load()
      return
    }
    const orderId=String(result?.orderId||'').trim()
    if(!orderId)throw new Error('未返回支付订单，请稍后重试')
    uni.navigateTo({url:`/pages/payment/cashier?orderId=${encodeURIComponent(orderId)}`})
  }catch(reason){
    uni.showToast({title:reason?.message||'开通失败，请稍后重试',icon:'none'})
  }finally{
    entitlementBusy.value=false
  }
}
function copyInvite(){const code=String(overview.value?.inviteCode||'').trim();if(!code)return;uni.setClipboardData({data:code,success:()=>uni.showToast({title:'邀请码已复制',icon:'success'}),fail:()=>uni.showToast({title:'复制失败，请重试',icon:'none'})})}
function showRelation(kind){relationOpen.value=kind}
function leaveAgency(id){if(id)contextId=id;return load()}
function enterWholesale(){contextId='';return load()}
function refresh(options){
  if((status.value==='ready'||status.value==='shell')&&context.value?.module==='agency'&&agencyRef.value)return agencyRef.value.refresh?.(options)
  if((status.value==='ready'||status.value==='shell')&&context.value?.module==='costore'&&costoreRef.value)return costoreRef.value.refresh?.(options)
  return load(options)
}
onMounted(()=>load());onUnmounted(()=>{++epoch});defineExpose({refresh,enterWholesale})
</script>
<style>@import '../styles/account.css';@import '../styles/exclusive.css';@import '../styles/business.css';</style>

<style scoped>
.wholesale-dashboard{padding-bottom:0}.wholesale-dashboard .business-header{padding:calc(1.1em + var(--status-bar-height,0px)) 1.05em .8em}.wholesale-dashboard .business-identity{padding:1em 1.05em 1.2em}.wholesale-dashboard .business-avatar{width:3.5em;height:3.5em}.wholesale-dashboard .business-name{font-size:1.25em}.wholesale-dashboard .business-muted{color:#909ab5;font-size:.8em}.wholesale-dashboard .business-card{margin:.5em 1.05em 1em;border:1rpx solid #437acba0;border-radius:.85em;background:linear-gradient(130deg,#244b8c,#1d284f 65%);padding:1em 1.1em .7em;min-height:7.3em;box-sizing:border-box}.wholesale-dashboard .rank-title{width:fit-content;padding:.1em 0 .4em;font-family:"YouSheBiaoTiHei",sans-serif;font-size:1.4em;font-weight:400;font-style:normal;background:linear-gradient(198.03200871141655deg,#59AEFF 0%,#E6F1FF 56%,#59AEFF 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}.wholesale-dashboard .business-badge{font-size:.85em;color:#001975;padding:.3em .75em;border-radius:0 24rpx 0 24rpx;background:linear-gradient(135deg,#1AABFF 0%,#4056FF 100%)}.rank-footer{display:flex;align-items:center;justify-content:space-between;gap:.7em;margin-top:2em}.wholesale-dashboard .rank-links{margin:0;gap:.9em;flex-shrink:0}.wholesale-dashboard .rank-links button{font-size:.75em;color:#7bbcff}.wholesale-dashboard .business-tool-grid{padding:.5em 1.05em 1em;gap:.5em}.wholesale-dashboard .business-tool-grid image{width:2.2em;height:2.2em}.wholesale-dashboard .business-tool-grid button{font-size:.85em;gap:.3em}.wholesale-dashboard .business-stats{padding:0 1.05em 1em;gap:.6em;flex-wrap:nowrap}.wholesale-dashboard .business-stats button{padding:.6em .2em .15em;min-width:0;gap:.1em;box-sizing:border-box;border-radius:16rpx 16rpx 0 0;background:linear-gradient(180deg,rgba(63,108,213,.5) 0%,rgba(63,108,213,.27) 19.14%,rgba(63,108,213,.18) 43.83%,rgba(63,108,213,0) 100%);border:0;box-shadow:none;font-size:.85em}.wholesale-dashboard .business-stats button>text:first-child{color:#939db9;font-size:.8em}.wholesale-dashboard .business-stats button>text:last-child{display:inline-flex;align-items:center;justify-content:center;align-self:center;margin-top:.4em;padding:2rpx 18rpx;width:auto;min-width:0;line-height:1.6;font-size:.8em;font-weight:600;box-sizing:border-box;border:0;background:linear-gradient(90deg,rgba(102,187,255,0) 0%,rgba(102,187,255,.55) 12%,rgba(102,187,255,.55) 40%,rgba(102,187,255,.28) 45%,rgba(102,187,255,0) 55%,rgba(102,187,255,0) 100%) top/100% 2rpx no-repeat,linear-gradient(270deg,rgba(102,187,255,0) 0%,rgba(102,187,255,.55) 12%,rgba(102,187,255,.55) 40%,rgba(102,187,255,.28) 45%,rgba(102,187,255,0) 55%,rgba(102,187,255,0) 100%) bottom/100% 2rpx no-repeat,linear-gradient(270deg,rgba(74,123,255,0) 0%,rgba(74,123,255,.5) 52.65%,rgba(74,123,255,0) 100%);color:#c5e1ff}.wholesale-dashboard .business-stat-arrow{margin-left:6rpx;font-size:.62em;font-weight:600;line-height:1;color:#e7f2ff}.wholesale-dashboard .business-stat-value{font-size:1.4em;line-height:1.2;font-weight:600;color:#59B6FF}.wholesale-dashboard .business-benefits{margin:0 0 .9em;padding:1.4em 1.05em 1.35em;border-radius:1.3em;min-height:0;height:auto;flex:none;background:radial-gradient(ellipse 70% 28% at 50% 0,rgba(64,140,255,.18),transparent 70%),linear-gradient(180deg,#2a3763 0%,#22274d 100%);box-shadow:inset 0 1rpx rgba(186,220,255,.18)}.wholesale-dashboard .business-section-title{display:flex;align-items:center;justify-content:center;gap:.35em;font-size:1em;margin-bottom:1em}.benefits-rule{flex:1;max-width:3.2em;height:1rpx;background:linear-gradient(90deg,transparent,rgba(180,214,255,.55),transparent)}.benefits-label{display:inline-block;letter-spacing:.12em;background:linear-gradient(45.0000000000006deg,#DBCAFF 0%,#FFFCEF 39%,#C0E3F0 100%);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent}.benefits-spark{display:inline-block;font-size:.75em;padding:0 .2em;background:linear-gradient(135deg,#DBCAFF 0%,#FFFCEF 39.23%,#C0E3F0 100%);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent}.wholesale-dashboard .business-benefit-tabs{gap:.45em;flex-wrap:nowrap;margin-bottom:.95em;padding:.28em;border-radius:999px;background:rgba(12,20,46,.38);border:1rpx solid rgba(120,168,230,.18)}.wholesale-dashboard .business-benefit-tabs button{padding:.18em .1em;font-size:.85em;line-height:1.75;border-radius:999px;background:transparent;color:#8fa0bf;border:0;box-shadow:none}.wholesale-dashboard .business-benefit-tabs button.selected{color:#fff;font-weight:600;background:linear-gradient(135deg,#0a6dff 0%,#00a8ff 100%);box-shadow:0 6rpx 18rpx rgba(0,140,255,.35)}.wholesale-dashboard .business-benefit-panel{position:relative;overflow:hidden;margin-bottom:.4em;padding:1em 1em 1.15em;border-radius:1em;border:1rpx solid rgba(120,176,240,.28);background:linear-gradient(165deg,rgba(48,78,138,.55) 0%,rgba(28,38,72,.88) 100%);box-shadow:inset 0 1rpx rgba(210,232,255,.16)}.wholesale-dashboard .business-benefit-panel-glow{position:absolute;left:12%;right:12%;top:0;height:2.2em;background:radial-gradient(ellipse at 50% 0,rgba(90,180,255,.28),transparent 72%);pointer-events:none}.wholesale-dashboard .business-benefit-panel-head{position:relative;z-index:1;display:flex;align-items:baseline;justify-content:space-between;gap:.6em;margin-bottom:.75em;padding-bottom:.55em;border-bottom:1rpx solid rgba(150,190,240,.18)}.wholesale-dashboard .business-benefit-tier{font-size:1.05em;font-weight:700;color:#eaf4ff;letter-spacing:.04em}.wholesale-dashboard .business-benefit-tier-hint{font-size:.72em;color:#8ea4c6}.wholesale-dashboard .business-benefit-panel :deep(.managed-content){position:relative;z-index:1;color:#d7e5f8;font-size:.92em;line-height:1.85}.wholesale-dashboard :deep(.empty-state){padding:2.5em 0 3em}.wholesale-dashboard :deep(.empty-state image){width:8em;height:8em}.wholesale-dashboard .business-dialog-title{justify-content:center;font-size:1.1em}.wholesale-dashboard .business-dialog-title button{position:absolute;right:1em;top:1em}.wholesale-dashboard .business-dialog{position:relative;padding:1.5em 1em}.wholesale-dashboard .business-module-options image{width:2.5em;height:2.5em}.wholesale-dashboard .business-module-options button{font-size:.85em}.wholesale-dashboard .business-module-options .business-muted{display:none}.annual-open{display:block;margin:0 1.05em 1em;border-radius:3em;background:linear-gradient(100deg,#074bff,#00a4ff);color:#fff;line-height:2.8;font-size:1em}.annual-open[disabled]{opacity:.7}.business-entitlement-mask{align-items:center;z-index:120}.business-entitlement-dialog{width:min(88vw,22em);padding:1.7em 1.1em 1em;border-radius:40rpx;background:linear-gradient(180deg,#2A3357 0%,#202944 100%);box-sizing:border-box}.business-entitlement-title{padding:0 .4em 1.15em;text-align:center;font-size:1.05em;font-weight:600;line-height:1.55;color:#fff}.business-entitlement-actions{display:flex;gap:.2em}.business-entitlement-actions button{flex:1;margin:0;padding:0;background:transparent;border-radius:0;line-height:2.5;font-size:1.05em}.business-entitlement-cancel{color:#e8eef8}.business-entitlement-ok,.business-entitlement-ok[disabled]{color:#2f7bff;font-weight:600;opacity:1}
@media(max-width:340px){.rank-footer{flex-wrap:wrap;margin-top:1.2em}.wholesale-dashboard .business-identity{gap:.5em}.wholesale-dashboard .business-person{gap:.6em}.wholesale-dashboard .business-invite{font-size:.7em}.wholesale-dashboard .business-name{font-size:1.1em}}
/* Design pages 18/54: overview uses a lit edge, while statistics fade downward. */
.wholesale-dashboard .business-card{background:radial-gradient(ellipse at 8% 0,rgba(104,183,255,.38),transparent 48%),linear-gradient(145deg,#385d9d 0%,#263e70 37%,#172443 100%);box-shadow:inset 0 1rpx rgba(207,236,255,.42),0 12rpx 24rpx rgba(8,18,47,.2)}.business-page:not(.wholesale-dashboard) .business-stats button{background:linear-gradient(180deg,#4e6da5 0%,#304978 45%,#192542 100%);box-shadow:inset 0 1rpx rgba(222,240,255,.28),0 8rpx 18rpx rgba(6,13,36,.16)}.business-page:not(.wholesale-dashboard) .business-relations button{border-radius:.85em;border:1rpx solid rgba(109,160,223,.36);background:linear-gradient(180deg,#4b6798 0%,#324975 48%,#1e2b49 100%);box-shadow:inset 0 1rpx rgba(220,239,255,.22)}.business-relation-mask{align-items:center}.business-relation-dialog{position:relative;width:min(88vw,25em);padding:2.5em 1.6em 1.5em;border-radius:1.3em;border:1rpx solid rgba(141,193,255,.58);background:radial-gradient(ellipse at 50% 0,rgba(105,181,255,.28),transparent 52%),linear-gradient(155deg,#405f96 0%,#303d64 48%,#252d4d 100%);box-shadow:0 1.5em 4em rgba(0,0,0,.52),inset 0 1rpx rgba(234,246,255,.38)}.business-relation-close{position:absolute;right:.8em;top:.55em;margin:0;padding:.1em .4em;background:none;color:#d9eaff;font-size:1.7em;line-height:1}.business-relation-title{text-align:center;font-size:1.2em;font-weight:700;letter-spacing:.1em}.business-relation-profile{display:flex;align-items:center;gap:.9em;min-height:5.5em;margin:1.6em 0 .9em;padding:1em;border-radius:.8em;border:1rpx solid rgba(148,197,255,.23);background:linear-gradient(180deg,rgba(106,141,192,.75),rgba(48,60,96,.95));box-shadow:inset 0 1rpx rgba(240,248,255,.2)}.business-relation-avatar{width:3.2em;height:3.2em;display:flex;align-items:center;justify-content:center;flex-shrink:0;border-radius:50%;background:linear-gradient(145deg,#a3dcff,#3d62ac);color:#162851;font-size:1.25em;font-weight:700}.business-relation-profile>view:last-child{min-width:0;font-size:1.1em;font-weight:600;overflow-wrap:anywhere}.business-relation-profile text,.business-relation-note{display:block;color:#adc0dc;font-size:.82em;font-weight:400;line-height:1.7}.business-relation-note{padding-top:.8em;border-top:1rpx solid rgba(180,210,246,.2);text-align:center}
</style>

<style scoped>
.business-avatar image{width:100%;height:100%;border-radius:50%}
.wholesale-dashboard .business-profile-meta{gap:.25em .8em;margin-top:.2em}.wholesale-dashboard .business-profile-meta>.business-muted,.wholesale-dashboard .business-profile-meta .business-invite{color:#909ab5;font-size:.8em;line-height:1.5}
.ordinary-dashboard{display:flex;flex-direction:column;background:#121a3b;font-size:clamp(14px,4vw,16px);width:100%;max-width:750rpx}.ordinary-dashboard :deep(.app-tabbar){max-width:750rpx;margin:0 auto;box-sizing:border-box}.ordinary-dashboard .business-background{display:none}.ordinary-dashboard{background:radial-gradient(ellipse 90% 35% at 95% 0,#20558e 0,transparent 80%),#121a3b}.ordinary-dashboard .business-header{padding:calc(24rpx + var(--status-bar-height,0px)) 32rpx 0;min-height:64rpx;font-size:1.067em;box-sizing:content-box}.ordinary-dashboard .business-identity{padding:48rpx 40rpx;gap:16rpx}.ordinary-dashboard .business-person{gap:16rpx;flex:1}.ordinary-dashboard .business-avatar{width:104rpx;height:104rpx}.ordinary-dashboard .business-name{font-size:1.2em;line-height:1.5}.ordinary-dashboard .business-profile-meta{gap:20rpx;margin-top:8rpx}.ordinary-dashboard .business-muted{color:#8e96b0;font-size:.8em;line-height:1.5}.ordinary-dashboard .business-invite{font-size:.8em;color:#8e96b0;gap:10rpx;line-height:1.5}.ordinary-dashboard .ordinary-superior{color:#8e96b0;font-size:.8em}.ordinary-dashboard .ordinary-superior image{width:40rpx;height:40rpx;margin-bottom:8rpx}.ordinary-dashboard .rank-card{margin:0 32rpx 40rpx;padding:28rpx 30rpx;min-height:256rpx;border-radius:24rpx;border:2rpx solid #2f4d87;border-bottom-color:#25325e;background:linear-gradient(125deg,#1d559c 0,#1b2850 48%,#1c284e 100%);box-shadow:none}.ordinary-dashboard .rank-title{width:fit-content;font-family:"YouSheBiaoTiHei",sans-serif;font-size:1.2em;font-weight:400;line-height:1.5;padding:0 0 8rpx;background:linear-gradient(198.03200871141655deg,#59AEFF 0%,#E6F1FF 56%,#59AEFF 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}.ordinary-dashboard .business-badge{font-size:.8em;line-height:48rpx;padding:0 18rpx;border-radius:0 24rpx 0 24rpx;background:linear-gradient(135deg,#1AABFF 0%,#4056FF 100%);color:#001975}.ordinary-dashboard .business-benefits{flex:none;box-sizing:border-box;min-height:0;height:auto;margin-bottom:24rpx;padding:40rpx 32rpx 36rpx;border-radius:40rpx;background:radial-gradient(ellipse 72% 30% at 50% 0,rgba(64,140,255,.2),transparent 70%),linear-gradient(180deg,#2a3763 0%,#22294f 100%);box-shadow:inset 0 1rpx rgba(186,220,255,.16)}.ordinary-dashboard .business-section-title{display:flex;align-items:center;justify-content:center;gap:10rpx;font-size:1em;line-height:40rpx;margin:0 0 28rpx}.ordinary-dashboard .benefits-rule{max-width:72rpx}.ordinary-dashboard .business-benefit-tabs{gap:8rpx;margin:0 0 24rpx;padding:6rpx;border-radius:999px;background:rgba(10,18,42,.42);border:1rpx solid rgba(120,168,230,.16)}.ordinary-dashboard .business-benefit-tabs button{min-width:0;font-size:.9em;line-height:56rpx;padding:0;border-radius:999px;background:transparent;color:#8b97b3;border:0;box-shadow:none}.ordinary-dashboard .business-benefit-tabs .selected{color:#fff;font-weight:600;background:linear-gradient(135deg,#0a6dff 0%,#00a8ff 100%);box-shadow:0 8rpx 20rpx rgba(0,140,255,.32)}.ordinary-dashboard .business-benefit-panel{position:relative;overflow:hidden;padding:28rpx 26rpx 32rpx;border-radius:24rpx;border:1rpx solid rgba(120,176,240,.26);background:linear-gradient(165deg,rgba(48,78,138,.52) 0%,rgba(28,38,72,.9) 100%);box-shadow:inset 0 1rpx rgba(210,232,255,.14)}.ordinary-dashboard .business-benefit-panel-glow{position:absolute;left:10%;right:10%;top:0;height:72rpx;background:radial-gradient(ellipse at 50% 0,rgba(90,180,255,.26),transparent 72%);pointer-events:none}.ordinary-dashboard .business-benefit-panel-head{position:relative;z-index:1;display:flex;align-items:baseline;justify-content:space-between;gap:16rpx;margin-bottom:20rpx;padding-bottom:16rpx;border-bottom:1rpx solid rgba(150,190,240,.16)}.ordinary-dashboard .business-benefit-tier{font-size:1.05em;font-weight:700;color:#eaf4ff;letter-spacing:.04em}.ordinary-dashboard .business-benefit-tier-hint{font-size:.72em;color:#8ea4c6}.ordinary-dashboard .business-benefit-panel :deep(.managed-content){position:relative;z-index:1;color:#d7e5f8;font-size:.92em;line-height:1.85}.ordinary-dashboard :deep(.empty-state){padding:100rpx 0 40rpx;gap:24rpx;font-size:1em;color:#8e96b0}.ordinary-dashboard :deep(.empty-state image){width:200rpx;height:200rpx}
@media(max-width:340px){.ordinary-dashboard .business-identity{padding-left:24rpx;padding-right:24rpx}.ordinary-dashboard .business-profile-meta{gap:6rpx}.ordinary-dashboard .business-name{font-size:1.1em}}
</style>
