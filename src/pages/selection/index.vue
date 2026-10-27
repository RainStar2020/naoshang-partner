<template>
  <view class="shop-page selection-catalog" @click="activePriceId = ''" @touchmove="activePriceId = ''">
    <view class="selection-frame">
      <view class="shop-selection-head">甄选</view>
      <FeaturePageState :status="status" :error="error" @retry="load" />
      <view v-if="data" class="shop-side-layout">
        <scroll-view class="shop-categories" scroll-y>
          <button v-for="category in visibleCategories" :key="category.id" :class="{ selected: categoryId === category.id }" @click="categoryId = category.id">{{ category.label }}</button>
        </scroll-view>
        <scroll-view class="shop-products" scroll-y @scroll="activePriceId = ''">
          <view v-for="section in sections" :key="section.id" class="selection-section">
            <text class="shop-subtitle">{{ section.label }}</text>
            <view v-for="product in section.items" :key="product.id" class="shop-list-item">
              <view class="shop-product-line" @click="open(product)">
                <image :src="product.coverUrl" mode="aspectFill" />
                <view>
                  <view class="shop-title">{{ product.title }}</view>
                  <text class="shop-muted">{{ product.summary }}</text>
                </view>
              </view>
              <ShopPrices :product="product" :expanded="activePriceId === product.id" @toggle="activePriceId = $event ? product.id : ''" />
            </view>
          </view>
          <view v-if="subcategoryProduct" class="selection-section">
            <text class="shop-subtitle">这里是二级分类</text>
            <view class="shop-list-item">
              <view class="shop-product-line">
                <image :src="subcategoryProduct.coverUrl" mode="aspectFill" />
                <view>
                  <view class="shop-title">{{ subcategoryProduct.title }}</view>
                  <text class="shop-muted">{{ subcategoryProduct.summary }}</text>
                </view>
              </view>
              <ShopPrices :product="subcategoryProduct" :expanded="activePriceId === subcategoryProduct.id" @toggle="activePriceId = $event ? subcategoryProduct.id : ''" />
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
    <AppTabBar active="selection" />
  </view>
</template>
<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAuth } from '../../composables/useAuth'
import { useAppTabBar } from '../../composables/useAppTabBar'
import { useAsyncPage } from '../../composables/useAsyncPage'
import { getCatalog } from '../../services/commerce'
import AppTabBar from '../../components/AppTabBar.vue'
import FeaturePageState from '../../components/FeaturePageState.vue'
import ShopPrices from '../../components/ShopPrices.vue'
useAuth()
useAppTabBar()
const activePriceId = ref('')
const categoryId = ref('all')
const { data, status, error, load } = useAsyncPage(getCatalog, false)
const visibleCategories = computed(() => data.value?.categories.filter(item => item.id !== 'special') || [])
const products = computed(() => data.value?.items.filter(item => item.categoryId !== 'special' && (categoryId.value === 'all' || item.categoryId === categoryId.value)) || [])
const subcategoryProduct = computed(() => {
  if (categoryId.value !== 'all') return null
  const source = products.value.find(item => item.categoryId === 'column')
  if (!source) return null
  return { ...source, id: 'selection-subcategory-sample', title: 'xxxxxx这里是商品名称', summary: '这里是简介这里是简介，这里是简介' }
})
const sections = computed(() => {
  const groups = []
  for (const product of products.value) {
    const last = groups[groups.length - 1]
    if (!last || last.id !== product.categoryId) groups.push({ id: product.categoryId, label: product.categoryLabel, items: [product] })
    else last.items.push(product)
  }
  return groups
})
function open(product) { uni.navigateTo({ url: `/pages/${product.categoryId === 'column' ? 'column' : 'product'}/detail?id=${encodeURIComponent(product.id)}` }) }
onShow(() => { activePriceId.value = ''; load() })
</script>
<style>@import '../../styles/commerce.css';</style>
<style scoped>
.selection-catalog { height: 100vh; overflow: hidden; background: #26376b; padding-bottom: 0; }
.selection-frame { display: flex; flex-direction: column; height: calc(100vh - 118rpx - env(safe-area-inset-bottom)); max-width: 750px; margin: 0 auto; }
.selection-catalog .shop-selection-head { font-size: 1.15em; padding: calc(.9em + var(--status-bar-height, 0px)) 1.4em .85em; background: #1e3164; line-height: 1.5; }
.selection-catalog .shop-side-layout { flex: 1; min-height: 0; overflow: hidden; background: #26376b; }
.selection-catalog .shop-categories { flex: none; width: 26.4%; height: 100%; background: #364a84; }
.selection-catalog .shop-categories button { display: block; width: 100%; min-height: 3.45em; padding: .85em .5em; font-size: 1em; line-height: 1.65; text-align: center; color: #b4c3e1; }
.selection-catalog .shop-categories .selected { background: linear-gradient(90deg, #2d518c, #0084b8); color: #fff; border-right: 2px solid #00c8ff; }
.selection-catalog .shop-products { display: block; flex: 1; width: 0; height: 100%; padding: 1em .85em 1.5em; min-width: 0; }
.selection-section + .selection-section { margin-top: .35em; }
.selection-catalog .shop-list-item { position: relative; padding: 0 0 1.1em; }
.selection-catalog .shop-subtitle { display: block; font-size: 1em; line-height: 1.5; color: #b6c5e0; margin-bottom: .85em; }
.selection-catalog .shop-product-line { align-items: center; gap: .6em; margin: 0 0 .9em; }
.selection-catalog .shop-product-line > image { width: 3.75em; height: 3.75em; border-radius: .6em; }
.selection-catalog .shop-product-line > view { min-width: 0; }
.selection-catalog .shop-list-item .shop-title { font-size: 1em; line-height: 1.4; margin-bottom: .4em; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.selection-catalog .shop-product-line .shop-muted { display: block; font-size: .94em; line-height: 1.5; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: #b1c1df; }
</style>
