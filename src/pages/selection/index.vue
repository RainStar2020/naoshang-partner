<template><view class="shop-page"><view class="shop-selection-head">甄选</view><FeaturePageState :status="status" :error="error" @retry="load"/><view v-if="data" class="shop-side-layout"><view class="shop-categories"><button v-for="category in data.categories" :key="category.id" :class="{selected:categoryId===category.id}" @click="categoryId=category.id">{{category.label}}</button></view><view class="shop-products"><view v-for="product in products" :key="product.id" class="shop-list-item"><text class="shop-subtitle">{{product.categoryLabel}}</text><view class="shop-product-line" @click="open(product)"><image :src="product.coverUrl" mode="aspectFill"/><view><view class="shop-title">{{product.title}}</view><text class="shop-muted">{{product.summary}}</text></view></view><ShopPrices :product="product"/><button class="shop-link" @click="open(product)">查看商品</button></view></view></view><AppTabBar active="selection"/></view></template>
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
useAuth();useAppTabBar();const categoryId=ref('physical'),{data,status,error,load}=useAsyncPage(getCatalog,false)
const products=computed(()=>data.value?.items.filter(x=>x.categoryId===categoryId.value)||[])
function open(product){uni.navigateTo({url:`/pages/${product.categoryId==='column'?'column':'product'}/detail?id=${encodeURIComponent(product.id)}`})}
onShow(load)
</script><style>@import '../../styles/commerce.css';</style>
