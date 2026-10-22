<template>
 <view class="agency-page feature-page">
  <image class="agency-background" src="/static/partner/bg-overview.png" mode="scaleToFill"/>
  <view class="agency-heading">脑商代理中心</view>
  <FeaturePageState :status="status" :error="error" @retry="load"/>
  <template v-if="status==='ready' && overview">
   <view class="agency-identity">
    <view><view class="agency-title">{{agencyTitle}}</view><text>{{context.scopeLabel || context.label}}</text></view>
    <button class="agency-switch" @click="contextOpen=true"><image src="/static/common/icon-switch.png" mode="aspectFit"/><text>切换身份</text></button>
   </view>
   <view class="agency-summary">
    <button @click="open('team')"><text>我的团队</text><view>{{overview.teamCount ?? '—'}}<text>人</text></view></button>
    <button @click="open('income')"><text>代理收益（可提现）</text><view>¥{{money(overview.available)}}</view></button>
   </view>
   <view class="agency-relation-grid">
    <button v-for="kind in relations" :key="kind.key" class="agency-relation" @click="relationOpen=kind.key">
     <view class="agency-avatar">{{(overview[kind.key]?.name || '—').slice(0,1)}}</view>
     <view><text>{{kind.label}}</text><view>{{overview[kind.key]?.name || '暂未提供'}}</view><text class="agency-relation-scope">{{overview[kind.key]?.scopeLabel || '信息待后台提供'}}</text></view>
    </button>
   </view>
   <view class="agency-benefits">
    <view class="agency-benefit-title"><text>✦</text> 等级权益 <text>✦</text></view>
    <view class="agency-tiers"><button v-for="item in overview.benefits" :key="item.id" :class="{selected:tierId===item.id}" @click="tierId=item.id">{{item.label}}</button></view>
    <ManagedRichContent v-if="benefit" :content="benefit.content"/>
    <EmptyState v-if="!benefit?.content?.nodes?.length" text="这里还没有内容～"/>
   </view>
  </template>
  <view v-if="contextOpen" class="agency-mask" @click.self="contextOpen=false"><view class="agency-sheet"><view class="agency-sheet-title">切换身份<button aria-label="关闭身份切换" @click="contextOpen=false"><image src="/static/common/icon-close.png" mode="aspectFit"/></button></view><view v-for="group in contextGroups" :key="group.key" class="agency-context-group"><text>{{group.label}}</text><button v-for="item in group.items" :key="item.id" @click="chooseContext(item.id)"><view><view>{{displayContext(item)}}</view><text>{{item.scopeLabel}}</text></view><image :src="item.id===context?.id?'/static/common/icon-radio-checked.png':'/static/common/icon-chevron-right.png'" mode="aspectFit"/></button></view></view></view>
  <view v-if="relationOpen" class="agency-mask relation-mask" @click.self="relationOpen=''"><view class="agency-relation-dialog"><button class="relation-close" aria-label="关闭关系信息" @click="relationOpen=''"><image src="/static/common/icon-close.png" mode="aspectFit"/></button><view class="relation-dialog-title">{{relationTitle}}</view><view class="relation-dialog-card"><view class="agency-avatar large">{{relation.name?.slice(0,1) || '—'}}</view><view><view>{{relation.name || '暂未提供'}}</view><text>{{relation.scopeLabel || '信息待后台提供'}}</text></view></view><text class="relation-dialog-note">关系与授权范围由后台确认</text></view></view>
  <AppTabBar active="partners"/>
 </view>
</template>

<script setup>
import {computed, onMounted, onUnmounted, ref} from 'vue'
import {useAuth} from '../composables/useAuth'
import {useAppTabBar} from '../composables/useAppTabBar'
import {money} from '../features/exclusive/format'
import {getBusinessContext, getBusinessContexts, getBusinessOverview, selectBusinessContext} from '../services/business'
import FeaturePageState from './FeaturePageState.vue'
import ManagedRichContent from './ManagedRichContent.vue'
import EmptyState from './EmptyState.vue'
import AppTabBar from './AppTabBar.vue'
useAuth();useAppTabBar()
const status=ref('loading'),error=ref(''),overview=ref(null),contexts=ref([]),tierId=ref(''),contextOpen=ref(false),relationOpen=ref('')
let active=true,epoch=0,selectedId=''
const context=computed(()=>overview.value?.context)
const agencyTitle=computed(()=>context.value?.regionLabel || context.value?.label || '区域代理')
const benefit=computed(()=>overview.value?.benefits?.find(item=>item.id===tierId.value))
const relations=[{key:'superior',label:'区域上级'},{key:'referrer',label:'推荐人'}]
const relation=computed(()=>overview.value?.[relationOpen.value] || {})
const relationTitle=computed(()=>relations.find(item=>item.key===relationOpen.value)?.label || '关系信息')
const typeMeta={PROVINCE:'省代',CITY:'市代',COUNTY:'区代',STORE:'单店'}
const contextGroups=computed(()=>['PROVINCE','CITY','COUNTY','STORE'].map(key=>({key,label:typeMeta[key],items:contexts.value.filter(item=>item.agencyType===key)})).filter(group=>group.items.length))
function displayContext(item){return item.regionLabel || item.label}
async function load(){const current=++epoch;status.value='loading';error.value='';contextOpen.value=false;relationOpen.value='';try{const rows=await getBusinessContexts();const ctx=await getBusinessContext('agency',selectedId||undefined);const result=await getBusinessOverview('agency',ctx.id);if(!active||current!==epoch)return;contexts.value=rows.filter(item=>item.module==='agency');overview.value=result;selectedId=ctx.id;tierId.value=result.benefits.some(item=>item.id===tierId.value)?tierId.value:result.benefits[0]?.id||'';status.value='ready'}catch(reason){if(active&&current===epoch){error.value=reason.message||'代理工作台加载失败';status.value=reason.code==='FORBIDDEN'?'forbidden':'error'}}}
async function chooseContext(id){try{const selected=await selectBusinessContext(id);selectedId=selected.id;await load()}catch(reason){uni.showToast({title:reason.message||'切换失败',icon:'none'})}}
function open(tool){uni.navigateTo({url:`/pages/agency/${tool}?contextId=${encodeURIComponent(context.value.id)}`})}
onMounted(load);onUnmounted(()=>{active=false;++epoch})
defineExpose({refresh:load})
</script>

<style scoped>
.agency-page{position:relative;min-height:100vh;max-width:750px;margin:auto;padding:calc(28rpx + var(--status-bar-height,0px)) 0 calc(138rpx + env(safe-area-inset-bottom));box-sizing:border-box;overflow:hidden;background:radial-gradient(ellipse at 100% 0,#1d5a93,transparent 36%),#252c4c;color:#edf4ff}.agency-background{position:absolute;inset:0 0 auto;width:100%;height:42vh;opacity:.42;z-index:0}.agency-heading,.agency-identity,.agency-summary,.agency-relation-grid,.agency-benefits{position:relative;z-index:1}.agency-heading{padding:0 32rpx;font-size:38rpx;font-weight:700;line-height:1.7}.agency-identity{display:flex;align-items:center;justify-content:space-between;gap:24rpx;padding:42rpx 32rpx 26rpx}.agency-title{font-size:32rpx;font-weight:700;line-height:1.6}.agency-identity>view>text,.agency-relation-scope{display:block;color:#9aaac8;font-size:23rpx;line-height:1.6}.agency-switch{flex-shrink:0;margin:0;padding:0;background:none;color:#edf4ff;font-size:23rpx;line-height:1.5}.agency-switch image{display:block;width:64rpx;height:64rpx;margin:auto}.agency-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2rpx;margin:0 32rpx;border:1rpx solid #4e79b4;border-radius:18rpx;overflow:hidden;background:#5277a4}.agency-summary button{margin:0;padding:22rpx 16rpx;background:linear-gradient(130deg,#214f98,#1d315b);color:#a9b9d3;font-size:23rpx;line-height:1.6}.agency-summary button+button{border-left:1rpx solid #4d6f9e}.agency-summary button>view{color:#dfeeff;font-size:32rpx;font-weight:700;overflow-wrap:anywhere}.agency-summary button>view text{font-size:22rpx;font-weight:400}.agency-relation-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18rpx;padding:26rpx 32rpx}.agency-relation{display:flex;align-items:center;gap:14rpx;margin:0;padding:18rpx 16rpx;background:linear-gradient(125deg,#345592,#25365e);border-radius:16rpx;color:#fff;text-align:left;min-width:0}.agency-relation>view:last-child{min-width:0;flex:1;line-height:1.5;overflow-wrap:anywhere}.agency-relation>view:last-child>text:first-child{color:#b9cdf0;font-size:20rpx}.agency-avatar{width:58rpx;height:58rpx;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:linear-gradient(145deg,#9edbff,#3152a1);color:#152952;font-size:28rpx;font-weight:700}.agency-avatar.large{width:96rpx;height:96rpx;font-size:42rpx}.agency-benefits{min-height:46vh;margin-top:10rpx;padding:34rpx 32rpx 26rpx;border-radius:34rpx 34rpx 0 0;background:linear-gradient(#263860,#23294b)}.agency-benefit-title{text-align:center;font-size:29rpx;font-weight:700}.agency-benefit-title text{padding:0 12rpx;color:#d7e6ff}.agency-tiers{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16rpx;margin:24rpx 0}.agency-tiers button{margin:0;padding:6rpx;background:#445174;color:#a8b5cb;border-radius:28rpx;font-size:22rpx;line-height:1.7}.agency-tiers button.selected{background:radial-gradient(ellipse,#08284b 15%,#006ecb 70%,#1ac9ff);color:#fff;box-shadow:0 0 16rpx #009fff}.agency-mask{position:fixed;z-index:100;inset:0;display:flex;align-items:flex-end;background:#000a}.agency-sheet{width:100%;max-height:78vh;box-sizing:border-box;overflow-y:auto;border-radius:32rpx 32rpx 0 0;padding:32rpx;background:#343d62}.agency-sheet-title{display:flex;align-items:center;justify-content:center;font-size:32rpx;font-weight:700}.agency-sheet-title button,.relation-close{position:absolute;right:30rpx;background:none;margin:0;padding:0}.agency-sheet-title button image,.relation-close image{width:34rpx;height:34rpx}.agency-context-group{margin-top:28rpx}.agency-context-group>text{display:block;margin-bottom:12rpx;color:#a6b7d1;font-size:24rpx}.agency-context-group>button{display:flex;width:100%;align-items:center;justify-content:space-between;gap:20rpx;margin:0 0 14rpx;padding:18rpx;border-radius:14rpx;background:#454e70;color:#fff;text-align:left;font-size:27rpx;line-height:1.5}.agency-context-group button>view{min-width:0}.agency-context-group button text{display:block;overflow-wrap:anywhere;color:#a6b7d1;font-size:21rpx}.agency-context-group button image{width:34rpx;height:34rpx;flex-shrink:0}.relation-mask{align-items:center;padding:48rpx;box-sizing:border-box}.agency-relation-dialog{position:relative;width:100%;max-width:520rpx;padding:56rpx 34rpx 36rpx;box-sizing:border-box;border-radius:22rpx;background:linear-gradient(135deg,#334b7f,#303859);color:#fff}.relation-dialog-title{text-align:center;font-size:32rpx;font-weight:700}.relation-dialog-card{display:flex;align-items:center;gap:20rpx;margin:36rpx 0 18rpx;padding:20rpx;border-radius:14rpx;background:#465174}.relation-dialog-card text,.relation-dialog-note{display:block;color:#aabbd5;font-size:22rpx;line-height:1.7}.relation-dialog-note{text-align:center}@media(max-width:340px){.agency-heading{font-size:34rpx}.agency-identity{padding-top:32rpx}.agency-relation-grid{gap:12rpx;padding-left:24rpx;padding-right:24rpx}.agency-summary{margin-left:24rpx;margin-right:24rpx}.agency-benefits{padding-left:24rpx;padding-right:24rpx}.agency-relation{padding:14rpx 12rpx}.agency-avatar{width:50rpx;height:50rpx}.agency-tiers{gap:10rpx}.agency-tiers button{font-size:20rpx}}
</style>
