<template>
  <FeaturePageSkeleton
    v-if="status === 'loading' && mode === 'skeleton'"
    :variant="skeletonVariant"
  />
  <view
    v-else-if="status !== 'ready' && status !== 'shell'"
    class="account-state"
    :class="{ 'forbidden-panel': status === 'forbidden' }"
  >
    <template v-if="status === 'forbidden'">
      <image class="forbidden-icon" src="/static/common/empty-content.png" mode="aspectFit" />
      <text class="forbidden-title">{{ forbiddenTitle || '暂无访问权限' }}</text>
      <text class="forbidden-detail">{{ forbiddenDetail || error || '请切换具有该功能权限的身份后重试' }}</text>
    </template>
    <template v-else>
      <text>{{ status === 'loading' ? '正在加载…' : error }}</text>
      <button v-if="status === 'error'" class="secondary" @click="$emit('retry')">重试</button>
    </template>
  </view>
</template>
<script setup>
import FeaturePageSkeleton from './FeaturePageSkeleton.vue'

defineProps({
  status: String,
  error: String,
  forbiddenTitle: { type: String, default: '' },
  forbiddenDetail: { type: String, default: '' },
  mode: {
    type: String,
    default: 'text',
    validator: value => ['text', 'skeleton'].includes(value),
  },
  skeletonVariant: {
    type: String,
    default: 'dashboard',
    validator: value => ['dashboard', 'dashboard-body', 'dashboard-benefits', 'list', 'metrics', 'dialog', 'profile'].includes(value),
  },
})
defineEmits(['retry'])
</script>
<style scoped>
.account-state{display:flex;flex-direction:column;align-items:center;gap:1em;padding:4em 1.2em;color:#a6b6d0;text-align:center;line-height:1.7}
.account-state .secondary{margin:0 auto;min-width:8em;padding:0 1.2em;border-radius:2em;background:#454b6b;color:#fff;line-height:2.4}
.forbidden-panel{padding:3.2em 1.4em 2em;gap:.75em}
.forbidden-icon{width:5.6em;height:5.6em;opacity:.9}
.forbidden-title{color:#fff;font-size:1.05em;font-weight:700;line-height:1.45}
.forbidden-detail{max-width:16em;color:#9aa6c4;font-size:.9em;line-height:1.7}
</style>
