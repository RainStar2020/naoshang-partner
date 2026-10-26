<template>
  <view class="record-page">
    <view class="record-frame">
      <BusinessPageHeader :title="heading" fallback="/pages/profile/index" />
      <view class="record-body">
        <FeaturePageState :status="status" :error="error" @retry="load" />
        <template v-if="status === 'ready'">
          <EmptyState v-if="!items.length" :text="kind === 'orders' ? '该会员暂无订单' : '该会员暂无反馈'" />
          <template v-if="kind === 'orders'">
            <view v-for="order in items" :key="order.id" class="order-card" @click="orderDetail(order.id)">
              <text class="order-status">{{ order.status === 'PENDING_PAYMENT' ? '待支付' : (order.statusLabel || '状态待确认') }}</text>
              <view class="order-no">订单编号：{{ order.orderNo || order.id }}</view>
              <view v-for="line in order.items || []" :key="line.id || line.skuId" class="order-product">
                <image v-if="line.coverUrl" :src="line.coverUrl" mode="aspectFill" />
                <view class="order-copy">
                  <view>{{ line.title }}</view>
                  <text v-if="line.specLabel" class="order-spec">{{ line.specLabel }}</text>
                </view>
                <view class="order-price"><text>¥{{ money(line.unitAmount) }}</text><text>x{{ line.quantity }}</text></view>
              </view>
              <view v-if="order.status !== 'CANCELLED'" class="order-amount">{{ order.status === 'COMPLETED' ? '实付款' : '待付款' }}：<text>¥{{ money(order.payableAmount) }}</text></view>
            </view>
          </template>
          <template v-else>
            <view v-for="item in items" :key="item.id" class="feedback-card">
              <view class="feedback-title">{{ item.title }}</view>
              <view class="feedback-meta">
                <view>
                  <text>健脑官：{{ item.coachName || '—' }}</text>
                  <text>反馈时间：{{ item.createdAtLabel || businessDateLabel(item.createdAt) }}</text>
                </view>
                <button @click="detail(item.id)">查看详情</button>
              </view>
            </view>
          </template>
          <button v-if="hasMore" class="load-more" :disabled="loadingMore" @click="more">{{ loadingMore ? '加载中…' : '加载更多' }}</button>
          <text v-if="moreError" class="record-error">{{ moreError }}</text>
        </template>
      </view>
    </view>
  </view>
</template>
<script setup>
import { ref, watch, computed } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { useAuth } from '../../composables/useAuth'
import { useAsyncPage } from '../../composables/useAsyncPage'
import { getMemberRecords } from '../../services/members'
import { money } from '../../features/exclusive/format'
import { businessDateLabel } from '../../features/business/format'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
import FeaturePageState from '../../components/FeaturePageState.vue'
import EmptyState from '../../components/EmptyState.vue'
useAuth()
const memberId = ref(''), kind = ref(''), items = ref([]), hasMore = ref(false), loadingMore = ref(false), moreError = ref('')
let cursor = null, epoch = 0
const headings = { orders: '会员订单', training: '陪练反馈', 'self-study': '智习反馈', camp: '集训反馈' }
const heading = computed(() => headings[kind.value] || '会员记录')
const { data, status, error, load } = useAsyncPage(() => { if (!memberId.value) throw new Error('缺少会员编号'); return getMemberRecords(memberId.value, kind.value) }, false)
function readRouteId(value) { let text = value || ''; for (let i = 0; i < 2 && text.includes('%'); i++) { try { const next = decodeURIComponent(text); if (next === text) break; text = next } catch { break } } return text }
onLoad(options => { memberId.value = readRouteId(options.memberId); kind.value = options.kind || '' })
onShow(load)
watch(status, value => { if (value === 'loading') { ++epoch; loadingMore.value = false; moreError.value = '' } })
watch(data, result => { if (result) { items.value = result.items; hasMore.value = result.hasMore; cursor = result.nextCursor } })
function orderDetail(id) { uni.navigateTo({ url: `/pages/order/detail?id=${encodeURIComponent(id)}` }) }
function detail(id) { uni.navigateTo({ url: `/pages/feedback/detail?memberId=${encodeURIComponent(memberId.value)}&id=${encodeURIComponent(id)}` }) }
async function more() {
  if (loadingMore.value || !hasMore.value) return
  const current = epoch
  loadingMore.value = true
  try {
    const result = await getMemberRecords(memberId.value, kind.value, cursor)
    if (current === epoch) {
      items.value = [...new Map([...items.value, ...result.items].map(item => [item.id, item])).values()]
      cursor = result.nextCursor
      hasMore.value = result.hasMore
    }
  } catch (reason) { if (current === epoch) moreError.value = reason.message }
  finally { if (current === epoch) loadingMore.value = false }
}
onUnload(() => { ++epoch })
</script>
<style scoped>
.record-page { min-height: 100vh; background: #272c47; color: #fff; font-size: clamp(14px, 3.73vw, 16px); }
.record-frame { max-width: 750px; margin: 0 auto; }
.record-body { padding: .85em 1em calc(1.4em + env(safe-area-inset-bottom)); }
.record-page button { margin: 0; padding: 0; background: none; color: inherit; line-height: inherit; }
.record-page button::after { border: 0; }
.order-card, .feedback-card { position: relative; margin-bottom: .85em; padding: 1em .9em .9em; border-radius: .85em; background: #353a59; }
.order-status { position: absolute; top: 0; right: 0; padding: .15em .7em; border-radius: 0 .85em 0 .55em; background: #596381; color: #d7deee; font-size: .78em; }
.order-no { padding-right: 4.2em; color: #c5cbe0; font-size: .86em; }
.order-product { display: flex; gap: .7em; margin-top: .8em; }
.order-product > image { width: 4.6em; height: 4.6em; border-radius: .4em; flex-shrink: 0; background: #2a314c; }
.order-copy { flex: 1; min-width: 0; line-height: 1.45; overflow-wrap: anywhere; }
.order-spec { display: inline-block; margin-top: .35em; padding: .08em .55em; border-radius: 1em; background: #4a5170; color: #d5dced; font-size: .75em; }
.order-price { flex: none; text-align: right; }
.order-price text { display: block; }
.order-price text:last-child { color: #a2afc7; font-size: .8em; }
.order-amount { margin-top: .7em; color: #a8b7cf; font-size: .9em; text-align: right; }
.order-amount text { color: #ff4c79; font-size: 1.05em; }
.feedback-title { font-weight: 700; line-height: 1.5; }
.feedback-meta { display: flex; align-items: flex-end; justify-content: space-between; gap: .8em; margin-top: .55em; }
.feedback-meta text { display: block; color: #9aa3bd; font-size: .82em; line-height: 1.55; }
.feedback-meta button { flex: none; color: #57adff; font-size: .92em; }
.load-more { width: 100%; margin-top: .4em; border-radius: 2em; background: #454b6b; color: #fff; }
.record-error { display: block; margin-top: .45em; color: #ffabbc; text-align: center; }
</style>
