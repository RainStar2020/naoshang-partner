<template>
  <view class="wh-split" :class="{ 'wh-three': items.length === 3, 'wh-divided': divided }">
    <view v-for="item in items" :key="item.label">
      <text>{{ item.label }}</text>
      <view>{{ item.value }}</view>
    </view>
  </view>
</template>
<script setup>
defineProps({
  items: { type: Array, default: () => [] },
  divided: { type: Boolean, default: false },
})
</script>
<style>@import '../styles/wholesale.css';</style>
