<template>
  <view class="me-page">
    <view class="me-heading">个人中心</view>
    <view v-if="status === 'loading'" class="account-state">正在加载个人信息…</view>
    <view v-else-if="status === 'error'" class="account-state"><text>{{ error }}</text><button class="secondary" @click="load">重新加载</button></view>
    <template v-else-if="data">
      <view class="me-user"><button class="me-user-main" @click="open('/pages/settings/profile')"><image v-if="data.profile.avatarUrl" class="me-avatar" :src="data.profile.avatarUrl" mode="aspectFill" /><view v-else class="me-avatar letter">{{ data.profile.nickname?.slice(0,1) || '会' }}</view><view class="me-user-info"><view class="me-name">{{ data.profile.nickname }}</view><text class="me-id">ID：{{ data.profile.id }}</text></view><image class="me-chevron" src="/static/common/icon-chevron-right.png" mode="aspectFit" /></button><button v-if="data.profile.inviteCode" class="me-invite" @click="copyInvite">邀请码：{{ data.profile.inviteCode }}<image src="/static/common/icon-copy.png" mode="aspectFit" /></button></view>
      <view class="me-card store-card"><view class="me-section-title">绑定门店</view><view v-if="data.store" class="me-store"><image v-if="data.store.coverUrl" :src="data.store.coverUrl" mode="aspectFill" /><view><view class="me-store-name">{{ data.store.name }}<text v-if="data.store.number" class="store-number">{{ data.store.number }}</text></view><view class="me-muted">{{ data.store.managerName }} {{ data.store.managerPhone }}</view><view class="me-muted">{{ data.store.address }}</view></view></view><text v-else class="unbound-store">暂未绑定门店</text></view>
      <view class="me-card"><view class="me-section-title">我的订单</view><view class="me-shortcuts"><button v-for="item in orderEntries" :key="item.status" @click="openOrders(item.status)"><view class="shortcut-image"><ProfileIcon :name="item.icon" /><text v-if="data.orderCounts?.[item.count]" class="order-count">{{ data.orderCounts[item.count] }}</text></view><text>{{ item.label }}</text></button></view></view>
      <view class="me-card"><view class="me-section-title">专属功能</view><view class="me-shortcuts exclusive-grid"><button v-for="item in exclusiveEntries" :key="item.id" @click="open(item.path)"><ProfileIcon :name="item.icon" disc /><text>{{ item.label }}</text></button></view><text v-if="!exclusiveEntries.length" class="unbound-store">当前身份暂无专属功能</text></view>
      <view class="me-card me-menu"><button v-for="item in menu" :key="item.label" @click="item.path ? open(item.path) : contactSupport()"><ProfileIcon :name="item.icon" /><text>{{ item.label }}</text><image class="me-chevron" src="/static/common/icon-chevron-right.png" mode="aspectFit" /></button></view>
    </template>
    <AppTabBar active="profile" />
  </view>
</template>
<script setup>
import { ref } from 'vue'
import { onShow, onUnload } from '@dcloudio/uni-app'
import { config } from '../../config'
import { useAuth } from '../../composables/useAuth'
import { useAppTabBar } from '../../composables/useAppTabBar'
import { getSession } from '../../services/api'
import { getMyProfile, getSupportConfig } from '../../services/profile'
import { getExclusiveAccess, getVisibleExclusiveEntries } from '../../services/exclusive'
import AppTabBar from '../../components/AppTabBar.vue'
import ProfileIcon from '../../components/ProfileIcon.vue'
useAuth(); useAppTabBar()
const isMock = config.useMock, status = ref('loading'), error = ref(''), data = ref(null)
let epoch = 0
const orderEntries = [{ label: '待支付', status: 'pending-payment', count: 'pendingPayment', icon: 'payment' }, { label: '待发货', status: 'waiting-shipment', count: 'waitingShipment', icon: 'shipping' }, { label: '待收货', status: 'waiting-receipt', count: 'waitingReceipt', icon: 'receiving' }, { label: '已完成', status: 'completed', count: 'completed', icon: 'completed' }]
const exclusiveEntries = ref([]), showAllFeatures = config.useMock && config.previewAllExclusiveFeatures
const menu = [{ label: '优惠券', icon: 'coupon', path: '/pages/coupon/list' }, { label: '收货地址', icon: 'address', path: '/pages/address/list' }, { label: '联系客服', icon: 'support' }, { label: '意见反馈', icon: 'feedback', path: '/pages/support/feedback' }, { label: '系统设置', icon: 'settings', path: '/pages/settings/index' }]
async function load() {
  if (!getSession()) return
  const current = ++epoch; status.value = 'loading'; data.value = null
  try { const result = await getMyProfile(); const access = await getExclusiveAccess(result); if(current === epoch) { data.value = result; exclusiveEntries.value = getVisibleExclusiveEntries(access); status.value = 'ready' } }
  catch(reason) { if(current === epoch) { error.value = reason.message || '加载失败'; status.value = 'error' } }
}
function open(path) { uni.navigateTo({ url: path }) }
function openOrders(status) { open(`/pages/order/list?status=${status}`) }
function copyInvite() { uni.setClipboardData({ data: data.value.profile.inviteCode }) }
async function contactSupport() {
  try {
    const support = await getSupportConfig()
    if (support.phone) uni.showModal({ title: '联系客服', content: `${support.description || ''}\n${support.phone}`, confirmText: '拨打电话', success: result => { if(result.confirm) uni.makePhoneCall({ phoneNumber: support.phone }) } })
    else uni.showModal({ title: '联系客服', content: support.description || '暂未提供客服联系方式，您可以通过意见反馈留言。', showCancel: false })
  } catch(reason) { uni.showToast({ title: reason.message || '获取客服信息失败', icon: 'none' }) }
}
onShow(load); onUnload(() => { ++epoch })
</script>
<style scoped>
.me-page{min-height:100vh;background:radial-gradient(ellipse at 100% 0,#20538d,transparent 38%),#121c3c;color:#eaf2ff;max-width:750px;margin:auto;padding:0 28rpx 24rpx}.me-heading{font-size:34rpx;font-weight:600;padding:calc(30rpx + var(--status-bar-height,0px)) 190rpx 30rpx 8rpx;display:flex;align-items:center;gap:14rpx;white-space:nowrap}.me-demo{font-size:18rpx;font-weight:400;color:#95a9cb}.me-user{margin:22rpx 8rpx 42rpx}.me-user-main{display:flex;align-items:center;text-align:left;gap:20rpx;background:none;color:#fff;margin:0;padding:0;line-height:1.6;width:100%}.me-avatar{height:100rpx;width:100rpx;border-radius:50%;flex-shrink:0}.me-avatar.letter{display:flex;align-items:center;justify-content:center;background:#2a4774;border:2rpx solid #91a8cc;font-size:42rpx}.me-user-info{flex:1;min-width:0}.me-name{font-size:36rpx;font-weight:600;overflow-wrap:anywhere}.me-id{font-size:24rpx;color:#94a5c8}.me-chevron{width:30rpx;height:30rpx;flex-shrink:0;margin-left:auto}.me-invite{display:flex;align-items:center;gap:8rpx;margin:8rpx 0 0 120rpx;padding:0;line-height:1.6;font-size:24rpx;background:none;color:#94a5c8;text-align:left}.me-invite image{width:28rpx;height:28rpx}.me-card{border-radius:26rpx;background:linear-gradient(115deg,#252f58,#263c6d);padding:26rpx 26rpx 32rpx;margin-bottom:24rpx;border-top:1rpx solid #4d81c9}.me-section-title{font-size:30rpx;font-weight:600;margin-bottom:24rpx;color:#d8e7ff}.me-store{display:flex;gap:18rpx}.me-store>image{width:160rpx;height:160rpx;border-radius:10rpx;flex-shrink:0}.me-store>view{flex:1;min-width:0}.me-store-name{font-size:29rpx;line-height:1.6}.store-number{display:inline-block;background:#008fff;border-radius:24rpx;padding:0 12rpx;font-size:22rpx;margin-left:8rpx}.me-muted{font-size:23rpx;color:#96a7cb;line-height:1.7;margin-top:10rpx}.unbound-store{display:block;color:#9eafd1;font-size:26rpx;padding:12rpx 0}.me-shortcuts{display:flex;gap:8rpx;justify-content:space-between}.me-shortcuts>button{min-width:0;flex:1;margin:0;background:none;padding:0;color:#bdcde8;font-size:25rpx;line-height:1.7;display:flex;align-items:center;flex-direction:column;gap:8rpx}.me-shortcuts button[disabled]{opacity:.75}.shortcut-image{position:relative}.order-count{position:absolute;right:-10rpx;top:-5rpx;min-width:28rpx;line-height:28rpx;font-size:18rpx;border-radius:20rpx;background:#fd476e;color:#fff}.feature-status{font-size:18rpx;color:#8c9dbc}.me-menu{padding:16rpx 30rpx}.me-menu>button{display:flex;align-items:center;gap:22rpx;background:none;color:#b7c9e6;padding:18rpx 0;margin:0;width:100%;line-height:1.6;font-size:28rpx;text-align:left}.account-state{display:flex;flex-direction:column;gap:24rpx;align-items:center;color:#a6b6d0;padding:80rpx 24rpx;line-height:1.8}.account-state button{padding:0 28rpx}
</style>
<style scoped>.exclusive-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1em .4em}.me-section-title>.feature-status{margin-left:1em;font-weight:400;white-space:normal}</style>
