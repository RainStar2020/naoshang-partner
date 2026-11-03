<template>
  <view class="catalog-prices" :class="{ 'catalog-prices-single': single, 'catalog-prices-open': isExpanded }" @keydown.esc.stop="close">
    <view class="catalog-price-card"><text class="catalog-price-label">标准价</text><text class="catalog-price-number">{{price(product.standardAmount)}}</text></view>
    <template v-if="!single">
      <view class="catalog-price-card"><text class="catalog-price-label">活动价</text><text class="catalog-price-number">{{price(product.activityAmount)}}</text></view>
      <view class="catalog-member-anchor">
        <button role="button" tabindex="0" class="catalog-price-card catalog-member-button" :aria-label="`${product.title}会员价查看详情`" :aria-expanded="isExpanded" :aria-controls="tooltipId" @click.stop="toggle"><text class="catalog-price-label">会员价</text><text class="catalog-price-number catalog-price-detail">查看详情</text></button>
        <view v-if="showTooltip&&isExpanded" :id="tooltipId" role="tooltip" class="catalog-member-tooltip" :class="{ below: placement==='below' }" @click.stop>
          <view v-for="item in tiers" :key="item.label" class="catalog-member-tier" :class="{current:item.current===true}"><text class="catalog-member-label">{{item.label}}</text><text class="catalog-member-value">{{item.discountLabel?item.discountLabel+'/':''}}{{price(item.amount)}}</text></view>
          <text v-if="!tiers.length" class="catalog-member-empty">暂无会员价</text>
        </view>
      </view>
    </template>
  </view>
</template>
<script setup>
import {ref,computed,watch,getCurrentInstance} from 'vue'
import {money} from '../features/exclusive/format'
import {wholesaleLevelDisplay} from '../features/business/account-rank'
const props=defineProps({product:{type:Object,required:true},expanded:{type:Boolean,default:null},showTooltip:{type:Boolean,default:true}}),emit=defineEmits(['toggle'])
const localOpen=ref(false),placement=ref('above'),instance=getCurrentInstance()
const isExpanded=computed(()=>props.expanded===null?localOpen.value:props.expanded),single=computed(()=>props.product.pricePresentation==='standard-only'),tooltipId=computed(()=>`member-prices-${props.product.id}`)
const tiers=computed(()=>(props.product.memberPrices||[]).map(item=>({...item,label:wholesaleLevelDisplay(item.label)||item.label})))
const price=value=>money(value).replace(/\.00$/,'')
function setExpanded(value){if(props.expanded===null)localOpen.value=value;emit('toggle',value)}
function measurePlacement(){
  return new Promise(resolve=>{
    const query=uni.createSelectorQuery()
    if(instance?.proxy)query.in(instance.proxy)
    query.select('.catalog-member-anchor').boundingClientRect(rect=>{
      // Open downward when there is not enough room above (header / first rows).
      if(!rect){resolve('above');return}
      resolve(rect.top<240?'below':'above')
    }).exec()
  })
}
async function toggle(){
  const next=!isExpanded.value
  if(next&&props.showTooltip)placement.value=await measurePlacement()
  setExpanded(next)
}
function close(){setExpanded(false)}
watch(()=>props.product.id,()=>{localOpen.value=false;placement.value='above'})
watch(isExpanded,value=>{if(!value)placement.value='above'})
</script>
<style scoped>
.catalog-prices{position:relative;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.5em;margin:0;font-size:clamp(12px,3.2vw,14px);isolation:isolate}
.catalog-prices-single{grid-template-columns:minmax(0,1fr)}
.catalog-prices-open{z-index:90}
.catalog-price-card{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.08em;min-width:0;min-height:3.8em;padding:.5em .15em;border-radius:.65em;background:#465583;text-align:center;line-height:1.35}
.catalog-price-label{display:block;color:rgba(255,255,255,.72);font-size:1em;white-space:nowrap}
.catalog-price-number{display:block;color:#59b6ff;font-weight:700;font-size:1.12em;line-height:1.35;overflow-wrap:anywhere}
.catalog-member-anchor{position:relative;min-width:0;z-index:1}
.catalog-prices .catalog-member-button{width:100%;height:100%;margin:0;border:0;font-size:inherit;line-height:1.35;color:inherit;overflow:visible;box-sizing:border-box}
.catalog-member-button::after{border:0}
.catalog-member-button:focus{outline:none}
.catalog-member-button:focus-visible{outline:2px solid #59b6ff;outline-offset:2px}
.catalog-price-detail{text-decoration:underline;text-underline-offset:.15em;white-space:nowrap}
.catalog-member-tooltip{position:absolute;right:.25em;bottom:calc(100% - .12em);width:max-content;min-width:13em;max-width:calc(100vw - 2em);padding:.4em;background:#0c2650;border:1px solid #418cff;border-radius:.3em;box-sizing:border-box;color:rgba(255,255,255,.72);z-index:20;box-shadow:0 8rpx 24rpx rgba(0,0,0,.35)}
.catalog-member-tooltip.below{top:calc(100% - .12em);bottom:auto}
.catalog-member-tooltip::after{content:'';position:absolute;right:2.1em;bottom:-.36em;width:.6em;height:.6em;background:#0c2650;border-right:1px solid #418cff;border-bottom:1px solid #418cff;transform:rotate(45deg)}
.catalog-member-tooltip.below::after{top:-.36em;bottom:auto;border-right:0;border-bottom:0;border-left:1px solid #418cff;border-top:1px solid #418cff;transform:rotate(45deg)}
.catalog-member-tier{display:flex;align-items:center;justify-content:space-between;gap:.8em;padding:.5em .4em;min-height:2.2em;line-height:1.35;white-space:nowrap;overflow-x:auto}
.catalog-member-tier.current{background:#1b3b68}
.catalog-member-label{flex-shrink:0;font-size:1em}
.catalog-member-value{flex-shrink:0;color:#59b6ff;font-weight:700;font-size:1.08em;white-space:nowrap}
.catalog-member-empty{display:block;text-align:center;padding:1em .4em;color:rgba(255,255,255,.72)}
</style>
