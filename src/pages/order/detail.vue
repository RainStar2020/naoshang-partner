<template>
  <view class="shop-page order-page">
    <view class="commerce-column">
      <BusinessPageHeader title="订单详情" fallback="/pages/profile/index" />
      <view class="shop-body">
        <FeaturePageState :status="status" :error="error" @retry="load" />
        <template v-if="data">
          <view v-if="data.order.status === 'PENDING_PAYMENT' && data.order.fulfillmentNotice" class="order-notice">{{ data.order.fulfillmentNotice }}</view>
          <view class="status-banner">
            <image :src="statusIcon" mode="aspectFit" />
            <view>
              <text class="status-title">订单{{ data.order.statusLabel }}</text>
              <text v-if="subtitle" class="status-sub">{{ subtitle }}</text>
            </view>
          </view>
          <view v-if="data.order.address" class="shop-card address-card">
            <image src="/static/common/icon-location-accent.png" mode="aspectFit" />
            <view class="pick-copy">
              <text class="address-person">{{ data.order.address.recipient }} {{ data.order.address.phone }}</text>
              <text class="address-detail">{{ (data.order.address.regionNames || []).join('') }} {{ data.order.address.detail }}</text>
            </view>
          </view>
          <view v-if="member" class="shop-card member-row">
            <image class="member-avatar" :src="member.avatarUrl || '/static/partner/avatar-member.png'" mode="aspectFill" />
            <view class="pick-copy">
              <view class="pick-title">
                <text class="member-name">{{ member.name }}</text>
                <text v-if="member.badge" class="blue-pill">{{ member.badge }}</text>
              </view>
              <view v-if="member.displayId || member.gradeLabel || member.genderLabel" class="member-meta">
                <text v-if="member.displayId">ID：{{ member.displayId }}</text>
                <text v-if="member.gradeLabel">年级：{{ member.gradeLabel }}</text>
                <text v-if="member.genderLabel">性别：{{ member.genderLabel }}</text>
              </view>
            </view>
          </view>
          <view v-if="data.order.store" class="shop-card store-card">
            <image :src="data.order.store.coverUrl || '/static/common/icon-store.png'" mode="aspectFill" />
            <view class="pick-copy">
              <view class="store-name-row">
                <text class="store-name">{{ data.order.store.name }}</text>
                <text v-if="data.order.store.number" class="store-no">{{ data.order.store.number }}</text>
              </view>
              <text v-if="data.order.store.managerName" class="store-manager">店长信息：{{ data.order.store.managerName }}<text v-if="data.order.store.phone">/{{ data.order.store.phone }}</text></text>
              <text class="store-address">{{ data.order.store.address }}</text>
            </view>
          </view>
          <view class="shop-card goods-card">
            <view class="goods-count">共{{ pieceCount }}件商品</view>
            <view v-for="line in data.order.items" :key="line.id" class="order-product">
              <image :src="line.coverUrl || '/static/product/product-cover.png'" mode="aspectFill" />
              <view class="order-product-copy">
                <text class="order-product-title">{{ line.title }}</text>
                <text v-if="line.specLabel" class="order-spec">{{ line.specLabel }}</text>
              </view>
              <view class="order-product-side">
                <text class="shop-price">¥{{ plainYuan(line.unitAmount) }}</text>
                <text class="order-count">x{{ line.quantity }}</text>
              </view>
            </view>
            <view class="order-line"><text>订单备注</text><text>{{ data.order.remark || '暂无备注' }}</text></view>
            <view class="order-line"><text>商品金额</text><text>¥{{ money(data.order.goodsAmount) }}</text></view>
            <view class="order-line"><text>折扣优惠</text><text>{{ data.order.tierDiscountLabel || '无' }}</text></view>
            <view class="order-line"><text>优惠券</text><text>{{ couponText }}</text></view>
            <view class="order-line"><text>总计</text><text class="order-pay">¥{{ money(data.order.payableAmount) }}</text></view>
          </view>
          <view class="shop-card info-card">
            <view class="info-title">订单信息</view>
            <view class="order-line">
              <text>订单编号</text>
              <view class="order-no">
                <text>{{ data.order.orderNo }}</text>
                <button class="copy-pill" @click="copyNumber">复制</button>
              </view>
            </view>
            <view v-for="field in timeFields" :key="field.key" class="order-line"><text>{{ field.label }}</text><text>{{ businessDateLabel(data.order[field.key]) }}</text></view>
            <view v-if="data.order.paymentChannelLabel" class="order-line"><text>支付方式</text><text>{{ data.order.paymentChannelLabel }}</text></view>
            <view v-if="data.order.fulfillmentType === 'PHYSICAL' && data.order.trackingNo && !subtitle.includes(data.order.trackingNo)" class="order-line"><text>物流单号</text><text>{{ data.order.trackingNo }}</text></view>
          </view>
          <text v-if="actionError" class="shop-error">{{ actionError }}</text>
        </template>
      </view>
    </view>
    <view v-if="data?.order.allowedActions.length" class="shop-footer order-footer">
      <view v-if="can('pay')" class="footer-total">合计：<text>¥{{ money(data.order.payableAmount) }}</text></view>
      <button v-if="can('cancel')" class="shop-secondary" :disabled="busy" @click="act('cancel')">取消订单</button>
      <button v-if="can('pay')" class="shop-primary" @click="pay">去支付</button>
      <button v-if="can('confirm-receipt')" class="shop-primary" :disabled="busy" @click="act('confirm-receipt')">确认收货</button>
    </view>
  </view>
</template>
<script setup>
import { ref, computed, watch } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { useAuth } from '../../composables/useAuth'
import { useAsyncPage } from '../../composables/useAsyncPage'
import { getCommerceOrder, changeOrder, commerceRequestKey } from '../../services/commerce'
import { money } from '../../features/exclusive/format'
import { businessDateLabel } from '../../features/business/format'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
import FeaturePageState from '../../components/FeaturePageState.vue'
useAuth()
let id = '', contextId = '', active = true, operation = null, timer, expiryReload = false
const busy = ref(false), actionError = ref(''), now = ref(Date.now())
const { data, status, error, load } = useAsyncPage(() => getCommerceOrder(id, contextId), false)
const can = action => data.value?.order.allowedActions.includes(action)
const plainYuan = value => money(value).replace(/\.00$/, '')
const pieceCount = computed(() => (data.value?.order.items || []).reduce((sum, line) => sum + line.quantity, 0))
const member = computed(() => {
  const order = data.value?.order
  if (!order || order.fulfillmentType !== 'OFFLINE_SERVICE') return null
  if (order.memberCard?.name) return order.memberCard
  if (!order.memberName) return null
  return { name: order.memberName, badge: '', displayId: '', gradeLabel: '', genderLabel: '', avatarUrl: '' }
})
const couponText = computed(() => {
  const order = data.value?.order
  if (!order?.discountAmount) return '未使用'
  return `${order.couponTitle ? order.couponTitle + ' ' : ''}−¥${money(order.discountAmount)}`
})
const statusIcon = computed(() => {
  const order = data.value?.order
  if (!order) return ''
  if (order.status === 'CANCELLED') return '/static/order/icon-cancelled.png'
  if (order.status === 'PENDING_PAYMENT') return '/static/order/icon-pending-payment.png'
  if (order.status === 'COMPLETED') return '/static/order/icon-completed.png'
  if (order.fulfillmentStatus === 'SHIPPED') return '/static/order/icon-pending-receipt.png'
  return '/static/order/icon-pending-shipment.png'
})
const subtitle = computed(() => {
  const order = data.value?.order
  if (!order) return ''
  if (order.status === 'CANCELLED') return order.cancelReason || '订单已关闭'
  if (order.status === 'PENDING_PAYMENT') return countdown.value
  if (order.fulfillmentType === 'PHYSICAL') {
    if (order.trackingNo && (order.fulfillmentStatus === 'SHIPPED' || order.status === 'COMPLETED')) return `顺丰快递 ${order.trackingNo}`
    if (order.status === 'COMPLETED') return ''
    return '您的订单等待发货，请耐心等待哦～'
  }
  if (order.fulfillmentType === 'OFFLINE_SERVICE' && order.status === 'COMPLETED') return '该单为线下交付产品，请前往门店使用'
  return ''
})
const countdown = computed(() => {
  const expires = Date.parse(data.value?.order?.expiresAt)
  if (!Number.isFinite(expires)) return '请在有效期内完成支付'
  const sec = Math.max(0, Math.ceil((expires - now.value) / 1000))
  const pad = value => String(value).padStart(2, '0')
  return `剩余支付时间 ${pad(Math.floor(sec / 3600))}:${pad(Math.floor(sec / 60) % 60)}:${pad(sec % 60)}`
})
const timeFields = computed(() => [{ key: 'createdAt', label: '下单时间' }, { key: 'paidAt', label: '支付时间' }, { key: 'shippedAt', label: '发货时间' }, { key: 'receivedAt', label: '收货时间' }, { key: 'cancelledAt', label: '取消时间' }].filter(field => data.value?.order[field.key]))
watch(now, () => {
  const order = data.value?.order
  if (!order || order.status !== 'PENDING_PAYMENT') { expiryReload = false; return }
  const expires = Date.parse(order.expiresAt)
  if (!expiryReload && Number.isFinite(expires) && expires <= now.value) { expiryReload = true; load() }
})
function pay() { uni.navigateTo({ url: `/pages/payment/cashier?orderId=${encodeURIComponent(id)}` }) }
function copyNumber() { uni.setClipboardData({ data: data.value.order.orderNo }) }
async function act(action) {
  if (busy.value) return
  const confirmed = await new Promise(resolve => uni.showModal({ title: action === 'cancel' ? '取消订单' : '确认收货', content: action === 'cancel' ? '确定要取消该订单吗？' : '确认已经收到商品？', success: result => resolve(result.confirm), fail: () => resolve(false) }))
  if (!confirmed || busy.value) return
  busy.value = true
  actionError.value = ''
  const version = data.value.order.version
  if (!operation || operation.action !== action || operation.version !== version) operation = { action, version, key: commerceRequestKey() }
  try { await changeOrder(id, action, version, operation.key); if (active) { operation = null; await load() } }
  catch (reason) { if (active) actionError.value = reason.message }
  finally { if (active) busy.value = false }
}
onLoad(query => { id = query.id || ''; contextId = query.contextId || '' })
onShow(() => { now.value = Date.now(); clearInterval(timer); timer = setInterval(() => { if (active) now.value = Date.now() }, 1000); load() })
onUnload(() => { active = false; clearInterval(timer) })
</script>
<style>@import '../../styles/commerce.css';</style>
<style scoped>
.order-page { background: #272c47; }
.commerce-column { max-width: 750px; margin: 0 auto; }
.order-page .shop-body { padding: .4em 1em 1.2em; }
.order-page .shop-card { border-radius: .85em; background: #353a59; padding: .95em 1em; }
.order-notice { margin: .2em 0 .85em; color: #b7bdd2; font-size: .9em; line-height: 1.5; text-align: center; }
.status-banner { display: flex; align-items: center; gap: .7em; padding: .35em .15em 1em; }
.status-banner image { width: 2.4em; height: 2.4em; flex-shrink: 0; }
.status-title { display: block; font-size: 1.12em; font-weight: 700; line-height: 1.4; }
.status-sub { display: block; margin-top: .2em; color: #b7bdd2; font-size: .88em; line-height: 1.5; overflow-wrap: anywhere; }
.address-card, .member-row, .store-card, .order-line, .order-no { display: flex; align-items: center; gap: .7em; min-width: 0; }
.address-card > image { width: 1.35em; height: 1.35em; flex-shrink: 0; }
.pick-copy { flex: 1; min-width: 0; }
.address-person { display: block; font-weight: 600; line-height: 1.45; }
.address-detail, .store-address, .store-manager { display: block; color: #9aa3bd; font-size: .86em; line-height: 1.55; overflow-wrap: anywhere; }
.address-detail { margin-top: .25em; }
.member-row { align-items: center; }
.member-avatar { width: 3.15em; height: 3.15em; border-radius: 50%; flex-shrink: 0; background: #464c6b; }
.pick-title, .store-name-row { display: flex; align-items: center; flex-wrap: wrap; gap: .35em; min-width: 0; }
.member-name, .store-name { font-weight: 600; line-height: 1.45; }
.blue-pill, .store-no { display: inline-flex; align-items: center; padding: .05em .45em; border-radius: .35em; background: #2f78ff; color: #fff; font-size: .75em; line-height: 1.55; }
.member-meta { display: flex; flex-wrap: wrap; gap: .2em .7em; margin-top: .25em; color: #9aa3bd; font-size: .82em; line-height: 1.45; }
.store-card { align-items: flex-start; }
.store-card > image { width: 4.5em; height: 4.5em; border-radius: .4em; flex-shrink: 0; background: #464c6b; }
.store-manager { margin-top: .3em; }
.store-address { margin-top: .15em; }
.goods-count { font-weight: 600; margin-bottom: .85em; }
.order-product { display: flex; align-items: flex-start; gap: .7em; min-width: 0; }
.order-product + .order-product { margin-top: .85em; }
.order-product > image { width: 4.7em; height: 4.7em; border-radius: .4em; flex-shrink: 0; background: #1c2238; }
.order-product-copy { flex: 1; min-width: 0; }
.order-product-title { display: -webkit-box; overflow: hidden; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.45; }
.order-spec { display: inline-block; max-width: 100%; margin-top: .45em; padding: .12em .65em; border-radius: 1em; background: #464c6b; color: #c5cadb; font-size: .78em; line-height: 1.5; }
.order-product-side { flex-shrink: 0; text-align: right; }
.order-product-side .shop-price { font-size: 1.05em; font-weight: 700; }
.order-count { display: block; margin-top: .25em; color: #9aa3bd; font-size: .86em; }
.order-line { justify-content: space-between; margin-top: .9em; line-height: 1.5; }
.order-line > text:first-child { color: #d5dced; flex-shrink: 0; }
.order-line > text:last-child { min-width: 0; text-align: right; overflow-wrap: anywhere; }
.order-pay { color: #ff4676; font-weight: 700; }
.info-title { font-weight: 700; line-height: 1.45; }
.info-card .order-line:first-of-type { margin-top: .85em; }
.order-no { flex: 1; justify-content: flex-end; }
.order-no > text { min-width: 0; text-align: right; overflow-wrap: anywhere; }
.copy-pill { margin: 0; padding: 0 .5em; border-radius: .7em; border: 1px solid #3d8dff; background: transparent; color: #7eb6ff; font-size: .75em; line-height: 1.7; flex-shrink: 0; }
.order-page .shop-footer { width: min(750px, 100%); left: 50%; right: auto; transform: translateX(-50%); justify-content: flex-end; gap: .7em; background: #313652; }
.footer-total { margin-right: auto; color: #d5dced; }
.footer-total text { color: #ff4676; font-weight: 700; }
.order-footer .shop-primary, .order-footer .shop-secondary { min-width: 7.2em; }
</style>
