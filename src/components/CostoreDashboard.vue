<template>
 <view class="costore-page feature-page">
  <image class="costore-background" src="/static/partner/bg-overview.png" mode="scaleToFill"/>
  <view class="costore-heading">{{moduleTitle}}</view>
  <FeaturePageState :status="status" :error="error" @retry="load"/>
  <template v-if="status==='ready' && overview">
   <view class="costore-identity">
    <view>
     <view class="costore-title">{{roleTitle}}</view>
     <text>共{{storeCount}}家门店</text>
    </view>
    <button class="costore-switch" @click="moduleOpen=true"><image src="/static/common/icon-switch.png" mode="aspectFit"/><text>切换模块</text></button>
   </view>
   <view class="costore-store">
    <image class="costore-cover" :src="store?.imageUrl || '/static/agency/store-wutong.png'" mode="aspectFill"/>
    <view class="costore-store-copy">
     <view class="costore-store-name">{{store?.name || context?.label || '合店门店'}}<text v-if="store?.number">{{store.number}}</text></view>
     <text class="costore-address">{{store?.address || '地址待后台提供'}}</text>
     <view class="costore-store-foot"><text>{{daysText}}</text><button @click="storesOpen=true">切换门店 <text>›</text></button></view>
    </view>
   </view>
   <view class="costore-shortcuts">
    <button v-for="item in shortcuts" :key="item.id" @click="open(item)"><image :src="item.icon" mode="aspectFit"/><text>{{item.label}}</text></button>
   </view>
   <view class="costore-benefits">
    <view class="costore-benefit-title"><text>✦</text> 等级权益 <text>✦</text></view>
    <ManagedRichContent v-if="benefit" :content="benefit.content"/>
    <EmptyState v-if="!benefit?.content?.nodes?.length" text="这里还没有内容～"/>
   </view>
  </template>
  <view v-if="storesOpen" class="costore-store-page">
   <view class="costore-store-bar"><button aria-label="返回" @click="storesOpen=false"><image src="/static/common/icon-back.png" mode="aspectFit"/></button><text>切换门店</text></view>
   <view class="costore-store-list">
    <button v-for="item in contexts" :key="item.id" @click="chooseContext(item.id)">
     <image class="costore-cover" :src="item.store?.imageUrl || '/static/agency/store-wutong.png'" mode="aspectFill"/>
     <view class="costore-store-copy">
      <view class="costore-store-name">{{item.store?.name || item.label}}<text v-if="item.store?.number">{{item.store.number}}</text></view>
      <text class="costore-address">{{item.store?.address || '地址待后台提供'}}</text>
      <text class="costore-days">{{item.store?.daysRemaining == null ? '有效期以后台为准' : `${item.store.daysRemaining}天后到期`}}</text>
     </view>
     <image class="costore-chevron" src="/static/common/icon-chevron-right.png" mode="aspectFit"/>
    </button>
   </view>
  </view>
  <view v-if="moduleOpen" class="costore-mask" @click="moduleOpen=false">
   <view class="costore-module" role="dialog" aria-label="切换模块" @click.stop>
    <view class="costore-module-title">切换模块<button aria-label="关闭模块切换" @click="moduleOpen=false"><image src="/static/common/icon-close.png" mode="aspectFit"/></button></view>
    <view class="costore-module-options" :style="{gridTemplateColumns:`repeat(${Math.min(Math.max(modules.length,1),3)},minmax(0,1fr))`}"><button v-for="item in modules" :key="item.id" @click="switchModule(item.id)"><image :src="item.icon" mode="aspectFit"/><text>{{item.label}}</text></button></view>
   </view>
  </view>
  <AppTabBar v-if="!storesOpen" active="partners"/>
 </view>
</template>
<script setup>
import {computed, onMounted, onUnmounted, ref} from 'vue'
import {useAuth} from '../composables/useAuth'
import {useAppTabBar} from '../composables/useAppTabBar'
import {businessModules} from '../features/business/catalog'
import {getBusinessContext, getBusinessContexts, getBusinessOverview, selectBusinessContext} from '../services/business'
import FeaturePageState from './FeaturePageState.vue'
import ManagedRichContent from './ManagedRichContent.vue'
import EmptyState from './EmptyState.vue'
import AppTabBar from './AppTabBar.vue'
useAuth();useAppTabBar()
const emit=defineEmits(['left'])
const status=ref('loading'),error=ref(''),overview=ref(null),contexts=ref([]),allContexts=ref([]),storesOpen=ref(false),moduleOpen=ref(false)
let active=true,epoch=0,selectedId=''
const context=computed(()=>overview.value?.context)
const store=computed(()=>context.value?.store)
const storeCount=computed(()=>contexts.value.length)
const benefit=computed(()=>overview.value?.benefits?.[0])
const moduleMeta=businessModules.find(item=>item.id==='costore')
const moduleTitle=moduleMeta?.title||'合店中心'
const roleTitle=moduleMeta?.label?`${moduleMeta.label}身份`:'合店身份'
const daysText=computed(()=>store.value?.daysRemaining==null?'有效期以后台为准':`${store.value.daysRemaining}天后到期`)
const modules=computed(()=>businessModules.filter(item=>allContexts.value.some(row=>row.module===item.id)))
const shortcuts=computed(()=>['income','card-dividends','promotion-dividends'].map(id=>overview.value?.tools?.find(tool=>tool.id===id)).filter(Boolean))
async function load(){const current=++epoch;status.value=overview.value?'ready':'loading';error.value='';storesOpen.value=false;moduleOpen.value=false;try{const rows=await getBusinessContexts();const ctx=await getBusinessContext('costore',selectedId||undefined);const result=await getBusinessOverview('costore',ctx.id);if(!active||current!==epoch)return;allContexts.value=rows;contexts.value=rows.filter(item=>item.module==='costore');overview.value=result;selectedId=ctx.id;status.value='ready'}catch(reason){if(active&&current===epoch){error.value=reason.message||'合店工作台加载失败';status.value=reason.code==='FORBIDDEN'?'forbidden':'error'}}}
async function chooseContext(id){try{const selected=await selectBusinessContext(id);selectedId=selected.id;await load()}catch(reason){uni.showToast({title:reason.message||'身份切换未完成，请稍后重试',icon:'none'})}}
async function switchModule(moduleId){if(moduleId===context.value?.module){moduleOpen.value=false;return}const selected=allContexts.value.find(item=>item.module===moduleId);if(!selected)return;try{const next=await selectBusinessContext(selected.id);moduleOpen.value=false;if(next.module!=='costore'){emit('left',next.id);const route=getCurrentPages().slice(-1)[0]?.route;if(route!=='pages/partners/index')uni.switchTab({url:'/pages/partners/index'});return}selectedId=next.id;await load()}catch(reason){uni.showToast({title:reason.message||'身份切换未完成，请稍后重试',icon:'none'})}}
function open(item){const allowed=overview.value?.tools?.some(tool=>tool.id===item.id);if(!allowed){uni.showToast({title:'当前身份暂无此功能权限',icon:'none'});return}uni.navigateTo({url:`${item.path}?contextId=${context.value.id}`})}
onMounted(load);onUnmounted(()=>{active=false;++epoch})
defineExpose({refresh:load})
</script>
<style scoped>
.costore-page{position:relative;min-height:100vh;max-width:750px;margin:0 auto;box-sizing:border-box;background:radial-gradient(ellipse at 100% 0,#1f5c96 0,transparent 42%),#101b40;color:#edf4ff;font-size:clamp(14px,3.7vw,16px);line-height:1.5}
.costore-page button{margin:0;padding:0;background:none;color:inherit;line-height:inherit;font-size:inherit}
.costore-page button::after{border:0}
.costore-background{position:absolute;left:0;top:0;width:100%;height:22em;opacity:.45;z-index:0}
.costore-heading,.costore-identity,.costore-store,.costore-shortcuts,.costore-benefits{position:relative;z-index:1}
.costore-heading{padding:calc(.85em + var(--status-bar-height,0px)) 6em .2em 1.15em;font-family:var(--font-page-title);font-size:1.15em;font-weight:700;line-height:1.6}
.costore-identity{display:flex;align-items:center;justify-content:space-between;gap:.8em;padding:1em 1.15em .7em}
.costore-title{font-size:1.35em;font-weight:700;line-height:1.35}
.costore-identity>view>text{display:block;margin-top:.15em;color:#949fbd;font-size:.9em}
.costore-page button.costore-switch{flex:none;display:flex;flex-direction:column;align-items:center;background:none;padding:0;margin:0;color:#fff;font-size:.75em;line-height:1.5}
.costore-page button.costore-switch image{width:2.2em;height:2.2em;display:block;margin:0 auto .3em}
.costore-store,.costore-store-list button{display:flex;align-items:flex-start;gap:.7em;margin:0 1em .9em;padding:.75em;border-radius:.75em;background:#353a59;text-align:left}
.costore-cover{width:4.8em;height:4.4em;flex:none;border-radius:.35em;background:#2a314c}
.costore-store-copy{min-width:0;flex:1}
.costore-store-name{display:flex;align-items:center;gap:.4em;font-weight:700;line-height:1.4}
.costore-store-name text{padding:0 .45em;border-radius:1em;background:linear-gradient(100deg,#00b7ff,#3157ff);font-size:.68em;font-weight:700;line-height:1.7}
.costore-address,.costore-days{display:block;margin-top:.25em;color:#b7c0d8;font-size:.75em;line-height:1.45;overflow-wrap:anywhere}
.costore-store-foot{display:flex;align-items:center;justify-content:space-between;gap:.6em;margin-top:.35em}
.costore-store-foot>text{color:#b7c0d8;font-size:.78em}
.costore-store-foot button{flex:none;color:#57adff;font-size:.82em}
.costore-shortcuts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.4em;padding:.2em 1em 1.1em}
.costore-shortcuts button{display:flex;flex-direction:column;align-items:center;gap:.35em;min-width:0}
.costore-shortcuts image{width:2.3em;height:2.3em}
.costore-shortcuts text{font-size:.85em;line-height:1.3}
.costore-benefits{min-height:16em;margin-top:.4em;padding:1.3em 1em 6em;border-radius:1.2em 1.2em 0 0;background:linear-gradient(#28345c,#22274d)}
.costore-benefit-title{margin-bottom:1em;text-align:center;font-size:1.05em;font-weight:700}
.costore-benefit-title text{padding:0 .35em;color:#9ec6ff}
.costore-store-page{position:fixed;z-index:90;inset:0;display:flex;flex-direction:column;max-width:750px;margin:0 auto;background:#272c47;color:#fff}
.costore-store-bar{display:flex;align-items:center;gap:1em;min-height:3.2em;padding:calc(.6em + var(--status-bar-height,0px)) 6em .6em 1em;background:#343a5b;font-size:1.1em;font-weight:600}
.costore-store-bar image{width:1.8em;height:1.8em}
.costore-store-list{flex:1;overflow:auto;padding:1em 0}
.costore-store-list button{width:calc(100% - 2em);align-items:center}
.costore-chevron{width:1em;height:1em;flex:none}
.costore-mask{position:fixed;z-index:100;inset:0;display:flex;align-items:center;justify-content:center;padding:1.5em;box-sizing:border-box;background:rgba(0,0,0,.72)}
.costore-module{width:100%;max-width:22em;box-sizing:border-box;padding:1.3em 1em 1.4em;border-radius:24rpx;background:linear-gradient(180deg,#28345C 0%,#22274D 100%)}
.costore-module-title{position:relative;margin-bottom:1em;text-align:center;font-size:1.05em;font-weight:700}
.costore-module-title button{position:absolute;right:0;top:0}
.costore-module-title image{width:1.25em;height:1.25em}
.costore-module-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.8em;margin-top:2em}
.costore-module-options button{display:flex;flex-direction:column;align-items:center;gap:.8em;min-width:0;color:#d9eaff;background:none;margin:0;padding:0;font-size:1em;line-height:1.6}
.costore-module-options image{width:3em;height:3em}
@media(max-width:340px){.costore-store-name{flex-wrap:wrap}.costore-shortcuts text{font-size:.78em}}
</style>
