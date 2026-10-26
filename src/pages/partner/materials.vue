<template>
  <view class="materials-page">
    <view class="type-tabs"><button v-for="option in materialTypes" :key="option.id" :class="{ active: type === option.id }" @click="changeType(option.id)">{{ option.label }}</button></view>
    <view v-if="status === 'loading'" class="materials-state">正在加载素材…</view>
    <view v-else-if="status === 'error'" class="materials-state"><text>{{ error }}</text><button class="secondary" @click="load">重新加载</button></view>
    <EmptyState v-else-if="!items.length" text="暂无素材" />
    <template v-else>
      <view v-for="group in groups" :key="group.id" class="material-group"><view v-if="group.title" class="group-title">{{ group.title }}</view><view class="material-grid" :class="`kind-${type}`"><view v-for="item in group.items" :key="item.id" class="material-card"><view class="material-cover" @click="openMaterial(item.id)"><image v-if="item.coverUrl" :src="item.coverUrl" mode="aspectFill" /><view v-else class="cover-placeholder"><image src="/static/partner/icon-materials.png" mode="aspectFit" /></view><image v-if="type === 'video'" class="video-play" src="/static/media/icon-play-small.png" mode="aspectFit" /></view><view class="material-information"><view class="material-title">{{ item.title }}</view><text v-if="type === 'article' && item.summary" class="material-summary">{{ item.summary }}</text><button class="use-material" @click="openMaterial(item.id)">使用</button></view></view></view></view>
      <button v-if="hasMore" class="load-more" :disabled="loadingMore" @click="loadMore">{{ loadingMore ? '正在加载…' : '加载更多' }}</button><text v-if="moreError" class="more-error">{{ moreError }}</text>
    </template>
  </view>
</template>
<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { getSession } from '../../services/api'
import { useAuth } from '../../composables/useAuth'
import { materialTypes, getMaterialCategories, getMaterials } from '../../services/materials'
import EmptyState from '../../components/EmptyState.vue'
useAuth()
const type = ref('image'), categoryId = ref(''), categories = ref([]), items = ref([])
const status = ref('loading'), error = ref(''), hasMore = ref(false), loadingMore = ref(false), moreError = ref('')
let epoch = 0, cursor = null
const groups = computed(() => {
  const result = new Map()
  for (const item of items.value) {
    const key = item.categoryId || 'uncategorized'
    if (!result.has(key)) result.set(key, { id: key, title: categories.value.find(category => category.id === key)?.name || '', items: [] })
    result.get(key).items.push(item)
  }
  return [...result.values()]
})
onLoad(options => { if (materialTypes.some(item => item.id === options.type)) type.value = options.type })
async function load() {
  if (!getSession()) return
  const current = ++epoch, currentType = type.value
  status.value = 'loading'; error.value = ''; moreError.value = ''; items.value = []; categories.value = []; cursor = null; hasMore.value = false; loadingMore.value = false
  try {
    const choices = await getMaterialCategories(currentType)
    if (current !== epoch) return
    categories.value = choices
    if (categoryId.value && !choices.some(item => item.id === categoryId.value)) categoryId.value = ''
    const result = await getMaterials(currentType, { categoryId: categoryId.value || undefined })
    if (current !== epoch) return
    items.value = result.items; cursor = result.nextCursor; hasMore.value = result.hasMore; status.value = 'ready'
  } catch (reason) { if (current === epoch) { status.value = 'error'; error.value = reason.message || '素材加载失败' } }
}
function changeType(next) { if (next !== type.value) { type.value = next; categoryId.value = ''; load() } }
async function loadMore() {
  if (!hasMore.value || loadingMore.value) return
  const current = epoch; loadingMore.value = true; moreError.value = ''
  try {
    const result = await getMaterials(type.value, { categoryId: categoryId.value || undefined, cursor })
    if (current !== epoch) return
    items.value = [...new Map([...items.value, ...result.items].map(item => [item.id, item])).values()]; cursor = result.nextCursor; hasMore.value = result.hasMore
  } catch(reason) { if (current === epoch) moreError.value = reason.message || '加载失败，请重试' }
  finally { if (current === epoch) loadingMore.value = false }
}
function openMaterial(id) { uni.navigateTo({ url: `/pages/partner/material-edit?id=${encodeURIComponent(id)}` }) }
onShow(load); onUnload(() => { ++epoch })
</script>
<style scoped>
.materials-page{min-height:100vh;background:#272c47;padding:24rpx 32rpx calc(40rpx + env(safe-area-inset-bottom));max-width:750px;margin:auto;color:#fff}.type-tabs{display:flex;gap:18rpx;margin-bottom:30rpx}.type-tabs button{flex:1;padding:10rpx 0;line-height:1.7;border-radius:50rpx;font-size:28rpx;color:#9da6c1;background:#444b6c;margin:0}.type-tabs .active{background:radial-gradient(ellipse,#04172d 25%,#0068b7 75%,#00baff);border:1rpx solid #0787ff;color:#fff}.category-scroll{width:100%;white-space:nowrap;margin-bottom:24rpx}.category-tabs{display:flex;gap:14rpx}.category-tabs button{font-size:24rpx;background:#323c5c;color:#abb8d2;padding:6rpx 24rpx;border-radius:30rpx;line-height:1.8;flex-shrink:0;margin:0}.category-tabs .selected{background:#075b8e;color:#a9eaff}.materials-state{display:flex;flex-direction:column;gap:24rpx;text-align:center;color:#aab6ce;padding:80rpx 24rpx}.materials-state button{padding:0 28rpx;margin:auto}.group-title{font-size:29rpx;font-weight:600;margin:30rpx 0 24rpx}.material-grid{display:grid;gap:22rpx 18rpx;grid-template-columns:repeat(3,minmax(0,1fr))}.material-card{min-width:0}.material-cover{aspect-ratio:1;position:relative;overflow:hidden;border-radius:16rpx;background:#323d5c}.material-cover>image{width:100%;height:100%}.cover-placeholder{display:flex;height:100%;align-items:center;justify-content:center}.cover-placeholder image{width:64rpx;height:64rpx;opacity:.45}.material-title{font-size:25rpx;line-height:1.6;margin-top:14rpx;color:#bac5dc;overflow-wrap:anywhere}.use-material{color:#168cff;background:#424b6c;font-size:25rpx;line-height:1.8;border-radius:40rpx;margin:12rpx 0 0;padding:4rpx 16rpx}.kind-article{display:flex;flex-direction:column;gap:24rpx}.kind-article .material-card{display:flex;gap:20rpx}.kind-article .material-cover{width:184rpx;flex-shrink:0}.material-information{min-width:0}.kind-article .material-information{flex:1}.kind-article .material-title{margin-top:0}.material-summary{font-size:23rpx;line-height:1.6;color:#909db9;display:block;margin-top:8rpx}.kind-article .use-material{max-width:184rpx;margin-left:auto}.kind-video{grid-template-columns:repeat(2,minmax(0,1fr))}.kind-video .video-play{position:absolute;right:16rpx;top:16rpx;width:48rpx;height:48rpx}.load-more{background:#3d4c73;color:#bcd4f8;border-radius:40rpx;font-size:26rpx;margin:36rpx auto 0;line-height:2.4;max-width:320rpx}.list-end,.more-error{display:block;text-align:center;font-size:22rpx;color:#8796b5;margin-top:32rpx}.more-error{color:#ffa1b5}
</style>
