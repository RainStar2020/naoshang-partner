<template>
  <view class="coupon-page">
    <view class="coupon-frame">
      <BusinessPageHeader title="优惠券" fallback="/pages/profile/index" />
      <view class="coupon-tabs"><button v-for="item in filters" :key="item.id" :class="{ selected: filter === item.id }" @click="change(item.id)">{{ item.label }}</button></view>
      <view class="coupon-body">
        <view v-if="status === 'loading'" class="coupon-state">正在加载优惠券…</view>
        <view v-else-if="status === 'error'" class="coupon-state"><text>{{ error }}</text><button @click="load">重新加载</button></view>
        <EmptyState v-else-if="!items.length" :text="`暂无${filters.find(item => item.id === filter).label}优惠券`" />
        <template v-else>
          <view v-for="coupon in items" :key="coupon.id" class="coupon-card" :class="{ muted: filter !== 'available' }">
            <view class="coupon-value"><view class="coupon-amount"><text class="currency">¥</text><text class="coupon-figure">{{ amount(coupon.discountAmount) }}</text></view><text class="coupon-threshold">{{ coupon.thresholdText }}</text></view>
            <view class="coupon-info"><view class="coupon-title">{{ coupon.title }}</view><text>{{ coupon.validUntilLabel }}</text><text>{{ coupon.scopeLabel }}</text></view>
          </view>
          <button v-if="hasMore" class="coupon-more" :disabled="loadingMore" @click="more">{{ loadingMore ? '加载中…' : '加载更多' }}</button>
          <text v-if="moreError" class="coupon-error">{{ moreError }}</text>
        </template>
      </view>
    </view>
  </view>
</template>
<script setup>
import { ref } from 'vue'
import { onShow, onUnload } from '@dcloudio/uni-app'
import { useAuth } from '../../composables/useAuth'
import { getCoupons } from '../../services/profile'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
import EmptyState from '../../components/EmptyState.vue'
useAuth()
const filters = [{ id: 'available', label: '待使用' }, { id: 'used', label: '已使用' }, { id: 'void', label: '已作废' }], filter = ref('available'), items = ref([]), status = ref('loading'), error = ref(''), hasMore = ref(false), loadingMore = ref(false), moreError = ref('')
let epoch = 0, cursor = null
const amount = value => Number.isFinite(value) ? (value / 100).toFixed(2).replace(/\.00$/, '') : '—'
function change(next) { if (next !== filter.value) { filter.value = next; load() } }
async function load() { const current = ++epoch; status.value = 'loading'; items.value = []; loadingMore.value = false; moreError.value = ''; try { const result = await getCoupons(filter.value); if (current === epoch) { items.value = result.items; cursor = result.nextCursor; hasMore.value = result.hasMore === true; status.value = 'ready' } } catch (reason) { if (current === epoch) { error.value = reason.message; status.value = 'error' } } }
async function more() { if (loadingMore.value || !hasMore.value) return; const current = epoch; loadingMore.value = true; try { const result = await getCoupons(filter.value, cursor); if (current === epoch) { items.value = [...new Map([...items.value, ...result.items].map(item => [item.id, item])).values()]; cursor = result.nextCursor; hasMore.value = result.hasMore === true } } catch (reason) { if (current === epoch) moreError.value = reason.message } finally { if (current === epoch) loadingMore.value = false } }
onShow(load); onUnload(() => { ++epoch })
</script>
<style scoped>
.coupon-page, .coupon-frame, .coupon-body, .coupon-state { display: flex; flex-direction: column; }
.coupon-page { min-height: 100vh; background: #272c47; color: #f3f6ff; font-size: clamp(14px, 3.73vw, 16px); }
.coupon-frame { width: min(750px, 100%); min-height: 100vh; margin: 0 auto; }
.coupon-tabs { display: flex; background: #343a5b; }
.coupon-tabs button { position: relative; flex: 1; min-width: 0; margin: 0; padding: .7em 0 .85em; border: 0; border-radius: 0; background: none; color: #a8b5ce; font-size: .9em; }
.coupon-tabs .selected { color: #fff; }
.coupon-tabs .selected:before { content: ''; position: absolute; bottom: .35em; left: calc(50% - .7em); width: 1.4em; height: 3px; border-radius: 3px; background: linear-gradient(90deg, #00c5ff, #3451ff); }
.coupon-body { padding: 1em .85em 2em; }
.coupon-state { padding: 2em 0; text-align: center; color: #b7bdd2; }
.coupon-state button, .coupon-more { margin-top: .8em; border: 0; border-radius: 999px; background: #4a516c; color: #fff; }
.coupon-card { display: flex; min-height: 6.4em; margin-bottom: .85em; overflow: hidden; border-radius: .7em; background: #343a5b; }
.coupon-card.muted { opacity: .5; }
.coupon-value { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .25em; width: 6.6em; flex-shrink: 0; background: linear-gradient(160deg, #0648ff, #009cff); }
.coupon-amount { display: flex; flex-direction: row; align-items: baseline; justify-content: center; flex-shrink: 0; font-size: 1.7em; font-weight: 700; line-height: 1; white-space: nowrap; }
.currency, .coupon-figure, .coupon-threshold { flex-shrink: 0; }
.currency { margin-right: .05em; font-size: .5em; }
.coupon-threshold { font-size: .75em; white-space: nowrap; }
.coupon-info { display: flex; flex: 1; flex-direction: column; gap: .35em; min-width: 0; padding: .85em .8em; }
.coupon-title { color: #fff; font-size: .95em; overflow-wrap: anywhere; }
.coupon-info > text { color: #98a7c2; font-size: .78em; line-height: 1.5; overflow-wrap: anywhere; }
.coupon-error { display: block; margin-top: .6em; color: #ffabbc; font-size: .82em; }
</style>
