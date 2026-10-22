<template>
  <view class="detail-page">
    <view v-if="status === 'loading'" class="detail-state">正在加载…</view>
    <view v-else-if="status === 'error'" class="detail-state"><text>{{ error }}</text><button class="secondary" @click="load">重新加载</button><button class="secondary" @click="backToMembers">返回会员页</button></view>
    <template v-else-if="detail">
      <swiper v-if="detail.covers.length" class="detail-covers" indicator-dots>
        <swiper-item v-for="src in detail.covers" :key="src"><image :src="src" mode="aspectFill" /></swiper-item>
      </swiper>
      <view class="detail-heading"><view class="detail-title">{{ detail.tierName }}<text class="level-tag">L{{ detail.number }}</text></view><text class="detail-name">{{ detail.name }}</text><text v-if="detail.summary" class="detail-summary">{{ detail.summary }}</text><view class="beneficiary">{{ detail.identity.mode === 'parent' ? '家长浏览' : `当前会员：${detail.identity.name}` }}</view></view>
      <view class="detail-tabs"><button :class="{ active: tab === 'details' }" @click="tab = 'details'">详情</button><button :class="{ active: tab === 'catalog' }" @click="tab = 'catalog'">目录</button></view>
      <view v-if="tab === 'details'" class="benefits-body"><ManagedRichContent :content="detail.content" /></view>
      <view v-else class="catalog-body">
        <view v-if="!detail.chapters.length" class="detail-state">暂无课程</view>
        <view v-for="chapter in detail.chapters" :key="chapter.id" class="chapter-row" @click="openChapter(chapter)"><view><text class="chapter-title">{{ chapter.title }}</text><view class="chapter-meta">{{ chapter.type === 'video' ? '视频' : '图文' }}</view></view><text class="chapter-access">{{ detail.unlocked && chapter.accessible ? '可学习' : '未解锁' }}</text></view>
      </view>
      <view v-if="!detail.unlocked" class="detail-footer"><button class="primary" @click="beginActivation">{{ detail.identity.mode === 'parent' ? '选择会员后激活' : '激活会员后可使用' }}</button></view>
    </template>
    <view v-if="activationOpen" class="activation-mask" @click.self="closeActivation">
      <view class="activation-dialog" role="dialog" aria-modal="true" aria-label="激活会员">
        <view class="activation-title">激活</view><text class="activation-member">{{ detail?.identity.name }} · {{ detail?.name }}</text>
        <input v-model="activationCode" class="activation-input" placeholder="请输入激活码" :disabled="submitting" :maxlength="64" @input="resetAttempt" />
        <text v-if="activationError" class="activation-error" role="alert">{{ activationError }}</text>
        <view class="activation-actions"><button :disabled="submitting" @click="closeActivation">取消</button><button :disabled="submitting || !activationCode.trim()" class="confirm" @click="submitActivation">{{ submitting ? '处理中…' : '确定' }}</button></view>
      </view>
    </view>
  </view>
</template>
<script setup>
import { ref } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { useAuth } from '../../composables/useAuth'
import { config } from '../../config'
import { getSession } from '../../services/api'
import { getLearningLevelDetail, previewLevelActivation, activateLearningLevel } from '../../services/learning'
import ManagedRichContent from '../../components/ManagedRichContent.vue'
useAuth()
const isMock = config.useMock, status = ref('loading'), error = ref(''), detail = ref(null), tab = ref('details')
const activationOpen = ref(false), activationCode = ref(''), activationError = ref(''), submitting = ref(false)
let contextId = '', levelId = '', epoch = 0, attemptKey = ''
onLoad(options => { contextId = options.contextId || ''; levelId = options.levelId || '' })
async function load() {
  if (!getSession()) return
  const current = ++epoch; status.value = 'loading'; error.value = ''; detail.value = null
  try {
    if (!contextId || !levelId) throw new Error('缺少会员或等级信息，请返回后重新选择')
    const result = await getLearningLevelDetail(contextId, levelId)
    if (current !== epoch) return
    detail.value = result; status.value = 'ready'
    uni.setNavigationBarTitle({ title: result.tierName || result.name })
  } catch (reason) { if (current === epoch) { status.value = 'error'; error.value = reason.message || '详情加载失败' } }
}
function openChapter(chapter){if(!detail.value.unlocked||!chapter.accessible){beginActivation();return}uni.navigateTo({url:`/pages/learning/${chapter.type==='video'?'video':'article'}?contextId=${encodeURIComponent(contextId)}&levelId=${encodeURIComponent(levelId)}&chapterId=${encodeURIComponent(chapter.id)}`})}
function backToMembers() { uni.switchTab({ url: '/pages/member/index' }) }
function beginActivation() {
  if (detail.value.identity.mode === 'parent') { backToMembers(); return }
  if (!detail.value.activationEnabled) { uni.showToast({ title: '当前暂不可激活，请联系门店', icon: 'none' }); return }
  activationCode.value = ''; activationError.value = ''; attemptKey = ''; activationOpen.value = true
}
function closeActivation() { if (!submitting.value) { activationOpen.value = false; activationCode.value = ''; activationError.value = ''; attemptKey = '' } }
function resetAttempt() { attemptKey = ''; activationError.value = '' }
async function submitActivation() {
  if (submitting.value || !activationCode.value.trim()) return
  submitting.value = true; activationError.value = ''
  const currentEpoch = epoch, code = activationCode.value.trim()
  try {
    if (!attemptKey) {
      const preview = await previewLevelActivation(contextId, code, levelId)
      if (currentEpoch !== epoch) return
      const accepted = await new Promise(resolve => uni.showModal({ title: '确认激活', content: `为${preview.memberName}激活${preview.levelName}，是否继续？`, success: res => resolve(res.confirm), fail: () => resolve(false) }))
      if (!accepted || currentEpoch !== epoch) return
      attemptKey = `activation-${Date.now()}-${Math.random().toString(36).slice(2)}`
    }
    await activateLearningLevel(contextId, { code, levelId, idempotencyKey: attemptKey })
    if (currentEpoch !== epoch) return
    activationOpen.value = false; activationCode.value = ''; attemptKey = ''
    await load(); uni.showToast({ title: '激活成功', icon: 'success' })
  } catch (reason) { if (currentEpoch === epoch) activationError.value = reason.message || '激活失败，请重试' }
  finally { submitting.value = false }
}
onShow(load)
onUnload(() => { ++epoch })
</script>
<style scoped>
.detail-page{min-height:100vh;max-width:750px;margin:0 auto;background:#272c47;color:#f5f7ff;padding-bottom:calc(150rpx + env(safe-area-inset-bottom))}.detail-state{padding:70rpx 32rpx;text-align:center;color:#aab6cc;font-size:26rpx;display:flex;flex-direction:column;gap:24rpx;line-height:1.7}.detail-state button{margin:0 auto;min-width:240rpx;padding:0 28rpx}.detail-covers{height:650rpx}.detail-covers image{height:100%;width:100%}.detail-heading{padding:32rpx 28rpx;background:#343a5b}.detail-title{font-size:34rpx;font-weight:600;display:flex;gap:16rpx;align-items:center}.level-tag{font-size:24rpx;background:#196ac8;border-radius:12rpx;padding:6rpx 14rpx}.detail-name{font-size:27rpx;display:block;margin-top:16rpx}.detail-summary{display:block;color:#adb6cc;line-height:1.8;margin-top:12rpx}.beneficiary{color:#9daac4;font-size:22rpx;margin-top:22rpx}.detail-tabs{display:flex;background:#343a5b;margin-top:16rpx}.detail-tabs button{position:relative;flex:1;padding:24rpx 0;border-radius:0;background:transparent;color:#aeb6cc;font-size:29rpx;line-height:1.5;margin:0}.detail-tabs .active{color:#12baff}.detail-tabs .active::before{content:'';position:absolute;bottom:10rpx;left:calc(50% - 24rpx);width:48rpx;height:5rpx;background:#0eb8ff;border-radius:6rpx}.benefits-body{min-height:380rpx;background:#343a5b;padding:30rpx 28rpx}.catalog-body{min-height:380rpx;background:#343a5b;padding:0 28rpx}.chapter-row{display:flex;align-items:center;justify-content:space-between;gap:20rpx;padding:28rpx 4rpx;border-bottom:1rpx solid #64719044}.chapter-title{font-size:28rpx}.chapter-meta{font-size:24rpx;color:#a5afc6;margin-top:12rpx}.chapter-access{font-size:22rpx;color:#aab5ce;white-space:nowrap}.detail-footer{position:fixed;bottom:0;left:0;right:0;background:#343a5b;padding:20rpx 48rpx calc(24rpx + env(safe-area-inset-bottom));z-index:10}.detail-footer button{max-width:680rpx;margin:auto}.activation-mask{position:fixed;inset:0;z-index:100;background:#000b;display:flex;align-items:center;justify-content:center;padding:48rpx}.activation-dialog{width:100%;max-width:640rpx;background:linear-gradient(#2b365b,#202a46);padding:40rpx 36rpx 26rpx;border-radius:36rpx}.activation-title{text-align:center;font-size:32rpx;font-weight:600}.activation-member{display:block;text-align:center;font-size:24rpx;color:#aebbd6;margin:16rpx 0 26rpx}.activation-input{height:84rpx;background:#444e70;border-radius:48rpx;text-align:center;font-size:28rpx;color:#fff;padding:0 20rpx}.activation-error{display:block;color:#ff98ac;font-size:23rpx;line-height:1.6;margin:16rpx 4rpx}.activation-actions{display:flex;gap:30rpx;margin-top:26rpx}.activation-actions button{flex:1;color:#fff;background:none;font-size:28rpx;line-height:80rpx;padding:0;margin:0}.activation-actions .confirm{color:#06c8ff}
</style>
