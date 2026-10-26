<template>
  <view class="api-example">
    <button :disabled="loading" @click="load">{{ loading ? '加载中…' : '读取接口演示' }}</button>
    <text v-if="error">{{ error }}</text>
    <text v-if="displayId">当前编号：{{ displayId }}</text>
    <view v-for="item in products" :key="item.id">{{ item.title }}</view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { getCatalog, getMeBootstrap } from '../services/contracts'

const loading = ref(false)
const error = ref('')
const products = ref([])
const displayId = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [catalog, bootstrap] = await Promise.all([getCatalog(), getMeBootstrap()])
    if (catalog.locked || bootstrap.locked) {
      error.value = catalog.message || bootstrap.message || '请先开通权益'
      return
    }
    products.value = catalog.items
    displayId.value = bootstrap.displayId
  } catch (cause) {
    error.value = cause.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.api-example { padding: 24rpx; }
.api-example text { display: block; margin-top: 16rpx; }
</style>
