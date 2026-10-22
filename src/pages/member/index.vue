<template>
  <view class="member-page">
    <image class="member-background" src="/static/member/bg-learning-journey.png" mode="scaleToFill" aria-hidden="true" />
    <view class="member-brand"><image src="/static/logo.png" mode="aspectFit" /><text>脑商AI</text></view>
    <view v-if="status === 'loading'" class="page-state">正在加载会员信息…</view>
    <view v-else-if="status === 'error'" class="page-state"><text>{{ error }}</text><button class="retry-button" @click="load">重新加载</button></view>
    <template v-else>
      <view v-if="selected" class="identity-card">
        <text class="current-label">当前身份</text>
        <view class="identity-row">
          <view class="member-avatar">{{ selected.name?.slice(0, 1) || '会' }}</view>
          <view class="identity-info"><view class="identity-name">{{ selected.name }}</view><text class="identity-badge">{{ selected.badge }}</text><view class="identity-meta">ID：{{ selected.displayId }}<text v-if="selected.grade">　年级：{{ selected.grade }}</text></view></view>
          <button class="switch-button" @click="pickerOpen = true"><image class="switch-image" src="/static/common/icon-switch.png" mode="aspectFit" /><text>切换身份</text></button>
        </view>
      </view>
      <view v-else class="page-state">暂无可用身份，请联系服务人员</view>
      <button class="announcement-link" @click="openAnnouncements"><image src="/static/member/icon-announcement.png" mode="aspectFit" /><text>公告榜</text></button>
      <view v-if="levelStatus === 'loading'" class="page-state">正在加载成长等级…</view>
      <view v-else-if="levelStatus === 'error'" class="page-state"><text>{{ levelError }}</text><button class="retry-button" @click="loadLevels">重试</button></view>
      <view v-else-if="!levels.length" class="page-state">暂无等级</view>
      <view v-else class="journey">
        <view v-for="level in reversedLevels" :key="level.id" class="level-row" :class="[`tier-${level.tier}`, `position-${level.number}`]">
          <view v-if="[8, 5, 1].includes(level.number)" class="tier-marker"><image :src="`/static/member/bg-tier-${level.tier}.png`" mode="scaleToFill" /><text>{{ level.tierName }}</text></view>
          <button class="level-node" :class="{ unlocked: level.unlocked }" :aria-label="`L${level.number} ${level.name}，${level.unlocked ? '已解锁' : '未解锁'}`" @click="openLevel(level)">
            <image :src="`/static/common/icon-lv${[1, 2, 3].includes(level.tier) ? level.tier : 1}${level.unlocked ? '-active' : ''}.png`" mode="scaleToFill" />
            <text class="level-number">L{{ level.number }}</text><text class="level-name">{{ level.name }}</text>
            <text class="level-status">{{ level.unlocked ? '已解锁' : '未解锁' }}</text>
          </button>
        </view>
      </view>
    </template>
    <IdentityPicker :open="pickerOpen" :identities="identities" :selected-id="selected?.id" @close="pickerOpen = false" @select="switchIdentity" />
    <AppTabBar active="member" />
  </view>
</template>
<script setup>
import { computed, ref } from 'vue'
import { onShow, onUnload } from '@dcloudio/uni-app'
import { config } from '../../config'
import { useAuth } from '../../composables/useAuth'
import { getSession } from '../../services/api'
import { getLearningIdentities, getSelectedIdentity, selectLearningIdentity, getLearningLevels } from '../../services/learning'
import IdentityPicker from '../../components/IdentityPicker.vue'
import AppTabBar from '../../components/AppTabBar.vue'
import { useAppTabBar } from '../../composables/useAppTabBar'
useAuth()
useAppTabBar()
const isMock = config.useMock
const identities = ref([]), selected = ref(null), levels = ref([]), pickerOpen = ref(false)
const status = ref('loading'), error = ref(''), levelStatus = ref('loading'), levelError = ref('')
const reversedLevels = computed(() => [...levels.value].sort((a, b) => b.number - a.number))
let loadEpoch = 0, levelEpoch = 0
async function load() {
  if (!getSession()) return
  const epoch = ++loadEpoch
  ++levelEpoch; pickerOpen.value = false; status.value = 'loading'; error.value = ''; levels.value = []; selected.value = null
  try {
    const rows = await getLearningIdentities()
    if (epoch !== loadEpoch) return
    identities.value = rows; selected.value = getSelectedIdentity(rows); status.value = 'ready'
    if (selected.value) await loadLevels()
    else levelStatus.value = 'ready'
  } catch (reason) { if (epoch === loadEpoch) { status.value = 'error'; error.value = reason.message || '会员信息加载失败' } }
}
async function loadLevels() {
  if (!selected.value) return
  const epoch = ++levelEpoch, contextId = selected.value.id
  levelStatus.value = 'loading'; levelError.value = ''; levels.value = []
  try {
    const result = await getLearningLevels(selected.value)
    if (epoch === levelEpoch && contextId === selected.value?.id) { levels.value = result; levelStatus.value = 'ready' }
  } catch (reason) { if (epoch === levelEpoch) { levelStatus.value = 'error'; levelError.value = reason.message || '等级加载失败' } }
}
function switchIdentity(id) {
  try { selected.value = selectLearningIdentity(id, identities.value); pickerOpen.value = false; loadLevels() }
  catch (reason) { uni.showToast({ title: reason.message, icon: 'none' }) }
}
function openLevel(level) {
  if (!selected.value) return
  uni.navigateTo({ url: `/pages/learning/level-detail?levelId=${encodeURIComponent(level.id)}&contextId=${encodeURIComponent(selected.value.id)}` })
}
function openAnnouncements() { uni.navigateTo({ url: '/pages/learning/announcements' }) }
onShow(load)
onUnload(() => { ++loadEpoch; ++levelEpoch })
</script>
<style scoped>
.member-page.member-page{position:relative;z-index:0;background:#283c73}.member-background{position:absolute;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none}
.switch-image{width:48rpx;height:48rpx;display:block;margin:0 auto 8rpx}
.announcement-link.announcement-link{border:0;background:none;padding:0;display:flex;flex-direction:column;align-items:center;width:84rpx;color:#ffe900;font-size:20rpx;line-height:1.3}
.announcement-link image{width:72rpx;height:72rpx}.announcement-link text{border:1rpx solid #00bcff;padding:2rpx 4rpx;background:#003557}
.level-node.level-node image{opacity:1;filter:none}
.tier-marker.tier-marker{background:none!important;overflow:hidden;padding:12rpx 10rpx;min-height:80rpx;display:flex;align-items:center;justify-content:center}
.tier-marker image{position:absolute;inset:0;width:100%;height:100%}.tier-marker text{position:relative;z-index:1}
.announcement-link{color:#8fe1ff;margin:0 24rpx;padding:8rpx 18rpx;line-height:1.8;border:1rpx solid #218ec6;background:#143a62;font-size:23rpx;display:inline-block;border-radius:8rpx}
.member-page .member-brand{padding-top:calc(20rpx + var(--status-bar-height, 0px));padding-right:210rpx;min-height:88rpx}
.member-page{min-height:100vh;max-width:750px;margin:0 auto;color:#f6f9ff;background:radial-gradient(ellipse at 85% 22%,#64306a55,transparent 45%),radial-gradient(ellipse at 10% 92%,#007c994d,transparent 50%),linear-gradient(#34366e,#303364 48%,#063e68);padding-bottom:36rpx}
.member-brand{display:flex;align-items:center;gap:14rpx;padding:20rpx 30rpx;background:#1b3563;font-size:32rpx;font-weight:600}.member-brand image{width:62rpx;height:62rpx}.demo-label{margin-left:auto;font-size:20rpx;font-weight:400;color:#9aaecd}
.identity-card{position:relative;margin:32rpx 24rpx 24rpx;border:2rpx solid #108dff;border-radius:0 0 22rpx 22rpx;padding:58rpx 22rpx 28rpx;background:#2d3264;border-top:16rpx solid #0987fa}.current-label{position:absolute;top:-22rpx;left:-2rpx;background:linear-gradient(100deg,#154383,#2b3770);border:2rpx solid #13b9ff;padding:9rpx 40rpx;font-size:30rpx;font-weight:600}.identity-row{display:flex;gap:18rpx;align-items:center}.member-avatar{width:84rpx;height:84rpx;flex-shrink:0;border-radius:50%;background:#263d6b;border:2rpx solid #e1eeff;display:flex;align-items:center;justify-content:center;font-size:36rpx}.identity-info{flex:1;min-width:0}.identity-name{font-size:30rpx;font-weight:600;overflow-wrap:anywhere}.identity-badge{display:inline-block;font-size:21rpx;border-radius:28rpx;padding:2rpx 14rpx;background:linear-gradient(90deg,#00b8e8,#3155ff);margin-top:5rpx}.identity-meta{font-size:22rpx;color:#9ca8c9;margin-top:12rpx;overflow-wrap:anywhere}.switch-button{padding:0;background:none;color:#c4d7f8;font-size:23rpx;line-height:1.5;flex-shrink:0;margin:0}
.page-state{text-align:center;display:flex;flex-direction:column;gap:20rpx;color:#b5c2dd;padding:80rpx 32rpx;font-size:26rpx;line-height:1.7}.retry-button{background:#185491;color:#fff;font-size:26rpx;line-height:64rpx;padding:0 36rpx;border-radius:32rpx;margin:auto}
.journey{position:relative;overflow:hidden;padding:12rpx 24rpx 32rpx;background-image:radial-gradient(circle at 20% 15%,#deecff66 1rpx,transparent 3rpx),radial-gradient(circle at 80% 65%,#a6beff55 1rpx,transparent 3rpx);background-size:113rpx 151rpx,173rpx 119rpx}.level-row{height:100rpx;display:flex;align-items:center;position:relative}.level-node{position:relative;width:270rpx;height:84rpx;flex-shrink:0;margin:0;padding:0;background:none;color:#fff;line-height:1}.level-node image{position:absolute;inset:0;width:100%;height:100%;opacity:.8}.level-node.unlocked image{opacity:1}.level-number{position:absolute;left:8rpx;top:20rpx;width:64rpx;text-align:center;font-size:32rpx;font-weight:700}.level-name{position:absolute;left:86rpx;right:16rpx;top:18rpx;text-align:center;font-size:27rpx;font-weight:600}.level-status{position:absolute;left:86rpx;right:16rpx;bottom:15rpx;color:#a8bad8;font-size:17rpx}.unlocked .level-status{color:#c1eaff}.position-10,.position-6{padding-left:55%}.position-9,.position-7{padding-left:35%}.position-8{padding-left:15%}.position-5{padding-left:63%;margin-top:30rpx}.position-4{padding-left:46%}.position-3{padding-left:29%}.position-2{padding-left:12%}.position-1{margin-top:24rpx}.tier-marker{position:absolute;right:-24rpx;top:12rpx;background:#75164e;color:#fff;width:112rpx;padding:14rpx 12rpx;font-size:22rpx;font-weight:600;text-align:center;border-radius:20rpx 0 0 20rpx}.tier-2 .tier-marker{left:-24rpx;right:auto;background:#174baa;border-radius:0 20rpx 20rpx 0}.tier-1 .tier-marker{background:#007e91}.position-5 .level-node{width:250rpx}.position-5 .level-name{font-size:25rpx}
@media(max-width:340px){.level-node{width:250rpx}.position-5{padding-left:60%}.position-5 .level-node{width:245rpx}.identity-row{gap:12rpx}.member-avatar{width:64rpx;height:64rpx}}
</style>
