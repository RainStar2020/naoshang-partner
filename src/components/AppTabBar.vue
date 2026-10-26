<template>
  <view class="app-tabbar-shell">
    <view class="app-tabbar-space" />
    <view class="app-tabbar" role="tablist" aria-label="主导航">
      <button v-for="item in tabs" :key="item.id" role="tab" :aria-selected="active === item.id" :aria-label="item.label" class="app-tab" :class="{ selected: active === item.id, 'needs-selected-tint': item.id === 'selection' }" @click="navigate(item)"><image :src="`/static/tabs/${item.id}${active === item.id ? '-active' : ''}.png`" mode="aspectFit" /><text>{{ item.label }}</text></button>
    </view>
  </view>
</template>
<script setup>
import { ref } from 'vue'
defineProps({ active: { type: String, required: true } })
const tabs = [{ id: 'member', label: '会员', url: '/pages/member/index' }, { id: 'partners', label: '联营', url: '/pages/partners/index' }, { id: 'selection', label: '甄选', url: '/pages/selection/index' }, { id: 'profile', label: '我的', url: '/pages/profile/index' }]
const navigating = ref(false)
function navigate(item) {
  if (navigating.value) return
  navigating.value = true
  uni.switchTab({ url: item.url, complete: () => { navigating.value = false }, fail: () => uni.showToast({ title: '页面切换失败，请重试', icon: 'none' }) })
}
</script>
<style scoped>
.app-tabbar-space{height:calc(118rpx + env(safe-area-inset-bottom))}.app-tabbar{position:fixed;bottom:0;left:0;right:0;z-index:70;display:flex;align-items:center;justify-content:space-around;gap:8rpx;padding:20rpx 24rpx calc(20rpx + env(safe-area-inset-bottom));background:#293a66}.app-tab{display:flex;align-items:center;justify-content:center;gap:10rpx;flex:1;max-width:174rpx;min-width:0;height:62rpx;padding:0 12rpx;margin:0;border:0;border-radius:42rpx;background-color:transparent;color:#92a5c4;line-height:1;font-family:inherit;font-size:27rpx;font-weight:400;white-space:nowrap}.app-tab::after{border:none}.app-tab image{width:36rpx;height:36rpx;flex-shrink:0}.app-tab.selected{color:#fff;background:linear-gradient(100deg,#00baff,#3154ff)}.app-tab.selected.needs-selected-tint image{filter:brightness(0) invert(1)}
</style>
