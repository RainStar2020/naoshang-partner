<template>
  <view class="auth-layout" :class="{ 'auth-detail': !!title }">
    <image v-if="!title" class="auth-background" src="/static/login/login-bg.png" mode="scaleToFill" />
    <view class="auth-content">
    <view v-if="title" class="auth-navigation"><button class="auth-back-button" aria-label="返回" @click="goBack"><image src="/static/common/icon-back.png" mode="aspectFit" /></button><text>{{ title }}</text></view>
      <view v-if="title" class="auth-wordmark"><view class="auth-symbol"><image src="/static/logo.png" mode="widthFix" /></view><text>脑商合伙人</text></view>
      <view v-if="$slots.brand" class="auth-brand"><slot name="brand" /></view>
      <view class="auth-form"><slot /></view>
      <view v-if="$slots.footer" class="auth-footer"><slot name="footer" /></view>
    </view>
  </view>
</template>

<script setup>
defineProps({ title: { type: String, default: '' } })
const emit = defineEmits(['back'])
function goBack() {
  emit('back')
  if (getCurrentPages().length > 1) uni.navigateBack()
  else uni.reLaunch({ url: '/pages/login/index' })
}
</script>

<style scoped>
.auth-back-button{background:none;margin:0;padding:8rpx 8rpx 8rpx 0;line-height:1;flex-shrink:0}.auth-back-button image{display:block;width:42rpx;height:42rpx}
/* Login / registration share one viewport; short screens can still reach every field. */
.auth-layout {
  position: relative;
  width: 100%;
  max-width: 750rpx;
  height: 100vh;
  height: 100dvh;
  margin: 0 auto;
  overflow: hidden;
  background: #070d48;
}
.auth-background { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.auth-content {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20rpx 48rpx;
  padding-top: max(20rpx, var(--status-bar-height, 0px), env(safe-area-inset-top));
  padding-bottom: max(20rpx, env(safe-area-inset-bottom));
  overflow-y: auto;
}
.auth-brand { display: flex; flex: 1 0 140rpx; align-items: center; justify-content: center; padding: 16rpx 0; }
.auth-form { flex-shrink: 0; width: 100%; }
.auth-footer { display: flex; flex: 1 0 180rpx; flex-direction: column; justify-content: center; padding: 24rpx 0 12rpx; }
.auth-detail { background: linear-gradient(180deg, #10134e, #1d3468 47%, #030640); --auth-input-height: clamp(80rpx, 6.5vh, 104rpx); }
.auth-navigation { flex-shrink: 0; display: flex; align-items: center; min-height: 72rpx; gap: 14rpx; font-size: 29rpx; padding-right: 180rpx; }
.auth-back { font-size: 54rpx; line-height: 60rpx; padding-right: 8rpx; }
.auth-wordmark { flex-shrink: 0; display: flex; align-items: center; gap: 12rpx; padding: 20rpx 0; font-size: 28rpx; font-weight: 600; }
.auth-symbol { width: 64rpx; height: 64rpx; overflow: hidden; }
.auth-symbol image { width: 64rpx; }
.auth-detail .auth-form { flex: 1 0 auto; display: flex; flex-direction: column; padding-bottom: 28rpx; }
</style>
