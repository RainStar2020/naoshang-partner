<template>
  <view class="announcement-page">
    <view v-if="status === 'loading'" class="announcement-state">正在加载…</view>
    <view v-else-if="status === 'error'" class="announcement-state"><text>{{ error }}</text><button class="secondary" @click="load">重试</button></view>
    <view v-else-if="detail" class="announcement-body">
      <view class="announcement-title">{{ detail.title }}</view>
      <text v-if="detail.publishedAtLabel" class="announcement-date">发布于 {{ detail.publishedAtLabel }}</text>
      <ManagedRichContent :content="detail.content" />
      <text v-if="!detail.content?.nodes?.length" class="announcement-empty">正文待发布</text>
      <button v-if="readError" class="secondary" @click="recordRead">已读状态同步失败，点击重试</button>
    </view>
  </view>
</template>
<script setup>
import { ref } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { useAuth } from '../../composables/useAuth'
import { getSession } from '../../services/api'
import { getAnnouncement, markAnnouncementRead } from '../../services/learning'
import ManagedRichContent from '../../components/ManagedRichContent.vue'
useAuth()
const status = ref('loading'), error = ref(''), detail = ref(null), readError = ref('')
async function recordRead(){try{await markAnnouncementRead(id);readError.value=''}catch(reason){readError.value=reason.message}}
let id = '', epoch = 0
onLoad(options => { id = options.id || '' })
async function load() {
  if (!getSession()) return
  const current = ++epoch; status.value = 'loading'; detail.value = null
  try { const result = await getAnnouncement(id); if (current === epoch) { detail.value = result; status.value = 'ready';void recordRead() } }
  catch (reason) { if (current === epoch) { status.value = 'error'; error.value = reason.message || '公告加载失败' } }
}
onShow(load); onUnload(() => { ++epoch })
</script>
<style scoped>
.announcement-page{min-height:100vh;padding:24rpx;background:#272c47;max-width:750px;margin:auto;box-sizing:border-box}.announcement-state{display:flex;flex-direction:column;gap:24rpx;padding:80rpx 24rpx;text-align:center;color:#aeb9d1}.announcement-state button{min-width:200rpx;margin:auto;padding:0 28rpx}.announcement-body{padding:36rpx 32rpx 48rpx;background:#343a5b;border-radius:24rpx}.announcement-title{font-size:36rpx;font-weight:600;line-height:1.6;overflow-wrap:anywhere}.announcement-date{display:block;color:#9da9c4;margin:16rpx 0 32rpx;font-size:25rpx}.announcement-empty{display:block;color:#8ea0c4;font-size:26rpx;line-height:1.7}
</style>
