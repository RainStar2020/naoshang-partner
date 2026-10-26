<template>
  <view class="wh-card wh-record-card">
    <view class="wh-row wh-record-top">
      <view class="wh-record-copy">
        <text v-if="kicker" class="wh-muted">{{ kicker }}</text>
        <view class="wh-record-title">{{ title }}</view>
        <text v-if="caption" class="wh-muted">{{ caption }}</text>
      </view>
      <view class="wh-record-aside">
        <view class="wh-record-amount" :class="{ blue: accent }">{{ amount }}</view>
        <text v-if="badge" class="wh-pill-badge">{{ badge }}</text>
      </view>
    </view>
    <view v-if="fields.length" class="wh-meta-grid">
      <view v-for="(field, index) in fields" :key="index">{{ field }}</view>
    </view>
    <slot />
  </view>
</template>
<script setup>
defineProps({
  title: { type: String, default: '' },
  kicker: { type: String, default: '' },
  caption: { type: String, default: '' },
  amount: { type: String, default: '' },
  badge: { type: String, default: '' },
  accent: { type: Boolean, default: false },
  fields: { type: Array, default: () => [] },
})
</script>
<style>@import '../styles/wholesale.css';</style>
