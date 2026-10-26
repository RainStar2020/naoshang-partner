<template>
  <view class="member-page">
    <image class="member-background" src="/static/member/bg-learning-journey.png" mode="scaleToFill" aria-hidden="true" />
    <view class="member-brand"><image src="/static/logo.png" mode="aspectFit" /><text>脑商AI</text></view>
    <view v-if="status === 'loading'" class="page-state">正在加载会员信息…</view>
    <view v-else-if="status === 'error'" class="page-state"><text>{{ error }}</text><button class="retry-button" @click="load">重新加载</button></view>
    <template v-else>
      <view v-if="selected" class="identity-card">
        <image class="identity-frame" src="/static/member/bg-identity-frame.png" mode="scaleToFill" aria-hidden="true" />
        <text class="current-label">当前身份</text>
        <view class="identity-row">
          <view class="identity-person">
            <view class="member-avatar">{{ selected.name?.slice(0, 1) || '会' }}</view>
            <view class="identity-main">
              <view class="identity-name-line"><text class="identity-name">{{ selected.name }}</text><text class="identity-badge">{{ selected.badge }}</text></view>
              <view class="identity-meta-line">
                <text class="identity-meta">ID：{{ selected.displayId }}</text>
                <text v-if="selected.grade" class="identity-meta">年级：{{ selected.grade }}</text>
              </view>
            </view>
          </view>
          <view class="identity-actions">
            <button class="switch-button" @click="openFans"><image class="switch-image" :src="membershipActive ? '/static/partner/icon-superior.png' : '/static/common/icon-superior-muted.png'" mode="aspectFit" /><text>粉丝会员</text></button>
            <button class="switch-button" @click="pickerOpen = true"><image class="switch-image" src="/static/common/icon-switch.png" mode="aspectFit" /><text>切换身份</text></button>
          </view>
        </view>
      </view>
      <view v-else class="page-state">暂无可用身份，请联系服务人员</view>
      <view v-if="levelStatus === 'loading'" class="page-state">正在加载成长等级…</view>
      <view v-else-if="levelStatus === 'error'" class="page-state"><text>{{ levelError }}</text><button class="retry-button" @click="loadLevels">重试</button></view>
      <view v-else-if="!levels.length" class="page-state">暂无等级</view>
      <view v-else class="journey" aria-label="会员成长等级">
        <button class="announcement-link" aria-label="公告榜" @click="openAnnouncements"><image src="/static/member/icon-announcement.png" mode="aspectFit"/><text>公告榜</text></button>
        <view v-for="tier in [3, 2, 1]" :key="tier" class="tier-band" :class="`tier-${tier}`">
          <button class="tier-marker" :aria-label="`查看${['一阶','二阶','三阶'][tier - 1]}会员课程`" @click="openTier(tier)"><image :src="`/static/member/bg-tier-${tier}.png`" mode="scaleToFill"/><text>{{ ['一阶','二阶','三阶'][tier - 1] }}</text><text>{{ ['菁英会员','行能会员','羿烁会员'][tier - 1] }}</text></button>
          <view v-for="level in reversedLevels.filter(item => item.tier === tier)" :key="level.id" class="level-row" :class="`position-${level.number}`">
            <button role="button" class="level-node" :class="{ unlocked: level.unlocked }" :aria-label="`L${level.number} ${level.name}，${level.unlocked ? '已解锁' : '未解锁'}`" @click="openLevel(level)">
              <image :src="`/static/common/icon-lv${level.tier}${level.unlocked ? '-active' : ''}.png`" mode="scaleToFill"/>
              <text class="level-number">L{{level.number}}</text><text class="level-name">{{level.name}}</text>
            </button>
            <view v-if="level.number === 1" class="journey-extra">
              <button class="tier-chip" @click="openTier(1)"><image :src="level.unlocked ? '/static/member/bg-coding-tag-active.png' : '/static/member/bg-coding-tag.png'" mode="scaleToFill" /><text>编码</text></button>
              <button class="tier-chip" aria-label="查看菁英会员课程" @click="openTier(1)"><image :src="level.unlocked ? '/static/member/bg-coding-tag-active.png' : '/static/member/bg-coding-tag.png'" mode="scaleToFill" /><text>菁英会员</text></button>
            </view>
          </view>
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
import { useAuth } from '../../composables/useAuth'
import { getSession } from '../../services/api'
import { getLearningIdentities, getSelectedIdentity, selectLearningIdentity, getLearningLevels } from '../../services/learning'
import IdentityPicker from '../../components/IdentityPicker.vue'
import AppTabBar from '../../components/AppTabBar.vue'
import { useAppTabBar } from '../../composables/useAppTabBar'
useAuth()
useAppTabBar()
const identities = ref([]), selected = ref(null), levels = ref([]), pickerOpen = ref(false)
const status = ref('loading'), error = ref(''), levelStatus = ref('loading'), levelError = ref('')
const reversedLevels = computed(() => [...levels.value].sort((a, b) => b.number - a.number))
const membershipActive = computed(() => levels.value.some(level => level.unlocked))
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
  if (!selected.value || !level?.id) return
  uni.navigateTo({ url: `/pages/learning/level-detail?levelId=${encodeURIComponent(level.id)}&contextId=${encodeURIComponent(selected.value.id)}&tab=catalog` })
}
function openTier(tier) {
  const level = [...levels.value].filter(item => item.tier === tier).sort((a, b) => a.number - b.number)[0]
  if (level) openLevel(level)
}
function openAnnouncements() { uni.navigateTo({ url: '/pages/learning/announcements' }) }
function openFans() { openTier(1) }
onShow(load)
onUnload(() => { ++loadEpoch; ++levelEpoch })
</script>
<style scoped>
.member-page{position:relative;isolation:isolate;display:flex;flex-direction:column;height:100vh;height:100dvh;max-width:750px;margin:auto;overflow:hidden;color:#fff;background:#283c73;box-sizing:border-box;font-size:clamp(12px,3.5vw,17px)}
.member-background{position:absolute;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none}
.member-brand{display:flex;align-items:center;gap:.5em;flex-shrink:0;padding:calc(.55em + var(--status-bar-height,0px)) 7em .55em 1em;background:#1b3563;font-size:1.05em;font-weight:600}.member-brand image{width:2em;height:2em}
.identity-card{position:relative;flex-shrink:0;margin:1.25em .8em .6em;border:0;padding:0;background:transparent;aspect-ratio:702 / 216;min-height:0;overflow:hidden;box-sizing:border-box}.identity-frame{position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none}.current-label{position:absolute;z-index:2;left:2.2%;top:3.2%;width:24%;height:24%;display:flex;flex-direction:row;align-items:center;justify-content:center;color:#fff;font-size:.95em;font-weight:600;line-height:1;letter-spacing:.02em;background:transparent}.identity-row{position:relative;z-index:1;display:flex;flex-direction:row;align-items:center;height:100%;box-sizing:border-box;gap:.4em;padding:8.6% 3% 1.4% 3.2%}.identity-person{display:flex;flex-direction:row;align-items:center;gap:.42em;flex:1;min-width:0}.member-avatar{width:3.5em;height:3.5em;flex-shrink:0;border-radius:50%;background:#263d6b;border:1rpx solid #e1eeff;display:flex;align-items:center;justify-content:center;font-size:1.2em}.identity-main{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:.16em}.identity-name-line{display:flex;flex-direction:row;align-items:center;gap:.32em;min-width:0}.identity-name{min-width:0;font-size:1.34em;font-weight:600;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.identity-badge{flex-shrink:0;font-size:.8em;line-height:1.3;border-radius:2em;padding:.08em .5em;background:linear-gradient(90deg,#00b8e8,#3155ff)}.identity-meta-line{display:flex;flex-direction:row;align-items:center;gap:.45em;min-width:0}.identity-meta{flex-shrink:0;font-size:.9em;color:#9ca8c9;line-height:1.25;white-space:nowrap}.identity-actions{display:flex;flex-direction:row;align-items:flex-end;gap:.7em;margin-left:auto;flex-shrink:0;transform:translateY(-.28em)}.switch-button{display:flex;flex-direction:column;align-items:center;gap:.1em;padding:0;background:none;color:#9ca8c9;font-size:.9em;line-height:1.25;flex-shrink:0;margin:0}.switch-image{width:2.5em;height:2.5em;display:block;flex-shrink:0}
.page-state{flex:1;text-align:center;display:flex;flex-direction:column;justify-content:center;gap:1em;color:#b5c2dd;padding:2em 1em;font-size:.95em;line-height:1.7}.retry-button{background:#185491;color:#fff;font-size:1em;padding:0 1.2em;border-radius:2em;margin:0 auto}
.journey{position:relative;flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}.tier-band{position:relative;display:flex;flex-direction:column;min-height:0;box-sizing:border-box}.tier-band.tier-3{flex:5;background:linear-gradient(120deg,#622e6c44,#4a245c44)}.tier-band.tier-2{flex:4;border-top:1rpx solid #2caff488;background:linear-gradient(120deg,#10469b88,#124f9255)}.tier-band.tier-1{flex:1.25;border-top:1rpx solid #18d6e488;background:linear-gradient(100deg,#007e9c77,#02678466)}
.level-row{flex:1;min-height:0;display:flex;align-items:center;position:relative}.level-node{position:relative;width:34%;height:84%;max-height:2.8em;margin:0;padding:0;flex-shrink:0;background:none;color:#fff;font-size:clamp(11px,3.5vw,17px);line-height:1}.level-node::after{border:0}.level-node image{position:absolute;inset:0;width:100%;height:100%}.level-number{position:absolute;left:0;top:50%;transform:translateY(-50%);width:28%;text-align:center;font-size:1.25em;font-weight:700}.level-name{position:absolute;left:29%;right:5%;top:50%;transform:translateY(-50%);white-space:nowrap;text-align:center;font-size:1em;font-weight:600}
.position-10,.position-6{padding-left:56%}.position-9,.position-7{padding-left:39%}.position-8{padding-left:22%}.position-5{padding-left:64%}.position-4{padding-left:47%}.position-3{padding-left:30%}.position-2{padding-left:13%}.position-1{padding-left:2%}.position-1 .level-node{width:27vw}.level-row{box-sizing:content-box}.level-node{width:34vw;max-width:255px}.journey-extra{display:flex;align-items:center;gap:.35em;margin-left:.35em;min-width:0}.tier-chip{position:relative;display:flex;align-items:center;justify-content:center;height:1.4em;margin:0;padding:0 .7em;flex-shrink:0;background:transparent;color:#fff;font-weight:600;line-height:1;white-space:nowrap}.tier-chip image{position:absolute;inset:0;width:100%;height:100%}.tier-chip text{position:relative;font-size:clamp(11px,3.5vw,17px);font-weight:600}.tier-marker{position:absolute;z-index:1;right:0;top:44%;width:15%;height:18%;max-height:3.6em;min-height:2.5em;font-size:.8em;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:600;line-height:1.3}.tier-marker image{position:absolute;inset:0;width:100%;height:100%;z-index:-1}.tier-2 .tier-marker{left:0;right:auto;top:12%}.tier-1 .tier-marker{top:20%;height:65%;min-height:0}
.announcement-link{position:absolute;z-index:2;left:.7em;top:.7em;padding:0;margin:0;display:flex;flex-direction:column;align-items:center;background:none;color:#ffe900;font-size:.72em;line-height:1.3}.announcement-link image{width:2.8em;height:2.8em}.announcement-link text{border:1rpx solid #00bcff;padding:0 .2em;background:#003557}
.tier-marker{margin:0;padding:0;background:transparent;color:inherit;border-radius:0}.tier-marker::after,.tier-chip::after{border:0}
@media(max-height:650px){.identity-card{margin-top:1em;padding-top:1.2em;padding-bottom:.5em}.member-brand{padding-top:calc(.3em + var(--status-bar-height,0px));padding-bottom:.3em}.member-avatar{width:2.3em;height:2.3em}}
@media(orientation:landscape) and (max-height:500px){.member-brand{display:none}.identity-card{margin:.4em .8em}.member-avatar{width:2em;height:2em}.identity-row{padding-top:9%;padding-bottom:1.6%}.tier-3,.tier-2{flex:1!important}.journey{flex-direction:row;gap:.5em}.tier-band{flex:1!important;border-top:1rpx solid #18d6e488}.level-row{padding-left:15%}.level-node{width:80%;height:90%}.tier-marker{display:none}.announcement-link{display:none}.journey-extra{display:none}}
</style>
