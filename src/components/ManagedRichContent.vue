<template>
  <view class="managed-content">
    <text v-if="error" class="content-error" role="alert">{{ error }}</text>
    <rich-text v-else-if="normalized.nodes.length" :nodes="normalized.nodes" />
  </view>
</template>
<script setup>
import { computed } from 'vue'
import { emptyContent, normalizeContent } from '../features/content/rich-content'
const props = defineProps({ content: { type: Object, default: emptyContent } })
const result = computed(() => {
  try { return { content: normalizeContent(props.content), error: '' } }
  catch (error) { return { content: emptyContent(), error: error.message } }
})
const normalized = computed(() => result.value.content)
const error = computed(() => result.value.error)
</script>
<style scoped>
.managed-content { width: 100%; overflow-wrap: anywhere; font-size: 28rpx; line-height: 1.8; }
.content-error { color: #aebad2; font-size: 24rpx; }
</style>
