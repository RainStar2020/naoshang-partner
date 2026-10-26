<template>
  <view class="shop-page detail-page" @click="priceOpen = false" @keydown.esc="closeLayers">
    <view class="commerce-column">
      <BusinessPageHeader title="商品详情" fallback="/pages/selection/index" />
      <FeaturePageState :status="status" :error="error" @retry="load" />
      <template v-if="data">
        <view class="detail-cover">
          <image class="shop-cover" :src="data.coverUrl" mode="aspectFill" />
          <view v-if="priceOpen && detailTiers.length" class="detail-role-pop" role="tooltip" @click.stop>
            <view v-for="item in detailTiers" :key="item.label" class="detail-role-row" :class="{ current: item.current === true }">
              <text>{{ item.label }}</text>
              <text>{{ tierText(item) }}</text>
            </view>
            <text v-if="!detailTiers.length" class="detail-role-empty">暂无会员价</text>
          </view>
        </view>
        <view class="shop-body">
          <view class="shop-title">{{ data.title }}</view>
          <text class="detail-summary">{{ data.summary }}</text>
          <ShopPrices :product="data" :expanded="priceOpen" :show-tooltip="false" @toggle="priceOpen = $event" />
          <view class="shop-card detail-intro">
            <view class="detail-intro-title">详情介绍</view>
            <ManagedRichContent :content="data.content" />
          </view>
        </view>
      </template>
    </view>
    <view v-if="data" class="shop-footer">
      <button class="shop-primary" @click.stop="openSpecs">立即购买</button>
    </view>
    <view v-if="showSpecs && data" class="shop-mask" @click="showSpecs = false">
      <view class="shop-sheet spec-sheet" role="dialog" aria-label="选择规格" @click.stop>
        <view class="spec-head">
          <image :src="data.coverUrl" mode="aspectFill" />
          <view class="spec-head-copy">
            <text class="spec-price">¥{{ plainYuan(sku?.amount) }}</text>
            <text class="spec-selected">已选：{{ selectedLabel || '请选择规格' }}</text>
          </view>
          <button class="shop-close" aria-label="关闭规格" @click="showSpecs = false"><image src="/static/common/icon-close.png" mode="aspectFit" /></button>
        </view>
        <view v-for="group in groups" :key="group.id" class="spec-group">
          <text class="spec-label">{{ group.label }}</text>
          <view class="spec-options">
            <button v-for="option in group.options" :key="option.id" :class="{ selected: selectedSpecs[group.id] === option.id }" :disabled="!optionEnabled(group, option)" @click="chooseOption(group, option)">{{ option.label }}</button>
          </view>
        </view>
        <view v-if="!groups.length" class="spec-group">
          <text class="spec-label">规格</text>
          <view class="spec-options">
            <button v-for="item in data.skus" :key="item.id" :class="{ selected: skuId === item.id }" :disabled="!item.stock" @click="chooseFlat(item)">{{ item.label }}</button>
          </view>
        </view>
        <view class="spec-qty-row">
          <view>
            <text class="spec-label">选择数量</text>
            <text v-if="sku" class="spec-stock">剩余库存{{ sku.stock }}件</text>
          </view>
          <view class="spec-qty">
            <button :disabled="quantity <= 1" aria-label="减少数量" @click="quantity--"><image src="/static/common/icon-minus.png" mode="aspectFit" /></button>
            <text>{{ quantity }}</text>
            <button :disabled="!sku || quantity >= maxQuantity" aria-label="增加数量" @click="quantity++"><image src="/static/common/icon-plus.png" mode="aspectFit" /></button>
          </view>
        </view>
        <button class="shop-primary spec-buy" :disabled="!sku || !sku.stock" @click="checkout">立即购买</button>
      </view>
    </view>
  </view>
</template>
<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useAuth } from '../../composables/useAuth'
import { useAsyncPage } from '../../composables/useAsyncPage'
import { getProduct } from '../../services/commerce'
import { money } from '../../features/exclusive/format'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
import FeaturePageState from '../../components/FeaturePageState.vue'
import ManagedRichContent from '../../components/ManagedRichContent.vue'
import ShopPrices from '../../components/ShopPrices.vue'
useAuth()
let id = ''
const showSpecs = ref(false)
const priceOpen = ref(false)
const skuId = ref('')
const selectedSpecs = ref({})
const quantity = ref(1)
const plainYuan = value => money(value).replace(/\.00$/, '')
const { data, status, error, load } = useAsyncPage(async () => {
  const product = await getProduct(id)
  const first = product.skus.find(item => item.stock > 0) || product.skus[0]
  skuId.value = first?.id || ''
  selectedSpecs.value = first?.specs ? { ...first.specs } : {}
  quantity.value = 1
  return product
}, false)
const groups = computed(() => data.value?.specGroups || [])
const sku = computed(() => {
  const product = data.value
  if (!product) return null
  if (!groups.value.length) return product.skus.find(item => item.id === skuId.value) || null
  if (groups.value.some(group => !selectedSpecs.value[group.id])) return null
  return product.skus.find(item => groups.value.every(group => item.specs?.[group.id] === selectedSpecs.value[group.id])) || null
})
const maxQuantity = computed(() => Math.min(sku.value?.stock || 0, 99))
const selectedLabel = computed(() => {
  if (!groups.value.length) return sku.value?.label || ''
  return groups.value.map(group => group.options.find(option => option.id === selectedSpecs.value[group.id])?.label).filter(Boolean).join('，')
})
const detailTiers = computed(() => {
  const product = data.value
  if (!product || product.pricePresentation === 'standard-only') return []
  return product.rolePrices?.length ? product.rolePrices : (product.memberPrices || [])
})
function tierText(item) { return `${item.discountLabel ? item.discountLabel + '/' : ''}${plainYuan(item.amount)}` }
function optionEnabled(group, option) {
  const product = data.value
  if (!product) return false
  const picks = { ...selectedSpecs.value, [group.id]: option.id }
  return product.skus.some(item => (item.stock || 0) > 0 && Object.entries(picks).every(([key, value]) => !value || item.specs?.[key] === value))
}
function chooseOption(group, option) {
  if (!optionEnabled(group, option)) return
  selectedSpecs.value = { ...selectedSpecs.value, [group.id]: option.id }
  quantity.value = 1
}
function chooseFlat(item) {
  if (!item.stock) return
  skuId.value = item.id
  quantity.value = 1
}
function openSpecs() { priceOpen.value = false; showSpecs.value = true }
function closeLayers() { priceOpen.value = false; showSpecs.value = false }
function checkout() {
  const current = sku.value
  if (!current?.stock) return
  uni.navigateTo({ url: `/pages/order/confirm?productId=${encodeURIComponent(id)}&skuId=${encodeURIComponent(current.id)}&quantity=${quantity.value}` })
}
onLoad(query => { id = query.id || '' })
onShow(() => {
  const page = getCurrentPages().slice(-1)[0]
  id = id || page?.options?.id || page?.$page?.options?.id || ''
  showSpecs.value = false
  priceOpen.value = false
  load()
})
</script>
<style>@import '../../styles/commerce.css';</style>
<style scoped>
.detail-page { background: #272c47; }
.commerce-column { max-width: 750px; margin: 0 auto; }
.detail-cover { position: relative; }
.detail-page .shop-cover { width: 100%; height: 62vw; max-height: 28em; display: block; background: #1c2238; }
.detail-role-pop { position: absolute; right: .7em; bottom: .7em; width: 11.2em; max-width: calc(100% - 1.4em); padding: .35em; background: #0c2650; border: 1px solid #418cff; border-radius: .35em; z-index: 2; }
.detail-role-pop::after { content: ''; position: absolute; right: 1.4em; bottom: -.36em; width: .6em; height: .6em; background: #0c2650; border-right: 1px solid #418cff; border-bottom: 1px solid #418cff; transform: rotate(45deg); }
.detail-role-row { display: flex; align-items: center; justify-content: space-between; gap: .4em; padding: .48em .4em; color: rgba(255, 255, 255, .78); line-height: 1.35; }
.detail-role-row.current { background: #1b3b68; }
.detail-role-row text:last-child { color: #59b6ff; font-weight: 700; }
.detail-role-empty { display: block; text-align: center; padding: .8em .4em; color: rgba(255, 255, 255, .72); }
.detail-page .shop-body { padding: 1em 1em 1.2em; }
.detail-page .shop-title { font-size: 1.12em; }
.detail-summary { display: block; margin: .35em 0 .9em; color: #b7c3dc; line-height: 1.65; }
.detail-intro { margin-top: 1em; }
.detail-intro-title { text-align: center; font-size: 1.02em; font-weight: 600; margin-bottom: .75em; }
.detail-intro :deep(.managed-content) { color: #d5dced; font-size: 1em; line-height: 1.85; }
.detail-page .shop-footer { width: min(750px, 100%); left: 50%; right: auto; transform: translateX(-50%); background: #272c47; padding-left: 1.15em; padding-right: 1.15em; }
.detail-page .shop-footer .shop-primary { width: 100%; }
.spec-sheet { background: #343a5c; }
.spec-head { display: flex; align-items: flex-start; gap: .75em; }
.spec-head > image { width: 4.6em; height: 4.6em; border-radius: .45em; flex-shrink: 0; background: #1c2238; }
.spec-head-copy { flex: 1; min-width: 0; padding-top: .15em; }
.spec-price { display: block; color: #59b6ff; font-size: 1.35em; font-weight: 700; line-height: 1.3; }
.spec-selected { display: block; margin-top: .45em; color: #c5cbe0; font-size: .92em; line-height: 1.5; }
.spec-group { margin-top: 1.05em; }
.spec-label { display: block; font-size: 1em; line-height: 1.5; }
.spec-options { display: flex; flex-wrap: wrap; gap: .65em; margin-top: .7em; }
.spec-options button { margin: 0; padding: .42em .9em; border-radius: 2em; background: #4a516c; color: #fff; border: 1px solid transparent; line-height: 1.45; }
.spec-options button.selected { color: #3db4ff; border-color: #2f9dff; background: #243e6d; }
.spec-options button[disabled] { opacity: .38; }
.spec-qty-row { display: flex; align-items: center; justify-content: space-between; gap: .8em; margin: 1.15em 0 1.2em; }
.spec-stock { display: block; margin-top: .2em; color: #59b6ff; font-size: .82em; line-height: 1.4; }
.spec-qty { display: flex; align-items: center; gap: .55em; flex-shrink: 0; }
.spec-qty button { width: 1.7em; height: 1.7em; margin: 0; padding: 0; background: none; line-height: 1; }
.spec-qty image { width: 1.7em; height: 1.7em; display: block; }
.spec-qty text { min-width: 1.4em; text-align: center; font-weight: 600; }
.spec-buy { width: 100%; }
</style>
