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
const props = defineProps({
  title: { type: String, default: '' },
  // Parent handles the header back control, for example a multi-step form.
  manualBack: { type: Boolean, default: false },
})
const emit = defineEmits(['back'])
function goBack() {
  const stay = props.manualBack
  emit('back')
  if (stay) return
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
  padding: 12rpx 56rpx 24rpx;
  padding-top: max(12rpx, var(--status-bar-height, 0px), env(safe-area-inset-top));
  padding-bottom: max(24rpx, env(safe-area-inset-bottom));
  overflow-y: auto;
}
.auth-brand { display: flex; flex: 1 0 140rpx; align-items: center; justify-content: center; padding: 16rpx 0; }
.auth-form { flex-shrink: 0; width: 100%; }
.auth-footer { display: flex; flex: 1 0 180rpx; flex-direction: column; justify-content: center; padding: 24rpx 0 12rpx; }
.auth-detail { background: linear-gradient(180deg, #0c154c 0%, #17356e 46%, #0a184f 78%, #050838 100%); --auth-input-height: clamp(88rpx, 6.6vh, 104rpx); }
.auth-navigation { flex-shrink: 0; display: flex; align-items: center; min-height: 88rpx; gap: 8rpx; color: #f4f7ff; font-size: 32rpx; line-height: 44rpx; padding-right: 180rpx; }
.auth-back { font-size: 54rpx; line-height: 60rpx; padding-right: 8rpx; }
.auth-wordmark { flex-shrink: 0; display: flex; align-items: center; gap: 16rpx; padding: 28rpx 0 8rpx; color: #f7f9ff; font-size: 30rpx; font-weight: 600; line-height: 42rpx; }
.auth-symbol { width: 72rpx; height: 72rpx; overflow: hidden; flex-shrink: 0; }
.auth-symbol image { display: block; width: 72rpx; }
.auth-detail .auth-form { flex: 1 0 auto; display: flex; flex-direction: column; padding-bottom: 28rpx; }
</style>
