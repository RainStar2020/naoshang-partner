<template>
  <view class="me-page">
    <view class="me-frame">
    <view class="me-heading">个人中心</view>
    <view v-if="status === 'loading'" class="account-state">正在加载个人信息…</view>
    <view v-else-if="status === 'error'" class="account-state"><text>{{ error }}</text><button class="secondary" @click="load">重新加载</button></view>
    <template v-else-if="data">
      <view class="me-user">
        <view class="me-user-main" @click="open('/pages/settings/profile')">
          <image v-if="data.profile.avatarUrl" class="me-avatar" :src="data.profile.avatarUrl" mode="aspectFill" />
          <view v-else class="me-avatar letter">{{ data.profile.nickname?.slice(0, 1) || '会' }}</view>
          <view class="me-user-info">
            <view class="me-name">{{ data.profile.nickname }}</view>
            <view class="me-meta">
              <text>ID：{{ data.profile.id }}</text>
              <button v-if="data.profile.inviteCode" class="me-invite" @click.stop="copyInvite">邀请码：{{ data.profile.inviteCode }}<image src="/static/common/icon-copy.png" mode="aspectFit" /></button>
            </view>
          </view>
          <image class="me-chevron" src="/static/common/icon-chevron-right.png" mode="aspectFit" />
        </view>
      </view>
      <view class="me-card store-card">
        <view class="me-section-title">绑定门店</view>
        <view v-if="data.store" class="me-store">
          <image :src="data.store.coverUrl || '/static/common/icon-store.png'" mode="aspectFill" />
          <view>
            <view class="me-store-name">{{ data.store.name }}<text v-if="data.store.number" class="store-number">{{ data.store.number }}</text></view>
            <view v-if="data.store.managerName" class="me-muted">店长信息：{{ data.store.managerName }}<text v-if="data.store.managerPhone">/{{ data.store.managerPhone }}</text></view>
            <view class="me-muted">{{ data.store.address }}</view>
          </view>
        </view>
        <text v-else class="unbound-store">暂未绑定门店</text>
      </view>
      <view class="me-card"><view class="me-section-title">我的订单</view><view class="me-shortcuts"><button v-for="item in orderEntries" :key="item.status" @click="openOrders(item.status)"><ProfileIcon :name="item.icon" /><text>{{ item.label }}</text></button></view></view>
      <view class="me-card"><view class="me-section-title">专属功能</view><view class="me-shortcuts exclusive-grid"><button v-for="item in exclusiveEntries" :key="item.id" @click="open(item.path)"><ProfileIcon :name="item.icon" disc /><text>{{ item.label }}</text></button></view><text v-if="!exclusiveEntries.length" class="unbound-store">当前身份暂无专属功能</text></view>
      <view class="me-card me-menu"><button v-for="item in menu" :key="item.label" @click="item.path ? open(item.path) : contactSupport()"><ProfileIcon :name="item.icon" /><text>{{ item.label }}</text><image class="me-chevron" src="/static/common/icon-chevron-right.png" mode="aspectFit" /></button></view>
    </template>
    </view>
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
const orderEntries = [{ label: '待支付', status: 'pending-payment', icon: 'payment' }, { label: '待发货', status: 'waiting-shipment', icon: 'shipping' }, { label: '待收货', status: 'waiting-receipt', icon: 'receiving' }, { label: '已完成', status: 'completed', icon: 'completed' }]
const profileExclusiveIds = ['founder-awards', 'costore-application', 'agency-code', 'members']
const exclusiveEntries = ref([]), showAllFeatures = config.useMock && config.previewAllExclusiveFeatures
const menu = [{ label: '优惠券', icon: 'coupon', path: '/pages/coupon/list' }, { label: '收货地址', icon: 'address', path: '/pages/address/list' }, { label: '联系客服', icon: 'support' }, { label: '意见反馈', icon: 'feedback', path: '/pages/support/feedback' }, { label: '系统设置', icon: 'settings', path: '/pages/settings/index' }]
async function load() {
  if (!getSession()) return
  const current = ++epoch; status.value = 'loading'; data.value = null
  try { const result = await getMyProfile(); const access = await getExclusiveAccess(result); if(current === epoch) { data.value = result; const entries = getVisibleExclusiveEntries(access); exclusiveEntries.value = showAllFeatures ? entries.filter(item => profileExclusiveIds.includes(item.id)) : entries; status.value = 'ready' } }
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
.me-page { min-height: 100vh; background: #272c47; color: #fff; font-size: clamp(14px, 3.73vw, 16px); }
.me-frame { max-width: 750px; margin: 0 auto; padding: 0 .9em calc(5.5em + env(safe-area-inset-bottom)); }
.me-heading { font-family: var(--font-page-title); font-size: 1.15em; font-weight: 700; padding: calc(.85em + var(--status-bar-height, 0px)) 5em .7em .2em; }
.me-user { margin: .2em 0 1em; }
.me-user-main { display: flex; align-items: center; gap: .75em; width: 100%; margin: 0; padding: 0; background: none; color: #fff; text-align: left; line-height: 1.4; }
.me-avatar { width: 3.4em; height: 3.4em; border-radius: 50%; flex-shrink: 0; background: #2a4774; }
.me-avatar.letter { display: flex; align-items: center; justify-content: center; font-size: 1.3em; }
.me-user-info { flex: 1; min-width: 0; }
.me-name { font-size: 1.15em; font-weight: 700; overflow-wrap: anywhere; }
.me-meta { display: flex; flex-wrap: wrap; align-items: center; gap: .15em .7em; margin-top: .25em; color: #9aa6c4; font-size: .82em; }
.me-invite { display: inline-flex; align-items: center; gap: .25em; margin: 0; padding: 0; background: none; color: #9aa6c4; font-size: 1em; line-height: 1.4; }
.me-invite image { width: 1em; height: 1em; }
.me-chevron { width: 1em; height: 1em; flex-shrink: 0; }
.me-card { border-radius: .85em; background: radial-gradient(ellipse 135% 115% at 100% 0%, rgba(42, 112, 206, .7), rgba(42, 112, 206, .24) 40%, transparent 72%), #353a59; padding: .95em 1em 1.05em; margin-bottom: .85em; }
.me-section-title { margin-bottom: .85em; font-family: var(--font-module-title); font-size: 1em; font-weight: 700; }
.me-store { display: flex; gap: .7em; align-items: flex-start; }
.me-store > image { width: 4.6em; height: 4.6em; border-radius: .4em; flex-shrink: 0; background: #464c6b; }
.me-store > view { flex: 1; min-width: 0; }
.me-store-name { display: flex; align-items: center; flex-wrap: wrap; gap: .35em; font-weight: 600; line-height: 1.45; }
.store-number { display: inline-flex; align-items: center; padding: .05em .45em; border-radius: .35em; background: #2f78ff; color: #fff; font-size: .75em; font-weight: 500; line-height: 1.55; }
.me-muted { display: block; margin-top: .25em; color: #9aa3bd; font-size: .84em; line-height: 1.5; overflow-wrap: anywhere; }
.unbound-store { display: block; color: #9aa3bd; padding: .3em 0 .2em; }
.me-shortcuts { display: flex; justify-content: space-between; gap: .4em; }
.me-shortcuts > button { min-width: 0; flex: 1; margin: 0; padding: 0; background: none; color: #d5dced; font-family: inherit; font-size: .86em; font-weight: 400; line-height: 1.45; display: flex; align-items: center; flex-direction: column; gap: .4em; }
.me-shortcuts > button::after, .me-menu > button::after, .me-invite::after { border: none; }
.exclusive-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .85em .3em; }
.me-menu { padding: .15em .9em; }
.me-menu > button { display: flex; align-items: center; gap: .75em; width: 100%; margin: 0; padding: .72em 0; background: none; color: #d5dced; font-family: inherit; font-size: 1em; font-weight: 400; text-align: left; line-height: 1.4; }
.me-menu > button + button { border-top: 1px solid #454b6c; }
.account-state { display: flex; flex-direction: column; gap: 1em; align-items: center; color: #a6b6d0; padding: 4em 1em; line-height: 1.7; }
</style>
