<template>
  <view v-if="open" class="identity-mask" @click="emit('close')">
    <view class="identity-dialog" role="dialog" aria-modal="true" aria-label="切换身份" @click.stop>
      <view class="dialog-heading"><text>切换身份</text></view>
      <scroll-view scroll-y class="identity-options">
        <button v-for="(identity, index) in identities" :key="identity.id" class="identity-option" :class="{ selected: identity.id === selectedId }" @click="emit('select', identity.id)">
          <view class="option-avatar">{{ identity.name?.slice(0, 1) || '会' }}</view>
          <view class="option-info"><view class="option-title"><text class="option-name">{{ identity.name }}</text><text v-if="identity.mode !== 'parent' && identity.badge" class="option-badge">{{ identity.badge }}</text></view><view class="option-meta">ID：{{ identity.displayId }}<text v-if="identity.grade">　年级：{{ identity.grade }}</text></view></view>
          <text class="option-role">{{ identity.mode === 'parent' ? '家长' : `会员${index}` }}</text>
        </button>
      </scroll-view>
    </view>
  </view>
</template>
<script setup>
defineProps({ open: Boolean, identities: { type: Array, default: () => [] }, selectedId: { type: String, default: '' } })
const emit = defineEmits(['close', 'select'])
</script>
<style scoped>
.identity-mask{position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:48rpx}
.identity-dialog{width:100%;max-width:640rpx;border-radius:40rpx;background:linear-gradient(#2a365b,#202b48);padding:40rpx 30rpx}
.dialog-heading{display:flex;align-items:center;justify-content:center;position:relative;margin-bottom:36rpx;font-size:32rpx;font-weight:600}
.identity-options{max-height:58vh}.identity-option{position:relative;display:flex;align-items:center;gap:20rpx;width:100%;text-align:left;color:#fff;line-height:1.5;padding:26rpx 24rpx;margin:0 0 22rpx;background:#404c6e;border:2rpx solid transparent;border-radius:18rpx}.identity-option.selected{border-color:#11baff;background:#3b5279}.option-avatar{width:76rpx;height:76rpx;flex-shrink:0;border-radius:50%;background:#233352;border:2rpx solid #bbd2f4;display:flex;align-items:center;justify-content:center;font-size:30rpx}.option-info{flex:1;min-width:0}.option-title{display:flex;align-items:center;gap:10rpx;min-width:0;padding-right:68rpx;font-size:30rpx;font-weight:600}.option-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.option-badge{flex-shrink:0;font-size:20rpx;font-weight:500;line-height:1.6;color:#fff;border-radius:2em;padding:0 12rpx;background:linear-gradient(90deg,#00b8e8,#3155ff)}.option-meta{font-size:22rpx;color:#aebbd4;margin-top:8rpx;overflow-wrap:anywhere}.option-role{position:absolute;right:0;top:0;background:#65708e;border-radius:0 14rpx 0 14rpx;padding:2rpx 14rpx;font-size:22rpx}
</style>
