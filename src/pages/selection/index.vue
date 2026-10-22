<template><view class="shop-page selection-catalog" @click="activePriceId=''" @touchmove="activePriceId=''"><view class="shop-selection-head">甄选</view><FeaturePageState :status="status" :error="error" @retry="load"/><view v-if="data" class="shop-side-layout"><view class="shop-categories"><button v-for="category in data.categories" :key="category.id" :class="{selected:categoryId===category.id}" @click="categoryId=category.id">{{category.label}}</button></view><view class="shop-products"><view v-for="product in products" :key="product.id" class="shop-list-item"><text class="shop-subtitle">{{product.categoryLabel}}</text><view class="shop-product-line" @click="open(product)"><image :src="product.coverUrl" mode="aspectFill"/><view><view class="shop-title">{{product.title}}</view><text class="shop-muted">{{product.summary}}</text></view></view><ShopPrices :product="product" :expanded="activePriceId===product.id" @toggle="activePriceId=$event?product.id:''"/></view></view></view><AppTabBar active="selection"/></view></template>
<script setup>
import {ref,computed} from 'vue'
import {onShow} from '@dcloudio/uni-app'
import {useAuth} from '../../composables/useAuth'
import {useAppTabBar} from '../../composables/useAppTabBar'
import {useAsyncPage} from '../../composables/useAsyncPage'
import {getCatalog} from '../../services/commerce'
import AppTabBar from '../../components/AppTabBar.vue'
import FeaturePageState from '../../components/FeaturePageState.vue'
import ShopPrices from '../../components/ShopPrices.vue'
useAuth();useAppTabBar();const activePriceId=ref(''),categoryId=ref('all'),{data,status,error,load}=useAsyncPage(getCatalog,false)
const products=computed(()=>data.value?.items.filter(x=>categoryId.value==='all'||x.categoryId===categoryId.value)||[])
function open(product){uni.navigateTo({url:`/pages/${product.categoryId==='column'?'column':'product'}/detail?id=${encodeURIComponent(product.id)}`})}
onShow(()=>{activePriceId.value='';load()})
</script><style>@import '../../styles/commerce.css';</style>
<style scoped>
.selection-catalog{background:#26376b;padding-bottom:0}
.selection-catalog .shop-selection-head{font-size:1.15em;padding:1.1em 1.4em;background:#1e3164;line-height:1.5}
.selection-catalog .shop-side-layout{background:#26376b;min-height:calc(100vh - 7em)}
.selection-catalog .shop-categories{width:26.4%;background:#364a84}
.selection-catalog .shop-categories button{display:block;width:100%;min-height:3.45em;padding:.85em .5em;font-size:1em;line-height:1.65;text-align:center;color:#b4c3e1}
.selection-catalog .shop-categories .selected{background:linear-gradient(90deg,#2d518c,#0084b8);color:#fff;border-right:2px solid #00c8ff}
.selection-catalog .shop-products{display:block;padding:1em .85em 1.5em;min-width:0}
.selection-catalog .shop-list-item{position:relative;padding:0 0 1.1em}
.selection-catalog .shop-subtitle{display:block;font-size:1em;line-height:1.5;color:#b6c5e0;margin-bottom:.85em}
.selection-catalog .shop-product-line{align-items:center;gap:.6em;margin:0 0 .9em}
.selection-catalog .shop-product-line>image{width:3.75em;height:3.75em;border-radius:.6em}
.selection-catalog .shop-list-item .shop-title{font-size:1em;line-height:1.4;margin-bottom:.4em;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.selection-catalog .shop-product-line .shop-muted{display:block;font-size:.94em;line-height:1.5;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;color:#b1c1df}
</style>
