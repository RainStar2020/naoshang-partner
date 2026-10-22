<template>
  <view class="announcements-page">
    <view v-if="status === 'loading'" class="announcement-state">正在加载公告…</view>
    <view v-else-if="status === 'error'" class="announcement-state"><text>{{ error }}</text><button class="secondary" @click="load(true)">重新加载</button></view>
    <view v-else-if="!items.length" class="announcement-state">暂无公告</view>
    <template v-else>
      <button v-for="item in items" :key="item.id" class="announcement-card" @click="open(item.id)"><view class="announcement-title">{{ item.title }}</view><view v-if="item.summary" class="announcement-summary">{{ item.summary }}</view><view class="announcement-foot"><text>{{ item.publishedAtLabel || '' }}</text><text>查看详情</text></view></button>
      <button v-if="hasMore" class="secondary" :disabled="loadingMore" @click="load(false)">{{ loadingMore ? '正在加载…' : '加载更多' }}</button>
      <text v-if="moreError" class="more-error">{{ moreError }}</text>
    </template>
  </view>
</template>
<script setup>
import { ref } from 'vue'
import { onShow, onUnload } from '@dcloudio/uni-app'
import { useAuth } from '../../composables/useAuth'
import { getSession } from '../../services/api'
import { getAnnouncements } from '../../services/learning'
useAuth()
const status = ref('loading'), items = ref([]), error = ref(''), hasMore = ref(false), loadingMore = ref(false), moreError = ref('')
let cursor = null, epoch = 0
async function load(reset) {
  if (!getSession() || (!reset && loadingMore.value)) return
  const current = reset ? ++epoch : epoch
  if (reset) { status.value = 'loading'; items.value = []; cursor = null; loadingMore.value = false }
  else loadingMore.value = true
  moreError.value = ''
  try {
    const result = await getAnnouncements(reset ? null : cursor)
    if (current !== epoch) return
    items.value = reset ? result.items : [...new Map([...items.value, ...result.items].map(item => [item.id, item])).values()]
    cursor = result.nextCursor; hasMore.value = result.hasMore === true && !!cursor; status.value = 'ready'
  } catch (reason) {
    if (current !== epoch) return
    if (reset) { status.value = 'error'; error.value = reason.message || '公告加载失败' }
    else moreError.value = reason.message || '加载失败，请重试'
  } finally { if (current === epoch) loadingMore.value = false }
}
function open(id) { uni.navigateTo({ url: `/pages/learning/announcement-detail?id=${encodeURIComponent(id)}` }) }
onShow(() => load(true)); onUnload(() => { ++epoch })
</script>
<style scoped>
.announcements-page{min-height:100vh;background:#272c47;padding:24rpx;max-width:750px;margin:auto}.announcement-state{display:flex;flex-direction:column;gap:24rpx;padding:80rpx 24rpx;text-align:center;color:#aeb9d1}.announcement-state button{min-width:200rpx;margin:auto;padding:0 28rpx}.announcement-card{width:100%;padding:28rpx;margin-bottom:24rpx;text-align:left;background:#343a5b;color:#fff;border-radius:24rpx;line-height:1.7}.announcement-title{font-size:32rpx;font-weight:600;overflow-wrap:anywhere}.announcement-summary{margin-top:22rpx;white-space:nowrap;text-overflow:ellipsis;overflow:hidden;font-size:26rpx;color:#aab5cf}.announcement-foot{display:flex;justify-content:space-between;gap:20rpx;margin-top:24rpx;color:#a5afc7;font-size:24rpx}.announcement-foot text:last-child{color:#00baff}.more-error{display:block;color:#ff9caf;margin:20rpx;text-align:center}
</style>
