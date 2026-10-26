<template>
  <view class="partner-tool-page feature-page">
    <BusinessPageHeader v-if="title" :title="title" fallback="/pages/partners/index" />
    <BusinessWithdrawals v-if="kind === 'withdrawals'" ref="page" :page-query="query" />
    <BusinessReport v-else-if="toolId" ref="page" :page-query="query" module="wholesale" :tool-id="toolId" />
    <BusinessOperation v-else-if="kind" ref="page" :page-query="query" :kind="kind" />
  </view>
</template>
<script setup>
import { ref } from 'vue'
import BusinessPageHeader from './BusinessPageHeader.vue'
import BusinessReport from './BusinessReport.vue'
import BusinessOperation from './BusinessOperation.vue'
import BusinessWithdrawals from './BusinessWithdrawals.vue'

defineProps({
  title: { type: String, default: '' },
  toolId: { type: String, default: '' },
  kind: { type: String, default: '' },
  query: { type: Object, default: null },
})
const page = ref(null)
defineExpose({ refresh: () => page.value?.refresh() })
</script>
<style scoped>
.partner-tool-page { min-height: 100vh; background: #272c47; }
.partner-tool-page :deep(.account-page) { min-height: calc(100vh - 3.2em); }
</style>
