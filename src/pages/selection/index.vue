<template>
  <view class="shop-page selection-catalog">
    <view class="selection-frame">
      <view class="shop-selection-head">甄选</view>
      <view class="selection-coming-soon">
        <text>当前模块还在开发中，等待后续开放。</text>
      </view>
    </view>
    <AppTabBar active="selection" />
  </view>
</template>
<script setup>
import { useAuth } from '../../composables/useAuth'
import { useAppTabBar } from '../../composables/useAppTabBar'
import AppTabBar from '../../components/AppTabBar.vue'
useAuth()
useAppTabBar()
</script>
<style>@import '../../styles/commerce.css';</style>
<style scoped>
.selection-catalog { height: 100vh; overflow: hidden; background: #26376b; padding-bottom: 0; }
.selection-frame { display: flex; flex-direction: column; height: calc(100vh - 118rpx - env(safe-area-inset-bottom)); max-width: 750px; margin: 0 auto; }
.selection-catalog .shop-selection-head { font-size: 1.15em; padding: calc(.9em + var(--status-bar-height, 0px)) 1.4em .85em; background: #1e3164; line-height: 1.5; }
.selection-coming-soon { display: flex; flex: 1; align-items: center; justify-content: center; padding: 48rpx; color: #b6c5e0; font-size: 30rpx; text-align: center; line-height: 1.7; }
</style>
