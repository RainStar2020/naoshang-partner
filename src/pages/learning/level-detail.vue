<template>
  <view class="detail-page">
    <view v-if="status === 'loading'" class="detail-state">正在加载…</view>
    <view v-else-if="status === 'error'" class="detail-state"><text>{{ error }}</text><button class="secondary" @click="load">重新加载</button><button class="secondary" @click="backToMembers">返回会员页</button></view>
    <template v-else-if="detail">
      <view class="detail-cover">
        <swiper class="detail-covers" :current="coverIndex" @change="onCoverChange">
          <swiper-item v-for="(src, index) in coverSlides" :key="`${src}-${index}`"><image :src="src" mode="aspectFill" /></swiper-item>
        </swiper>
        <text class="cover-badge">专栏</text>
        <text class="cover-index">{{ coverIndex + 1 }}/{{ coverSlides.length }}</text>
      </view>
      <view class="detail-heading"><view class="detail-title">{{ detail.tierName }}<text class="level-tag">L{{ detail.number }}</text></view><text class="detail-name">{{ detail.name }}</text><text v-if="detail.summary" class="detail-summary">{{ detail.summary }}</text></view>
      <view class="detail-tabs"><button :class="{ active: tab === 'details' }" @click="tab = 'details'">详情</button><button :class="{ active: tab === 'catalog' }" @click="tab = 'catalog'">目录</button></view>
      <view v-if="tab === 'details'" class="benefits-body"><ManagedRichContent :content="detail.content" /></view>
      <view v-else class="catalog-body">
        <view v-if="!detail.chapters.length" class="detail-state">暂无课程</view>
        <button v-for="chapter in detail.chapters" :key="chapter.id" role="button" class="chapter-row" @click="openChapter(chapter)">
          <view class="chapter-copy">
            <text class="chapter-title">{{ chapter.title }}</text>
            <view class="chapter-meta"><text>{{ chapter.type === 'video' ? '视频' : '图文' }}</text><template v-if="detail.unlocked && chapter.accessible"><text v-if="chapter.progress?.lastStudiedAt">{{ studyDate(chapter.progress.lastStudiedAt) }}学习</text><text>{{ chapter.progress?.lastStudiedAt ? `已学${chapter.progress.percent}%` : '暂无学习记录' }}</text></template><text v-else>暂无学习记录</text></view>
          </view>
          <image v-if="!detail.unlocked || !chapter.accessible" class="chapter-lock" src="/static/common/icon-lock.png" mode="aspectFit" />
        </button>
      </view>
      <view v-if="!detail.unlocked" class="detail-footer"><button class="primary" @click="beginActivation">激活{{ detail.tierName }}后可使用</button></view>
    </template>
    <view v-if="activationOpen" class="activation-mask" @click="closeActivation">
      <view class="activation-dialog" role="dialog" aria-modal="true" aria-label="激活会员" @click.stop>
        <view class="activation-title">激活</view>
        <input v-model="activationCode" class="activation-input" placeholder="请输入激活码" :disabled="submitting" :maxlength="64" @input="resetAttempt" />
        <text v-if="activationError" class="activation-error" role="alert">{{ activationError }}</text>
        <view class="activation-actions"><button :disabled="submitting || !activationCode.trim()" class="confirm" @click="submitActivation">{{ submitting ? '处理中…' : '确定' }}</button><button :disabled="submitting" @click="closeActivation">取消</button></view>
      </view>
    </view>
    <view v-if="successOpen" class="activation-mask" @click="successOpen = false">
      <view class="activation-dialog success-dialog" role="dialog" aria-modal="true" aria-label="激活成功" @click.stop>
        <view class="success-copy">您已成功激活{{ successTier }}</view>
        <button class="primary success-confirm" @click="successOpen = false">确定</button>
      </view>
    </view>
  </view>
</template>
<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { useAuth } from '../../composables/useAuth'
import { config } from '../../config'
import { getSession } from '../../services/api'
import { getLearningLevelDetail, previewLevelActivation, activateLearningLevel } from '../../services/learning'
import ManagedRichContent from '../../components/ManagedRichContent.vue'
useAuth()
const isMock = config.useMock, status = ref('loading'), error = ref(''), detail = ref(null), tab = ref('details')
const activationOpen = ref(false), activationCode = ref(''), activationError = ref(''), submitting = ref(false), successOpen = ref(false), successTier = ref(''), coverIndex = ref(0)
const fallbackCover = '/static/product/product-cover.png'
const coverSlides = computed(() => detail.value?.covers?.length ? detail.value.covers : [fallbackCover])
let contextId = '', levelId = '', epoch = 0, attemptKey = '', initialTab = false
const studyDate = value => String(value).slice(0, 10).replaceAll('-', '.')
onLoad(options => { contextId = options.contextId || ''; levelId = options.levelId || ''; if (options.tab === 'catalog') { tab.value = 'catalog'; initialTab = true } })
async function load() {
  if (!getSession()) return
  const current = ++epoch; status.value = 'loading'; error.value = ''; detail.value = null
  try {
    if (!contextId || !levelId) throw new Error('缺少会员或等级信息，请返回后重新选择')
    const result = await getLearningLevelDetail(contextId, levelId)
    if (current !== epoch) return
    detail.value = result; coverIndex.value = 0; status.value = 'ready'
    if (!initialTab) { tab.value = result.identity.mode === 'child' ? 'catalog' : 'details'; initialTab = true }
    uni.setNavigationBarTitle({ title: result.tierName || result.name })
  } catch (reason) { if (current === epoch) { status.value = 'error'; error.value = reason.message || '详情加载失败' } }
}
function openChapter(chapter){if(!detail.value.unlocked||!chapter.accessible){beginActivation();return}uni.navigateTo({url:`/pages/learning/${chapter.type==='video'?'video':'article'}?contextId=${encodeURIComponent(contextId)}&levelId=${encodeURIComponent(levelId)}&chapterId=${encodeURIComponent(chapter.id)}`})}
function backToMembers() { uni.switchTab({ url: '/pages/member/index' }) }
function onCoverChange(event) { coverIndex.value = event.detail?.current || 0 }
function beginActivation() {
  if (detail.value.identity.mode !== 'parent' && !detail.value.activationEnabled) { uni.showToast({ title: '当前暂不可激活，请联系门店', icon: 'none' }); return }
  activationCode.value = ''; activationError.value = ''; attemptKey = ''; activationOpen.value = true
}
function closeActivation() { if (!submitting.value) { activationOpen.value = false; activationCode.value = ''; activationError.value = ''; attemptKey = '' } }
function resetAttempt() { attemptKey = ''; activationError.value = '' }
async function submitActivation() {
  if (submitting.value || !activationCode.value.trim()) return
  submitting.value = true; activationError.value = ''
  const currentEpoch = epoch, code = activationCode.value.trim()
  try {
    await previewLevelActivation(contextId, code, levelId)
    if (currentEpoch !== epoch) return
    if (!attemptKey) attemptKey = `activation-${Date.now()}-${Math.random().toString(36).slice(2)}`
    await activateLearningLevel(contextId, { code, levelId, idempotencyKey: attemptKey })
    if (currentEpoch !== epoch) return
    successTier.value = detail.value?.tierName || ''
    activationOpen.value = false; activationCode.value = ''; attemptKey = ''; successOpen.value = true
    await load()
  } catch (reason) { if (currentEpoch === epoch) activationError.value = reason.message || '激活失败，请重试' }
  finally { submitting.value = false }
}
onShow(load)
onUnload(() => { ++epoch })
</script>
<style scoped>
.detail-page{min-height:100vh;max-width:750px;margin:0 auto;background:#272c47;color:#f5f7ff;padding-bottom:calc(150rpx + env(safe-area-inset-bottom))}.detail-state{padding:70rpx 32rpx;text-align:center;color:#aab6cc;font-size:26rpx;display:flex;flex-direction:column;gap:24rpx;line-height:1.7}.detail-state button{margin:0 auto;min-width:240rpx;padding:0 28rpx}.detail-cover{position:relative}.detail-covers{height:62vw;max-height:420px}.detail-covers image{height:100%;width:100%;display:block}.cover-badge,.cover-index{position:absolute;z-index:1;bottom:16rpx;padding:2rpx 14rpx;border-radius:8rpx;background:rgba(12,18,40,.55);font-size:22rpx;line-height:1.6}.cover-badge{left:16rpx}.cover-index{right:16rpx}.detail-heading{padding:32rpx 28rpx;background:#343a5b}.detail-title{font-size:34rpx;font-weight:600;display:flex;gap:16rpx;align-items:center}.level-tag{font-size:24rpx;background:#196ac8;border-radius:12rpx;padding:6rpx 14rpx}.detail-name{font-size:27rpx;display:block;margin-top:16rpx}.detail-summary{display:block;color:#adb6cc;line-height:1.8;margin-top:12rpx}.detail-tabs{display:flex;background:#343a5b;margin-top:16rpx}.detail-tabs button{position:relative;flex:1;padding:24rpx 0;border-radius:0;background:transparent;color:#aeb6cc;font-size:29rpx;line-height:1.5;margin:0}.detail-tabs .active{color:#12baff}.detail-tabs .active::before{content:'';position:absolute;bottom:10rpx;left:calc(50% - 24rpx);width:48rpx;height:5rpx;background:#0eb8ff;border-radius:6rpx}.benefits-body{min-height:380rpx;background:#343a5b;padding:30rpx 28rpx}.catalog-body{min-height:380rpx;background:#343a5b;padding:0 28rpx}.chapter-row{display:flex;align-items:center;gap:16rpx;text-align:left;width:100%;margin:0;background:none;color:inherit;line-height:1.6;border-radius:0;padding:30rpx 4rpx;border-bottom:1rpx solid #64719044}.chapter-row::after{border:0}.chapter-copy{flex:1;min-width:0}.chapter-title{font-size:28rpx;overflow-wrap:anywhere}.chapter-meta{display:flex;flex-wrap:wrap;gap:.3em 1em;font-size:24rpx;color:#a5afc6;margin-top:12rpx}.chapter-lock{width:36rpx;height:36rpx;flex-shrink:0;filter:brightness(0) invert(1);opacity:.9}.detail-footer{position:fixed;bottom:0;left:0;right:0;background:#343a5b;padding:20rpx 48rpx calc(24rpx + env(safe-area-inset-bottom));z-index:10}.detail-footer button{max-width:680rpx;margin:auto}.activation-mask{position:fixed;inset:0;z-index:100;background:#000b;display:flex;align-items:center;justify-content:center;padding:48rpx}.activation-dialog{width:100%;max-width:640rpx;background:linear-gradient(#2b365b,#202a46);padding:40rpx 36rpx 26rpx;border-radius:36rpx}.activation-title{text-align:center;font-size:32rpx;font-weight:600;margin-bottom:28rpx}.activation-input{height:84rpx;background:#444e70;border-radius:48rpx;text-align:center;font-size:28rpx;color:#fff;padding:0 20rpx}.activation-error{display:block;color:#ff98ac;font-size:23rpx;line-height:1.6;margin:16rpx 4rpx}.activation-actions{display:flex;gap:30rpx;margin-top:26rpx}.activation-actions button{flex:1;color:#e8eef8;background:none;font-size:30rpx;line-height:80rpx;padding:0;margin:0}.activation-actions .confirm{color:#2f7bff;font-weight:600}.success-copy{text-align:center;font-size:30rpx;line-height:1.7;padding:8rpx 8rpx 36rpx}.success-confirm{width:240rpx;margin:0 auto;line-height:72rpx}
</style>
