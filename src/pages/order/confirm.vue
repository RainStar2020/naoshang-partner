<template>
  <view class="shop-page confirm-page">
    <view class="commerce-column">
      <BusinessPageHeader title="确认订单" fallback="/pages/selection/index" />
      <view class="shop-body">
        <FeaturePageState :status="status" :error="error" @retry="load" />
        <template v-if="data">
          <view v-if="data.product.checkoutNotice" class="checkout-notice">{{ data.product.checkoutNotice }}</view>
          <view v-if="data.product.fulfillmentType === 'PHYSICAL'" class="shop-card pick-card" @click="openSheet('addresses')">
            <view v-if="address" class="pick-filled">
              <view class="pick-copy">
                <view class="pick-title">
                  <text v-if="address.isDefault" class="blue-pill">默认</text>
                  <text>{{ address.recipient }} {{ address.phone }}</text>
                </view>
                <text class="pick-detail">{{ addressLine(address) }}</text>
              </view>
              <image class="pick-chevron" src="/static/common/icon-chevron-right.png" mode="aspectFit" />
            </view>
            <view v-else class="pick-empty">
              <text>收货地址</text>
              <view class="pick-action">请选择 <image src="/static/common/icon-chevron-right.png" mode="aspectFit" /></view>
            </view>
          </view>
          <view v-if="data.product.requiresMember" class="shop-card pick-card" @click="openSheet('members')">
            <view v-if="member" class="member-row">
              <image class="member-avatar" :src="member.avatarUrl || '/static/partner/avatar-member.png'" mode="aspectFill" />
              <view class="pick-copy">
                <view class="pick-title">
                  <text class="member-name">{{ member.name }}</text>
                  <text v-if="member.badge" class="blue-pill">{{ member.badge }}</text>
                </view>
                <view class="member-meta">
                  <text>ID：{{ member.displayId }}</text>
                  <text>年级：{{ member.gradeLabel }}</text>
                  <text>性别：{{ member.genderLabel }}</text>
                </view>
              </view>
              <image class="pick-chevron" src="/static/common/icon-chevron-right.png" mode="aspectFit" />
            </view>
            <view v-else class="pick-empty">
              <text>选择服务会员</text>
              <view class="pick-action">请选择 <image src="/static/common/icon-chevron-right.png" mode="aspectFit" /></view>
            </view>
          </view>
          <view v-if="store" class="shop-card store-card" @click="openStores">
            <image :src="store.coverUrl || '/static/common/icon-store.png'" mode="aspectFill" />
            <view class="pick-copy">
              <view class="store-name-row">
                <text class="store-name">{{ store.name }}</text>
                <text v-if="store.number" class="store-no">{{ store.number }}</text>
                <text v-if="storeChoices.length > 1" class="store-switch">切换</text>
              </view>
              <text class="store-manager">店长信息：{{ store.managerName }}<text v-if="store.phone">/{{ store.phone }}</text></text>
              <text class="store-address">{{ store.address }}</text>
            </view>
          </view>
          <view class="shop-card goods-card">
            <view class="goods-count">共{{ draft.quantity }}件商品</view>
            <view class="confirm-product">
              <image :src="data.product.coverUrl" mode="aspectFill" />
              <view class="confirm-product-copy">
                <text class="confirm-product-title">{{ data.product.title }}</text>
              </view>
              <view class="confirm-product-side">
                <text class="shop-price">¥{{ plainYuan(selectedSku?.amount) }}</text>
                <text class="confirm-count">x{{ draft.quantity }}</text>
              </view>
            </view>
            <text v-if="selectedSku" class="confirm-spec">{{ selectedSku.label }}</text>
            <view class="confirm-line">
              <text>订单备注</text>
              <input v-model="draft.remark" class="confirm-remark" placeholder="请输入" placeholder-class="confirm-placeholder" maxlength="200" :disabled="busy || !!pendingCreation" />
            </view>
            <view class="confirm-line"><text>商品金额</text><text>{{ quote ? '¥' + money(quote.goodsAmount) : '—' }}</text></view>
            <view class="confirm-line"><text>折扣优惠</text><text>{{ quote?.tierDiscountLabel || data.product.checkoutDiscountLabel || '无' }}</text></view>
            <view class="confirm-line" @click="openCoupons">
              <text>优惠券</text>
              <view class="confirm-line-value">
                <text v-if="selectedCoupon && quote">−¥{{ money(quote.discountAmount) }}</text>
                <text v-else class="confirm-placeholder">请选择</text>
                <image class="pick-chevron" src="/static/common/icon-chevron-right.png" mode="aspectFit" />
              </view>
            </view>
            <view class="confirm-line"><text>总计</text><text class="confirm-pay">{{ quote ? '¥' + money(quote.payableAmount) : '—' }}</text></view>
            <text v-if="operationError" class="shop-error">{{ operationError }}</text>
          </view>
        </template>
      </view>
    </view>
    <view v-if="data" class="shop-footer">
      <view class="confirm-total">合计：<text class="shop-price">¥{{ quote ? money(quote.payableAmount) : '—' }}</text></view>
      <button class="shop-primary" :disabled="busy" @click="submit">{{ submitLabel }}</button>
    </view>
    <view v-if="selectionType" class="shop-mask" @click="selectionType = ''">
      <view v-if="selectionType === 'members'" class="shop-sheet" role="dialog" aria-label="选择会员" @click.stop>
        <view class="sheet-heading">
          <view class="sheet-side" />
          <text class="sheet-title">选择会员</text>
          <button class="shop-close sheet-side" aria-label="关闭" @click="selectionType = ''"><image src="/static/common/icon-close.png" mode="aspectFit" /></button>
        </view>
        <view v-if="!selectionRows.length" class="shop-empty">暂无会员</view>
        <view v-for="(item, index) in selectionRows" :key="item.id" class="member-card" @click="chooseEntity(item)">
          <text class="member-index">会员{{ index + 1 }}</text>
          <image class="member-avatar" :src="item.avatarUrl || '/static/partner/avatar-member.png'" mode="aspectFill" />
          <view class="pick-copy">
            <view class="pick-title">
              <text class="member-name">{{ item.name }}</text>
              <text v-if="item.badge" class="blue-pill">{{ item.badge }}</text>
            </view>
            <view class="member-meta">
              <text>ID：{{ item.displayId }}</text>
              <text>年级：{{ item.gradeLabel }}</text>
              <text>性别：{{ item.genderLabel }}</text>
            </view>
          </view>
        </view>
      </view>
      <view v-else class="shop-sheet" role="dialog" :aria-label="sheetTitle" @click.stop>
        <view class="sheet-heading">
          <view class="sheet-side" />
          <text class="sheet-title">{{ sheetTitle }}</text>
          <button class="shop-close sheet-side" aria-label="关闭" @click="selectionType = ''"><image src="/static/common/icon-close.png" mode="aspectFit" /></button>
        </view>
        <view v-if="!selectionRows.length" class="shop-empty">{{ selectionType === 'addresses' ? '暂无收货地址' : '暂无可选门店' }}</view>
        <view v-for="item in selectionRows" :key="item.id" class="sheet-choice" @click="chooseEntity(item)">
          <view class="pick-title">{{ selectionType === 'addresses' ? item.recipient + ' ' + item.phone : item.name }}</view>
          <text class="pick-detail">{{ selectionType === 'addresses' ? addressLine(item) : item.address }}</text>
        </view>
        <button v-if="selectionType === 'addresses'" class="shop-link sheet-manage" @click="manageAddresses">管理收货地址</button>
      </view>
    </view>
    <view v-if="couponOpen" class="shop-mask" @click="couponOpen = false">
      <view class="shop-sheet" role="dialog" aria-label="选择优惠券" @click.stop>
        <view class="sheet-heading">
          <view class="sheet-side" />
          <text class="sheet-title">可用优惠券（{{ coupons.length }}）</text>
          <button class="shop-close sheet-side" aria-label="关闭" @click="couponOpen = false"><image src="/static/common/icon-close.png" mode="aspectFit" /></button>
        </view>
        <view v-if="!coupons.length" class="shop-empty">暂无可用优惠券</view>
        <view v-for="item in coupons" :key="item.id" class="coupon-card" @click="pendingCouponId = pendingCouponId === item.id ? null : item.id">
          <view class="coupon-value">
            <view class="coupon-amount"><text class="coupon-yen">¥</text>{{ plainYuan(item.amount) }}</view>
            <text class="coupon-threshold">{{ couponThreshold(item) }}</text>
          </view>
          <view class="coupon-copy">
            <text class="coupon-title">{{ item.title }}</text>
            <text class="coupon-expire">{{ couponExpire(item) }}</text>
            <text v-if="item.scopeLabel" class="coupon-scope">{{ item.scopeLabel }}</text>
          </view>
          <image class="coupon-radio" :src="pendingCouponId === item.id ? '/static/common/icon-radio-checked.png' : '/static/common/icon-radio-unchecked.png'" mode="aspectFit" />
        </view>
        <button class="coupon-clear" :disabled="busy || !!pendingCreation" @click="pendingCouponId = null">不使用优惠券</button>
        <button class="shop-primary coupon-confirm" :disabled="busy || !!pendingCreation" @click="confirmCoupon">确定</button>
      </view>
    </view>
  </view>
</template>
<script setup>
import { ref, computed } from 'vue'
import { config } from '../../config'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { useAuth } from '../../composables/useAuth'
import { getProduct, getCheckoutOptions, quoteCheckout, createCheckoutOrder, commerceRequestKey, getPendingCheckout, rememberPendingCheckout, clearPendingCheckout, isCheckoutRejection } from '../../services/commerce'
import { money } from '../../features/exclusive/format'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
import FeaturePageState from '../../components/FeaturePageState.vue'
useAuth()
const selectionType = ref('')
const pendingCreation = ref(null)
const couponOpen = ref(false)
const pendingCouponId = ref(null)
const data = ref(null)
const status = ref('loading')
const error = ref('')
const operationError = ref('')
const busy = ref(false)
const quote = ref(null)
const draft = ref({ quantity: 1, remark: '', couponId: null })
let epoch = 0
let active = true
let quoteEpoch = 0
let attemptKey = ''
let submitted = false
const plainYuan = value => money(value).replace(/\.00$/, '')
const selectionRows = computed(() => data.value?.options[selectionType.value] || [])
const coupons = computed(() => data.value?.options.coupons || [])
const storeChoices = computed(() => data.value?.options.stores || [])
const address = computed(() => data.value?.options.addresses.find(item => item.id === draft.value.addressId))
const member = computed(() => data.value?.options.members.find(item => item.id === draft.value.memberId))
const store = computed(() => data.value?.options.stores.find(item => item.id === draft.value.storeId))
const selectedSku = computed(() => data.value?.product.skus.find(item => item.id === draft.value.skuId) || null)
const selectedCoupon = computed(() => coupons.value.find(item => item.id === draft.value.couponId) || null)
const sheetTitle = computed(() => ({ addresses: '选择收货地址', stores: '选择所属门店' }[selectionType.value] || ''))
const submitLabel = computed(() => busy.value ? '处理中…' : pendingCreation.value ? '重试原订单提交' : '确认订单')
function addressLine(item) { return `${(item.regionNames || []).join('')}${item.detail || ''}` }
function couponThreshold(item) {
  if (item.thresholdLabel) return item.thresholdLabel
  if (!item.minAmount) return '无门槛'
  return `满${plainYuan(item.minAmount)}可用`
}
function couponExpire(item) {
  if (item.expiresLabel) return item.expiresLabel
  const time = Date.parse(item.expiresAt)
  if (!Number.isFinite(time)) return ''
  const date = new Date(time)
  const pad = value => String(value).padStart(2, '0')
  return `有效期至${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`
}
function requirementsMet() {
  const product = data.value?.product
  if (!product || !draft.value.storeId) return false
  if (product.fulfillmentType === 'PHYSICAL' && !draft.value.addressId) return false
  if (product.requiresMember && !draft.value.memberId) return false
  return true
}
function remarkChanged() { return (quote.value?.remark || '') !== String(draft.value.remark || '').trim() }
function invalidate() {
  if (pendingCreation.value) return
  ++quoteEpoch
  quote.value = null
  attemptKey = ''
  operationError.value = ''
}
async function calculate() {
  if (!data.value) return
  const current = ++quoteEpoch
  quote.value = null
  try {
    const result = await quoteCheckout({ ...draft.value })
    if (active && current === quoteEpoch) { quote.value = result; attemptKey = commerceRequestKey() }
  } catch (reason) {
    if (active && current === quoteEpoch) operationError.value = reason.message
  }
}
function refreshQuote() {
  if (pendingCreation.value) return
  invalidate()
  if (requirementsMet()) calculate()
}
function openSheet(type) {
  if (busy.value || pendingCreation.value) return
  selectionType.value = type
}
function openStores() {
  if (busy.value || pendingCreation.value || data.value?.options.deliveryLocked || storeChoices.value.length < 2) return
  selectionType.value = 'stores'
}
function chooseEntity(item) {
  const field = { addresses: 'addressId', members: 'memberId', stores: 'storeId' }[selectionType.value]
  if (!field) return
  draft.value[field] = item.id
  selectionType.value = ''
  refreshQuote()
}
function openCoupons() {
  if (busy.value || pendingCreation.value) return
  pendingCouponId.value = draft.value.couponId
  couponOpen.value = true
}
function confirmCoupon() {
  const next = pendingCouponId.value || null
  couponOpen.value = false
  if (draft.value.couponId === next) return
  draft.value.couponId = next
  refreshQuote()
}
async function load() {
  const current = ++epoch
  status.value = 'loading'
  try {
    const [product, options] = await Promise.all([getProduct(draft.value.productId), getCheckoutOptions(draft.value.productId)])
    if (!active || current !== epoch) return
    options.addresses = options.addresses.map(item => ({ ...item, display: `${item.recipient} ${(item.regionNames || []).join('')}${item.detail}` }))
    data.value = { product, options }
    if (!pendingCreation.value && (options.deliveryLocked || !options.stores.some(item=>item.id===draft.value.storeId))) draft.value.storeId = options.defaultStoreId || options.stores[0]?.id
    const selected = options.addresses.find(item => item.id === draft.value.addressId) || options.addresses.find(item => item.isDefault)
    draft.value.addressId = selected?.id
    status.value = 'ready'
    if (pendingCreation.value) {
      quote.value = pendingCreation.value.quote
      attemptKey = pendingCreation.value.key
      return
    }
    refreshQuote()
  } catch (reason) {
    if (current === epoch) { error.value = reason.message; status.value = 'error' }
  }
}
async function submit() {
  if (busy.value || submitted) return
  busy.value = true
  operationError.value = ''
  try {
    if (!pendingCreation.value && (!quote.value || remarkChanged())) {
      await calculate()
      if (!quote.value) return
    }
    if (!quote.value) return
    if (!pendingCreation.value) pendingCreation.value = rememberPendingCheckout(draft.value, quote.value, attemptKey)
    const intent = pendingCreation.value
    const result = await createCheckoutOrder(intent.quote.id, intent.key)
    clearPendingCheckout(intent.draft)
    if (!active) return
    submitted = true
    uni.redirectTo({ url: `/pages/payment/cashier?orderId=${encodeURIComponent(result.order.id)}` })
  } catch (reason) {
    if (active) {
      operationError.value = reason.message
      if (config.useMock || isCheckoutRejection(reason)) {
        clearPendingCheckout(draft.value)
        pendingCreation.value = null
        quote.value = null
      }
    }
  } finally {
    if (active) busy.value = false
  }
}
function manageAddresses() {
  if (pendingCreation.value) return
  invalidate()
  uni.navigateTo({ url: '/pages/address/list' })
}
let initialized = false
onLoad(query => {
  draft.value = { ...draft.value, productId: query.productId || '', skuId: query.skuId || '', quantity: Number(query.quantity || 1) }
  const pending = getPendingCheckout(draft.value)
  if (pending) {
    pendingCreation.value = pending
    draft.value = { ...pending.draft }
    quote.value = pending.quote
    attemptKey = pending.key
  }
  initialized = true
})
onShow(() => { if (initialized && !submitted) load() })
onUnload(() => { active = false; ++epoch; ++quoteEpoch })
</script>
<style>@import '../../styles/commerce.css';</style>
<style>
.confirm-placeholder { color: #8d93ab; }
</style>
<style scoped>
.confirm-page { background: #272c47; }
.commerce-column { max-width: 750px; margin: 0 auto; }
.confirm-page .shop-body { padding: .85em 1em 1.2em; }
.confirm-page .shop-card { border-radius: .85em; background: #353a59; padding: .95em 1em; }
.checkout-notice { text-align: center; color: #b7bdd2; font-size: .92em; line-height: 1.6; padding: .15em .4em .85em; }
.pick-card { margin-bottom: .85em; }
.pick-empty, .pick-filled, .member-row, .store-card, .confirm-line, .confirm-line-value { display: flex; align-items: center; justify-content: space-between; gap: .7em; min-width: 0; }
.pick-empty text, .confirm-line > text:first-child { color: #d5dced; }
.pick-action { display: flex; align-items: center; gap: .2em; color: #9aa3bd; flex-shrink: 0; }
.pick-action image, .pick-chevron { width: .85em; height: .85em; flex-shrink: 0; }
.pick-copy { flex: 1; min-width: 0; }
.pick-title { display: flex; align-items: center; flex-wrap: wrap; gap: .35em .45em; line-height: 1.45; }
.pick-detail, .store-address, .store-manager { display: block; color: #9aa3bd; font-size: .86em; line-height: 1.55; overflow-wrap: anywhere; }
.pick-detail { margin-top: .35em; }
.blue-pill, .store-no { display: inline-flex; align-items: center; padding: .05em .45em; border-radius: .35em; background: #2f78ff; color: #fff; font-size: .75em; line-height: 1.55; }
.member-row { align-items: center; }
.member-avatar { width: 3.15em; height: 3.15em; border-radius: 50%; flex-shrink: 0; background: #464c6b; }
.member-name { font-weight: 600; }
.member-meta { display: flex; flex-wrap: wrap; gap: .2em .7em; margin-top: .25em; color: #9aa3bd; font-size: .82em; line-height: 1.45; }
.store-card { align-items: flex-start; margin-bottom: .85em; }
.store-card > image { width: 4.5em; height: 4.5em; border-radius: .4em; flex-shrink: 0; background: #464c6b; }
.store-name-row { display: flex; align-items: center; flex-wrap: wrap; gap: .35em; min-width: 0; }
.store-name { font-weight: 600; line-height: 1.45; }
.store-switch { margin-left: auto; color: #7eb6ff; font-size: .82em; }
.store-manager { margin-top: .3em; }
.store-address { margin-top: .15em; }
.goods-card { margin-bottom: 0; }
.goods-count { font-weight: 600; margin-bottom: .85em; }
.confirm-product { display: flex; align-items: flex-start; gap: .7em; min-width: 0; }
.confirm-product > image { width: 4.7em; height: 4.7em; border-radius: .4em; flex-shrink: 0; background: #1c2238; }
.confirm-product-copy { flex: 1; min-width: 0; }
.confirm-product-title { display: -webkit-box; overflow: hidden; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.45; }
.confirm-product-side { flex-shrink: 0; text-align: right; }
.confirm-product-side .shop-price { font-size: 1.05em; font-weight: 700; }
.confirm-count { display: block; margin-top: .25em; color: #9aa3bd; font-size: .86em; }
.confirm-spec { display: inline-block; max-width: 100%; margin-top: .7em; padding: .18em .7em; border-radius: 1em; background: #464c6b; color: #c5cadb; font-size: .82em; line-height: 1.5; }
.confirm-line { margin-top: .95em; line-height: 1.5; }
.confirm-line-value { display: flex; align-items: center; gap: .25em; min-width: 0; }
.confirm-remark { flex: 1; min-width: 0; margin: 0; padding: 0; border: 0; background: transparent; color: #fff; font-size: 1em; text-align: right; }
.confirm-pay { color: #ff4676; font-weight: 700; }
.confirm-page .shop-footer { width: min(750px, 100%); left: 50%; right: auto; transform: translateX(-50%); background: #313652; }
.confirm-total { min-width: 0; font-size: 1em; }
.confirm-total .shop-price { font-size: 1.15em; }
.confirm-page .shop-footer .shop-primary { min-width: 8.2em; padding: .65em 1.4em; }
.sheet-heading { display: flex; align-items: center; margin-bottom: .9em; }
.sheet-side { width: 1.6em; flex-shrink: 0; }
.sheet-title { flex: 1; text-align: center; font-size: 1.05em; font-weight: 600; }
.confirm-page .shop-sheet { background: #3a4060; }
.sheet-choice { width: 100%; margin: 0 0 .7em; padding: .85em; text-align: left; background: #484e6e; border-radius: .7em; }
.sheet-manage { display: block; width: 100%; margin-top: .4em; text-align: center; }
.member-card { position: relative; display: flex; align-items: center; gap: .7em; margin: 0 0 .75em; padding: .8em .75em; background: #484e6e; border-radius: .7em; }
.member-index { position: absolute; top: .45em; right: .55em; color: #9aa3bd; font-size: .75em; }
.coupon-card { display: flex; align-items: center; gap: .65em; margin: 0 0 .75em; padding: .65em; background: #484e6e; border-radius: .7em; }
.coupon-value { width: 4.7em; min-height: 4.5em; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: .45em; background: linear-gradient(180deg, #3b86ff, #1d5dff); color: #fff; padding: .3em; }
.coupon-amount { font-size: 1.4em; font-weight: 700; line-height: 1.1; }
.coupon-yen { font-size: .62em; margin-right: .04em; }
.coupon-threshold { margin-top: .15em; font-size: .72em; line-height: 1.3; text-align: center; }
.coupon-copy { flex: 1; min-width: 0; }
.coupon-title { display: block; font-weight: 600; line-height: 1.4; }
.coupon-expire, .coupon-scope { display: block; color: #aeb6d0; font-size: .78em; line-height: 1.45; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.coupon-radio { width: 1.35em; height: 1.35em; flex-shrink: 0; }
.coupon-clear { display: block; width: 100%; margin: .2em 0 .8em; padding: 0; background: none; color: #9eb6de; text-align: center; }
.coupon-confirm { width: 100%; }
</style>
