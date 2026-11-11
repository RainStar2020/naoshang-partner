<template>
  <view
    class="metric-skeleton"
    :class="[`metric-skeleton-${size}`, { 'metric-skeleton-inline': inline }]"
    aria-hidden="true"
  >
    <view class="metric-skeleton-bar" />
  </view>
</template>

<script setup>
defineProps({
  /** compact: 摘要行内数字；block: 指标卡内主数字 */
  size: {
    type: String,
    default: 'compact',
    validator: value => ['compact', 'block'].includes(value),
  },
  inline: { type: Boolean, default: true },
})
</script>

<style scoped>
.metric-skeleton {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}
.metric-skeleton-inline {
  display: inline-flex;
  vertical-align: middle;
}
.metric-skeleton-bar {
  border-radius: 999px;
  background-color: #343a5b;
}
.metric-skeleton-compact .metric-skeleton-bar {
  width: 2.6em;
  height: 0.95em;
}
.metric-skeleton-block .metric-skeleton-bar {
  width: 2.8em;
  height: 1.15em;
}
</style>
