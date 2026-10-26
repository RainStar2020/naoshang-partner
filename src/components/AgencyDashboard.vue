<template>
 <view class="agency-page feature-page">
  <image class="agency-background" src="/static/partner/bg-overview.png" mode="scaleToFill"/>
  <view class="agency-heading">{{moduleTitle}}</view>
  <FeaturePageState :status="status" :error="error" @retry="load"/>
  <template v-if="status==='ready' && overview">
   <view class="agency-identity">
    <view class="agency-identity-copy">
     <view class="agency-title-line"><text class="agency-title">{{agencyTitle}}</text><text v-if="isStore && storeNumber" class="agency-store-badge">{{storeNumber}}</text></view>
     <view class="agency-subtitle"><text>{{identityLabel}}</text><button @click="contextOpen=true"><text>切换</text><image src="/static/common/icon-switch-arrows.png" mode="aspectFit"/></button></view>
    </view>
    <button class="agency-switch" @click="moduleOpen=true"><image src="/static/common/icon-switch.png" mode="aspectFit"/><text>切换模块</text></button>
   </view>
   <view v-if="isStore" class="agency-shortcuts">
    <button v-for="item in storeShortcuts" :key="item.id" @click="openStoreShortcut(item)"><image :src="item.icon" mode="aspectFit"/><text>{{item.label}}</text></button>
   </view>
   <view v-else class="agency-summary">
    <button @click="open('team')"><image src="/static/partner/icon-team.png" mode="aspectFit"/><view><text>我的团队</text><strong>{{overview.teamCount ?? '—'}}人</strong></view></button>
    <view class="agency-summary-divider"/>
    <button @click="open('income')"><image src="/static/partner/icon-agency-income.png" mode="aspectFit"/><view><text>代理收益</text><strong>¥{{money(overview.agencyIncome ?? overview.available)}}</strong></view></button>
   </view>
   <view class="agency-relation-grid">
    <button v-for="kind in relations" :key="kind.key" class="agency-relation" @click="relationOpen=true">
     <view class="agency-relation-label">{{kind.label}}</view>
     <image v-if="overview[kind.key]?.avatarUrl" class="agency-relation-avatar" :src="overview[kind.key].avatarUrl" mode="aspectFill"/>
     <view v-else class="agency-avatar">{{(overview[kind.key]?.name || '—').slice(0,1)}}</view>
     <view class="agency-relation-copy"><view><text>{{overview[kind.key]?.name || '暂未提供'}}</text><em>{{overview[kind.key]?.agencyLabel || '—'}}</em></view><text>{{overview[kind.key]?.regionLabel || overview[kind.key]?.scopeLabel || '信息待后台提供'}}</text></view>
    </button>
   </view>
   <view class="agency-benefits">
    <view class="agency-benefit-title"><text>✦</text> 等级权益 <text>✦</text></view>
    <view class="agency-tiers"><button v-for="item in overview.benefits" :key="item.id" :class="{selected:tierId===item.id}" @click="tierId=item.id">{{item.label}}</button></view>
    <ManagedRichContent v-if="benefit" :content="benefit.content"/>
    <EmptyState v-if="!benefit?.content?.nodes?.length" text="这里还没有内容～"/>
   </view>
  </template>
  <view v-if="contextOpen" class="agency-identity-page">
   <view class="agency-identity-bar"><button aria-label="返回" @click="contextOpen=false"><image src="/static/common/icon-back.png" mode="aspectFit"/></button><text>切换身份</text></view>
   <view class="agency-identity-body">
    <view v-for="group in contextGroups" :key="group.key" class="agency-context-group">
     <text>{{group.label}}</text>
     <button v-for="item in group.items" :key="item.id" @click="chooseContext(item.id)">
      <view class="agency-context-main">
       <view class="agency-context-title"><text>{{contextTitle(item)}}</text><em v-if="item.store?.number">{{item.store.number}}</em></view>
       <text>{{contextSubtitle(item)}}</text>
      </view>
      <image src="/static/common/icon-chevron-right.png" mode="aspectFit"/>
     </button>
    </view>
   </view>
  </view>
  <view v-if="moduleOpen" class="agency-mask module-mask" @click="moduleOpen=false">
   <view class="agency-module-dialog" role="dialog" aria-label="切换模块" @click.stop>
    <view class="agency-module-title">切换模块<button aria-label="关闭模块切换" @click="moduleOpen=false"><image src="/static/common/icon-close.png" mode="aspectFit"/></button></view>
    <view class="agency-module-options"><button v-for="item in modules" :key="item.id" @click="switchModule(item.id)"><image :src="item.icon" mode="aspectFit"/><text>{{item.label}}</text></button></view>
   </view>
  </view>
  <view v-if="relationOpen" class="agency-mask relation-mask" @click="relationOpen=false">
   <view class="agency-relation-sheet" @click.stop>
    <button class="relation-close" aria-label="关闭关系信息" @click="relationOpen=false">×</button>
    <view v-for="kind in relations" :key="kind.key" class="relation-detail-card">
     <view class="relation-detail-copy">
      <view><text>{{overview[kind.key]?.name || '暂未提供'}}</text><em v-if="overview[kind.key]?.partnerLabel">{{overview[kind.key].partnerLabel}}</em></view>
      <text>{{relationIdentityLabel(kind.key)}}：{{overview[kind.key]?.rankLabel || overview[kind.key]?.agencyLabel || '—'}}</text>
      <text>联系方式：{{overview[kind.key]?.phone || '—'}}</text>
      <text>{{relationRegionLabel(kind.key)}}：{{overview[kind.key]?.regionLabel || overview[kind.key]?.scopeLabel || '—'}}</text>
     </view>
     <view class="relation-photo"><view class="relation-arch"><image v-if="overview[kind.key]?.avatarUrl" :src="overview[kind.key].avatarUrl" mode="aspectFill"/><view v-else>{{(overview[kind.key]?.name || '—').slice(0,1)}}</view></view><text>{{kind.sheetLabel}}</text></view>
    </view>
   </view>
  </view>
  <AppTabBar v-if="!contextOpen" active="partners"/>
 </view>
</template>

<script setup>
import {computed, onMounted, onUnmounted, ref} from 'vue'
import {useAuth} from '../composables/useAuth'
import {useAppTabBar} from '../composables/useAppTabBar'
import {money} from '../features/exclusive/format'
import {businessModules} from '../features/business/catalog'
import {getBusinessContext, getBusinessContexts, getBusinessOverview, selectBusinessContext} from '../services/business'
import FeaturePageState from './FeaturePageState.vue'
import ManagedRichContent from './ManagedRichContent.vue'
import EmptyState from './EmptyState.vue'
import AppTabBar from './AppTabBar.vue'
useAuth();useAppTabBar()
const emit=defineEmits(['left'])
const status=ref('loading'),error=ref(''),overview=ref(null),contexts=ref([]),allContexts=ref([]),tierId=ref(''),contextOpen=ref(false),relationOpen=ref(false),moduleOpen=ref(false)
let active=true,epoch=0,selectedId='',tierContextId=''
const moduleTitle=businessModules.find(item=>item.id==='agency')?.title||'代理中心'
const context=computed(()=>overview.value?.context)
const isStore=computed(()=>context.value?.agencyType==='STORE')
const storeNumber=computed(()=>context.value?.store?.number || '')
const agencyTitle=computed(()=>isStore.value ? (context.value?.store?.name || context.value?.regionLabel || '单店代理') : (context.value?.regionLabel || context.value?.label || '区域代理'))
const identityLabel=computed(()=>({PROVINCE:'省代',CITY:'市代',COUNTY:'区县代理',STORE:'单店代理'})[context.value?.agencyType] || '区域代理')
const storeShortcuts=[
  {id:'staff',label:'门店管理',icon:'/static/partner/icon-superior.png'},
  {id:'members',label:'门店会员',icon:'/static/partner/icon-membership-dividend.png',view:'members'},
  {id:'approvals',label:'门店审批',icon:'/static/partner/icon-costore-approval.png',view:'approvals'},
  {id:'info',label:'门店信息',icon:'/static/partner/icon-store-info.png',view:'info'},
  {id:'income',label:'代理收益',icon:'/static/partner/icon-agency-income.png'},
]
const benefit=computed(()=>overview.value?.benefits?.find(item=>item.id===tierId.value))
const relations=[{key:'superior',label:'区域上级',sheetLabel:'区县上级'},{key:'referrer',label:'推荐人',sheetLabel:'推荐人'}]
const typeMeta={PROVINCE:'省代',CITY:'市代',COUNTY:'区代',STORE:'单店'}
const tierLabel={STORE:'区县',COUNTY:'区县',CITY:'市代',PROVINCE:'省代'}
const contextGroups=computed(()=>['PROVINCE','CITY','COUNTY','STORE'].map(key=>({key,label:typeMeta[key],items:contexts.value.filter(item=>item.agencyType===key)})).filter(group=>group.items.length))
const modules=computed(()=>businessModules.filter(item=>allContexts.value.some(row=>row.module===item.id)))
function contextTitle(item){return item.agencyType==='STORE'?(item.store?.name||item.regionLabel||item.label):(item.regionLabel||item.label)}
function contextSubtitle(item){return item.agencyType==='STORE'?(item.store?.address||item.scopeLabel||''):({PROVINCE:'省代',CITY:'市代',COUNTY:'区县代理'}[item.agencyType]||item.scopeLabel||'')}
function relationIdentityLabel(key){return key==='superior'?'代理等级':'合伙等级'}
function relationRegionLabel(key){return key==='superior'?'代理地区':'所在地区'}
async function load(){const current=++epoch;status.value=overview.value?'ready':'loading';error.value='';contextOpen.value=false;relationOpen.value=false;moduleOpen.value=false;try{const rows=await getBusinessContexts();const ctx=await getBusinessContext('agency',selectedId||undefined);const result=await getBusinessOverview('agency',ctx.id);if(!active||current!==epoch)return;allContexts.value=rows;contexts.value=rows.filter(item=>item.module==='agency');overview.value=result;if(tierContextId!==ctx.id||!result.benefits.some(item=>item.id===tierId.value)){tierId.value=result.benefits.find(item=>item.label===tierLabel[ctx.agencyType])?.id||result.benefits[0]?.id||'';tierContextId=ctx.id}selectedId=ctx.id;status.value='ready'}catch(reason){if(active&&current===epoch){error.value=reason.message||'代理工作台加载失败';status.value=reason.code==='FORBIDDEN'?'forbidden':'error'}}}
async function chooseContext(id){try{const selected=await selectBusinessContext(id);selectedId=selected.id;await load()}catch(reason){uni.showToast({title:reason.message||'切换失败',icon:'none'})}}
async function switchModule(moduleId){if(moduleId===context.value?.module){moduleOpen.value=false;return}const selected=allContexts.value.find(item=>item.module===moduleId);if(!selected)return;try{const next=await selectBusinessContext(selected.id);moduleOpen.value=false;if(next.module!=='agency'){emit('left',next.id);const route=getCurrentPages().slice(-1)[0]?.route;if(route!=='pages/partners/index')uni.switchTab({url:'/pages/partners/index'});return}selectedId=next.id;await load()}catch(reason){uni.showToast({title:reason.message||'切换失败',icon:'none'})}}
function open(tool){uni.navigateTo({url:`/pages/agency/${tool}?contextId=${encodeURIComponent(context.value.id)}`})}
function openStoreShortcut(item){const id=context.value.id;if(item.id==='income'){open('income');return}const view=item.view?`&view=${item.view}`:'';uni.navigateTo({url:`/pages/store/index?contextId=${id}${view}`})}
onMounted(load);onUnmounted(()=>{active=false;++epoch})
defineExpose({refresh:load})
</script>

<style scoped>
.agency-page{position:relative;min-height:100vh;max-width:750px;margin:0 auto;box-sizing:border-box;background:radial-gradient(ellipse at 100% 0,#1f5c96 0,transparent 42%),#101b40;color:#edf4ff;font-size:clamp(14px,3.7vw,16px);line-height:1.5}
.agency-page button{margin:0;padding:0;background:none;color:inherit;line-height:inherit;font-size:inherit}
.agency-page button::after{border:0}
.agency-background{position:absolute;left:0;top:0;width:100%;height:22em;opacity:.45;z-index:0}
.agency-heading,.agency-identity,.agency-summary,.agency-shortcuts,.agency-relation-grid,.agency-benefits{position:relative;z-index:1}
.agency-heading{padding:calc(.85em + var(--status-bar-height,0px)) 6em .2em 1.15em;font-family:var(--font-page-title);font-size:1.15em;font-weight:700;line-height:1.6}
.agency-identity{display:flex;align-items:center;justify-content:space-between;gap:.8em;padding:1.15em 1.15em .7em}
.agency-identity-copy{min-width:0;flex:1}
.agency-title-line{display:flex;align-items:center;gap:.4em;min-width:0}
.agency-title{min-width:0;font-size:1.35em;font-weight:700;line-height:1.35;overflow-wrap:anywhere}
.agency-store-badge{flex:none;padding:0 .55em;border-radius:1em;background:linear-gradient(100deg,#00b7ff,#3157ff);color:#fff;font-size:.62em;font-weight:700;line-height:1.75}
.agency-subtitle{display:flex;align-items:center;gap:.7em;margin-top:.2em;color:#949fbd;font-size:.9em}
.agency-subtitle button{display:inline-flex;align-items:center;gap:.25em;color:#1eb6ff;font-size:1em}
.agency-subtitle image{width:1em;height:1em}
.agency-switch{flex:none;display:flex;flex-direction:column;align-items:center;gap:.15em;color:#edf4ff;font-size:.75em;line-height:1.3}
.agency-switch image{width:2.5em;height:2.5em}
.agency-shortcuts{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:.15em;padding:.35em .35em 1em}
.agency-shortcuts button{display:flex;flex-direction:column;align-items:center;gap:.35em;min-width:0}
.agency-shortcuts image{width:2.15em;height:2.15em}
.agency-shortcuts text{max-width:100%;font-size:clamp(10px,2.9vw,13px);line-height:1.25;text-align:center;white-space:nowrap}
.agency-summary{display:flex;align-items:center;margin:0 1.3em .9em}
.agency-summary button{display:flex;align-items:center;gap:.55em;flex:1;min-width:0;text-align:left}
.agency-summary image{width:2.15em;height:2.15em;flex:none}
.agency-summary button>view{display:flex;flex-direction:column;min-width:0}
.agency-summary button text{color:#bdc6db;font-size:.78em;line-height:1.35}
.agency-summary strong{font-size:1.15em;font-weight:700;line-height:1.35;white-space:nowrap}
.agency-summary-divider{width:1px;height:2.4em;margin:0 .35em;background:#6b779d;flex:none}
.agency-relation-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7em;padding:0 1em .9em}
.agency-relation{position:relative;display:block;min-width:0;min-height:5.6em;padding:2.15em .55em .55em;border:1px solid #4174d2;border-radius:.7em;background:linear-gradient(160deg,#254c91 0%,#17336a 48%,#152148 100%);box-shadow:inset 0 1px rgba(205,233,255,.28);text-align:left;overflow:visible}
.agency-relation-label{position:absolute;z-index:2;top:0;left:50%;transform:translate(-50%,-1px);padding:.18em .7em .22em;border-radius:0 0 .55em .55em;background:linear-gradient(90deg,#01b8f4,#315bff);color:#fff;font-size:.78em;font-weight:700;line-height:1.4;white-space:nowrap}
.agency-relation-avatar,.agency-avatar{position:absolute;top:2.15em;left:.55em;width:2.35em;height:2.35em;border:2px solid #69d7ff;border-radius:50%;background:#2f5da5;box-sizing:border-box}
.agency-avatar{display:flex;align-items:center;justify-content:center;color:#fff;font-size:.85em;font-weight:700}
.agency-relation-copy{min-width:0;margin-left:2.7em}
.agency-relation-copy>view{display:flex;align-items:center;gap:.3em;min-width:0}
.agency-relation-copy>view>text{min-width:0;font-size:.9em;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.agency-relation-copy em{flex:none;padding:.05em .45em;border-radius:1em;background:#ddecff;color:#23427a;font-size:.68em;font-style:normal;line-height:1.6}
.agency-relation-copy>text{display:block;margin-top:.25em;color:#aebbd8;font-size:.72em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.agency-benefits{min-height:18em;padding:1.1em 1em 1.2em;border-radius:1.3em 1.3em 0 0;background:linear-gradient(#293b68,#22294d)}
.agency-benefit-title{text-align:center;font-size:1em;font-weight:700}
.agency-benefit-title text{padding:0 .35em;color:#d7e6ff}
.agency-tiers{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.45em;margin:.85em 0 .4em}
.agency-tiers button{padding:.2em .15em;background:#445174;color:#a8b5cb;border-radius:2em;font-size:.85em;line-height:1.7}
.agency-tiers button.selected{background:radial-gradient(ellipse,#08284b 15%,#006ecb 70%,#1ac9ff);color:#fff;box-shadow:0 0 .45em #009fff}
.agency-identity-page{position:fixed;z-index:120;inset:0;display:flex;flex-direction:column;background:#2a314c;color:#fff}
.agency-identity-bar{display:flex;align-items:center;gap:.7em;min-height:3.2em;padding:calc(.6em + var(--status-bar-height,0px)) 6em .6em 1em;background:#343a5b;font-size:1.1em;font-weight:700}
.agency-identity-bar image{width:1.5em;height:1.5em}
.agency-identity-body{flex:1;overflow-y:auto;padding:.4em 1em 2em;max-width:750px;width:100%;margin:0 auto;box-sizing:border-box}
.agency-context-group{margin-top:.85em}
.agency-context-group>text{display:block;margin:0 0 .45em .15em;color:#9aa6c3;font-size:.9em}
.agency-context-group>button{display:flex;width:100%;align-items:center;gap:.8em;margin:0 0 .7em;padding:.85em .9em;border-radius:.7em;background:#3c4464;text-align:left}
.agency-context-main{min-width:0;flex:1}
.agency-context-title{display:flex;align-items:center;gap:.45em;min-width:0;font-size:1em;font-weight:600}
.agency-context-title>text{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.agency-context-title em{flex:none;padding:0 .55em;border-radius:1em;background:linear-gradient(100deg,#00b7ff,#3157ff);color:#fff;font-size:.72em;font-style:normal;line-height:1.7}
.agency-context-main>text{display:block;margin-top:.2em;color:#9aa6c3;font-size:.78em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.agency-context-group>button>image{width:1em;height:1em;flex:none;opacity:.8}
.agency-mask{position:fixed;z-index:120;top:0;right:0;bottom:0;left:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.78)}
.module-mask{align-items:center;justify-content:center;padding:1.5em;box-sizing:border-box}
.agency-module-dialog{width:100%;max-width:22em;box-sizing:border-box;padding:1.3em 1em 1.4em;border-radius:1.2em;background:#343c62}
.agency-module-title{position:relative;text-align:center;font-size:1.05em;font-weight:600;line-height:1.8}
.agency-module-title button{position:absolute;right:0;top:0}
.agency-module-title image{width:1.3em;height:1.3em}
.agency-module-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.4em;margin-top:1.1em}
.agency-module-options button{display:flex;flex-direction:column;align-items:center;gap:.45em;min-width:0;color:#d5e4ff;font-size:.85em}
.agency-module-options image{width:2.6em;height:2.6em}
.relation-mask{align-items:center;justify-content:center;padding:2.2em 1.4em;box-sizing:border-box}
.agency-relation-sheet{position:relative;width:100%;max-width:24em}
.relation-close{position:absolute;z-index:2;right:0;top:-1.8em;color:#fff;font-size:1.8em;line-height:1}
.relation-detail-card{position:relative;min-height:7.4em;margin-bottom:4.8em;padding:1.15em 6.8em 1em 1.1em;box-sizing:border-box;border-radius:1em;background:#343c60}
.relation-detail-card:last-child{margin-bottom:0}
.relation-detail-copy>view{display:flex;align-items:center;gap:.4em;min-width:0;margin-bottom:.45em}
.relation-detail-copy>view>text{font-size:1.15em;font-weight:700}
.relation-detail-copy em{flex:none;padding:.05em .5em;border-radius:1em;background:linear-gradient(100deg,#00b7ff,#3157ff);color:#fff;font-size:.68em;font-style:normal;line-height:1.7}
.relation-detail-copy>text{display:block;margin-top:.28em;color:#b6c0d7;font-size:.78em;line-height:1.45;overflow-wrap:anywhere}
.relation-photo{position:absolute;right:.9em;top:-.7em;display:flex;flex-direction:column;align-items:center;gap:.4em}
.relation-arch{width:4.2em;height:4.7em;padding:.22em .22em .28em;box-sizing:border-box;border-radius:0 0 2.2em 2.2em;overflow:hidden;background:linear-gradient(#12b4f4,#1262ff)}
.relation-arch image,.relation-arch>view{display:block;width:100%;height:100%;border-radius:0 0 2em 2em;object-fit:cover}
.relation-arch>view{display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.2em}
.relation-photo>text{padding:.12em .55em;border-radius:1em;background:linear-gradient(90deg,#00c4ee,#3157ff);font-size:.72em;line-height:1.45;white-space:nowrap}
@media(max-width:340px){
 .agency-identity{padding-left:.8em;padding-right:.8em}
 .agency-title{font-size:1.05em}
 .agency-store-badge{font-size:.58em}
 .agency-shortcuts{padding-left:.15em;padding-right:.15em}
 .agency-shortcuts text{font-size:10px}
 .agency-summary{margin-left:.7em;margin-right:.7em}
 .agency-summary strong{font-size:1em}
 .agency-relation-grid{gap:.4em;padding-left:.7em;padding-right:.7em}
 .agency-relation-copy>view>text{font-size:.8em}
 .relation-mask{padding-left:.8em;padding-right:.8em}
 .relation-detail-card{padding-right:5.2em}
 .relation-arch{width:3.5em;height:3.9em}
 .agency-tiers{gap:.25em}
 .agency-tiers button{font-size:.75em}
}
</style>
