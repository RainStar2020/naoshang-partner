<template>
  <view class="promo-video-page">
    <view v-if="status === 'loading'" class="page-state">正在加载视频…</view>
    <view v-else-if="status === 'error'" class="page-state" role="alert">
      <text>{{ error }}</text>
    </view>
    <view v-else-if="notReadyHint" class="page-state" role="status">
      <text>{{ notReadyHint }}</text>
    </view>
    <template v-else-if="share">
      <view class="video-stage">
        <view class="player-pane">
          <video v-if="share.mediaUrl" class="video-preview" :src="share.mediaUrl" :poster="share.posterUrl" controls object-fit="contain" :show-fullscreen-btn="true" />
          <view v-else class="page-state">视频地址不可用</view>
        </view>
        <view class="chat-dock" :class="{ open: chatOpen }">
          <button class="chat-toggle" @click="chatOpen = !chatOpen">{{ chatOpen ? '收起聊天' : '打开聊天' }}</button>
          <view v-if="chatOpen" class="chat-panel">
            <view class="chat-log">
              <text class="chat-title">{{ share.title }}</text>
              <text v-if="share.summary" class="chat-summary">{{ share.summary }}</text>
            </view>
            <view v-if="showChatQr" class="chat-qr">
              <image class="chat-qr-image" :src="share.qrImageUrl" mode="aspectFit" />
            </view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>
<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { describePublicVideoReadiness, getPublicPromoShare, shouldRenderVideoChatQr } from '../../../services/materials'

const status = ref('loading'), error = ref(''), share = ref(null), chatOpen = ref(false)
const showChatQr = computed(() => shouldRenderVideoChatQr(share.value))
const notReadyHint = computed(() => describePublicVideoReadiness(share.value))

function readShareId(options = {}) {
  const fromOptions = String(options.shareId || '').trim()
  if (fromOptions) return fromOptions
  // #ifdef H5
  try {
    const hash = window.location.hash || ''
    const query = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : window.location.search.replace(/^\?/, '')
    return String(new URLSearchParams(query).get('shareId') || '').trim()
  } catch {
    return ''
  }
  // #endif
  return ''
}

onLoad(async options => {
  const shareId = readShareId(options)
  status.value = 'loading'
  error.value = ''
  share.value = null
  chatOpen.value = false
  if (!shareId) {
    status.value = 'error'
    error.value = '缺少分享编号'
    return
  }
  try {
    const result = await getPublicPromoShare(shareId)
    if (result.type !== 'video') {
      status.value = 'error'
      error.value = '该分享不是视频内容页'
      return
    }
    share.value = result.hasH5RouteReadyField ? result : { ...result, hasH5RouteReadyField: false }
    if (result.title) uni.setNavigationBarTitle({ title: result.title })
    status.value = 'ready'
  } catch (reason) {
    status.value = 'error'
    error.value = reason.message || '该分享不存在或内容已下线'
  }
})
</script>
<style scoped>
.promo-video-page{min-height:100vh;background:#10162b;color:#e4ebfa}
.page-state{display:flex;flex-direction:column;gap:24rpx;padding:80rpx 24rpx;color:#a3b1cb;text-align:center;line-height:1.7}
.video-stage{display:flex;min-height:100vh;min-height:100dvh}
.player-pane{flex:1;min-width:0;display:flex;align-items:center;background:#10162b}
.video-preview{width:100%;height:100%;max-height:100vh;background:#10162b}
.chat-dock{width:88rpx;flex-shrink:0;background:#1a2140;border-left:1rpx solid #2c365c;display:flex;flex-direction:column}
.chat-dock.open{width:min(72vw,420rpx)}
.chat-toggle{margin:24rpx 8rpx 0;padding:16rpx 8rpx;line-height:1.4;font-size:22rpx;color:#eef3ff;background:#5d647c;border-radius:16rpx}
.chat-panel{flex:1;display:flex;flex-direction:column;padding:20rpx 16rpx calc(24rpx + env(safe-area-inset-bottom));overflow:auto}
.chat-log{flex:1}
.chat-title{display:block;font-size:26rpx;font-weight:600;line-height:1.6}
.chat-summary{display:block;margin-top:12rpx;color:#a3b1cb;font-size:22rpx;line-height:1.6}
.chat-qr{display:flex;justify-content:center;margin-top:24rpx;padding-top:20rpx;border-top:1rpx solid #2c365c}
.chat-qr-image{width:5.2em;height:5.2em;border-radius:.35em;background:#fff}
@media (max-width: 640px) {
  .video-stage{flex-direction:column}
  .player-pane{min-height:56vh}
  .chat-dock,.chat-dock.open{width:100%;border-left:0;border-top:1rpx solid #2c365c}
}
</style>
