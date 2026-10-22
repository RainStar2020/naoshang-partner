<template><view class="empty-state"><image src="/static/common/empty-content.png" mode="aspectFit" /><text>{{ text }}</text></view></template>
<script setup>defineProps({ text: { type: String, default: '这里还没有内容～' } })</script>
<style scoped>.empty-state{padding:90rpx 24rpx;display:flex;flex-direction:column;align-items:center;gap:24rpx;color:#939fbb;font-size:28rpx;text-align:center}.empty-state image{width:200rpx;height:200rpx}</style>
