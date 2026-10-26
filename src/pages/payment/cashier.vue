<template>
  <view class="shop-page cashier-page">
    <view class="commerce-column">
      <BusinessPageHeader title="收银台" fallback="/pages/selection/index" />
      <view class="shop-body">
        <FeaturePageState :status="status" :error="error" @retry="load" />
        <template v-if="order">
          <view class="cashier-amount">
            <text>待支付金额</text>
            <text class="cashier-sum">¥{{ money(order.payableAmount) }}</text>
          </view>
          <text class="cashier-heading">支付详情</text>
          <view class="shop-card cashier-card">
            <view v-if="platformLabel" class="cashier-line"><text>平台</text><text>{{ platformLabel }}</text></view>
            <view class="cashier-line"><text>收款编号</text><text>{{ order.orderNo }}</text></view>
            <view class="cashier-line"><text>剩余支付时间</text><text>{{ remaining }}</text></view>
          </view>
          <text class="cashier-heading">支付方式</text>
          <view class="shop-card cashier-card">
            <button v-for="item in channels" :key="item.id" class="shop-channel" :class="{ selected: channel === item.id }" :disabled="busy || !!attemptId" @click="channel = item.id">
              <view class="shop-payment-mark" :class="`payment-${item.id}`">{{ paymentMark(item.id) }}</view>
              <view class="shop-channel-copy">
                <text>{{ item.label }}</text>
                <text v-if="item.hint">{{ item.hint }}</text>
              </view>
              <image :src="channel === item.id ? '/static/common/icon-radio-checked.png' : '/static/common/icon-radio-unchecked.png'" mode="aspectFit" />
            </button>
          </view>
          <text v-if="channels.length === 1" class="shop-payment-note">该订单仅支持{{ channels[0].label }}。</text>
          <text v-if="message" class="shop-error">{{ message }}</text>
          <button class="cashier-order-link" @click="details">查看订单</button>
        </template>
      </view>
    </view>
    <view v-if="order" class="shop-footer">
      <button class="shop-primary cashier-pay" :disabled="payDisabled" @click="attemptId ? check() : pay()">{{ payLabel }}</button>
    </view>
  </view>
</template>
<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { useAuth } from '../../composables/useAuth'
import { getCommerceOrder, getPaymentChannels, startPayment, queryPayment, commerceRequestKey, getPendingPayment } from '../../services/commerce'
import { money } from '../../features/exclusive/format'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
import FeaturePageState from '../../components/FeaturePageState.vue'
useAuth()
let id = '', active = true, timer, offset = 0, loaded = false, paymentKey = '', paymentChannel = ''
const order = ref(null), channels = ref([]), channel = ref(''), platformLabel = ref(''), status = ref('loading'), error = ref(''), busy = ref(false), message = ref(''), attemptId = ref(''), now = ref(Date.now())
const expired = computed(() => order.value && Date.parse(order.value.expiresAt) <= now.value + offset)
const remaining = computed(() => {
  const sec = Math.max(0, Math.ceil((Date.parse(order.value?.expiresAt) - now.value - offset) / 1000))
  const seconds = sec % 60
  return `${Math.floor(sec / 60)}分${seconds < 10 ? '0' : ''}${seconds}秒`
})
const payDisabled = computed(() => busy.value || !channel.value || (attemptId.value ? false : expired.value || !order.value?.allowedActions.includes('pay')))
const payLabel = computed(() => busy.value ? '处理中…' : attemptId.value ? '查询支付结果' : '确认支付')
async function load() {
  status.value = 'loading'
  try {
    const [result, ways] = await Promise.all([getCommerceOrder(id), getPaymentChannels(id)])
    if (!active) return
    order.value = result.order
    const pending = getPendingPayment(id)
    if (pending) {
      attemptId.value = pending.attemptId || ''
      channel.value = pending.channel
      paymentKey = pending.key
      paymentChannel = pending.channel
    }
    offset = Date.parse(result.serverTime || new Date().toISOString()) - Date.now()
    channels.value = ways.items
    platformLabel.value = ways.platformLabel || ''
    if (!channel.value) channel.value = ways.items[0]?.id || ''
    status.value = 'ready'
  } catch (reason) {
    if (active) { error.value = reason.message; status.value = 'error' }
  }
}
function details() { uni.redirectTo({ url: `/pages/order/detail?id=${encodeURIComponent(id)}` }) }
async function check() {
  if (busy.value || !attemptId.value) return
  busy.value = true
  try {
    const result = await queryPayment(attemptId.value)
    if (!active) return
    if (result.status === 'SUCCEEDED') { uni.showToast({ title: '支付成功', icon: 'success' }); details() }
    else if (result.status === 'PROCESSING') message.value = '支付处理中，请稍后查询'
    else {
      message.value = result.status === 'CANCELLED' ? '支付已取消，可重新发起' : '支付失败，请重新选择支付方式'
      attemptId.value = ''
      paymentKey = ''
      await load()
    }
  } catch (reason) { if (active) message.value = reason.message }
  finally { if (active) busy.value = false }
}
async function pay() {
  if (busy.value || attemptId.value) return
  busy.value = true
  message.value = ''
  if (!paymentKey || paymentChannel !== channel.value) { paymentKey = commerceRequestKey(); paymentChannel = channel.value }
  try {
    const attempt = await startPayment(id, channel.value, paymentKey)
    if (!active) return
    attemptId.value = attempt.id
  } catch (reason) { if (active) message.value = reason.message }
  finally { if (active) busy.value = false }
  if (attemptId.value) await check()
}
const paymentMark = value => ({ wechat: '微', alipay: '支', unionpay: '银', 'bank-card': '卡' }[value] || '付')
onLoad(query => { id = query.orderId || ''; loaded = true; timer = setInterval(() => { now.value = Date.now() }, 1000) })
onShow(() => { if (loaded) { load(); if (attemptId.value) check() } })
onUnload(() => { active = false; clearInterval(timer) })
</script>
<style>@import '../../styles/commerce.css';</style>
<style scoped>
.cashier-page { background: #272c47; }
.commerce-column { max-width: 750px; margin: 0 auto; }
.cashier-page .shop-body { padding: .4em 1em 1.2em; }
.cashier-amount { display: flex; flex-direction: column; align-items: center; gap: .35em; padding: 1.3em 0 1.15em; color: #b7bdd2; }
.cashier-sum { color: #fff; font-size: 2.55em; font-weight: 700; line-height: 1.15; }
.cashier-heading { display: block; margin: .15em 0 .7em; font-weight: 600; }
.cashier-card { border-radius: .85em; background: #353a59; padding: .35em 1em; }
.cashier-line { display: flex; align-items: center; justify-content: space-between; gap: .8em; min-width: 0; padding: .72em 0; }
.cashier-line text:first-child { color: #b7bdd2; flex-shrink: 0; }
.cashier-line text:last-child { min-width: 0; text-align: right; overflow-wrap: anywhere; }
.cashier-page .shop-channel { margin: 0; padding: .85em 0; background: transparent; box-shadow: none; border-radius: 0; }
.cashier-page .shop-channel.selected { margin: 0; padding: .85em 0; background: transparent; box-shadow: none; }
.cashier-page .shop-channel image { width: 1.35em; height: 1.35em; }
.cashier-order-link { display: block; width: 100%; margin: .2em 0 0; padding: .4em 0; background: none; color: #8ea4d4; text-align: center; }
.cashier-page .shop-footer { width: min(750px, 100%); left: 50%; right: auto; transform: translateX(-50%); background: #272c47; padding-left: 1.15em; padding-right: 1.15em; }
.cashier-pay { width: 100%; }
.cashier-pay[disabled] { opacity: .45; }
</style>
