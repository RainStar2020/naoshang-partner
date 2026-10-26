<template>
  <view class="apply-page">
    <view class="apply-frame">
      <BusinessPageHeader title="我的申请" fallback="/pages/profile/index" />
      <view class="apply-body">
        <FeaturePageState :status="status" :error="error" @retry="load" />
        <template v-if="status === 'ready'">
          <EmptyState v-if="!items.length" text="暂无申请" />
          <view v-for="item in items" :key="item.id" class="application-card">
            <view class="application-heading"><text>{{ item.title }}</text><text :class="statusClass(item.applicationStatus)">{{ applicationStatus(item.applicationStatus) }}</text></view>
            <view class="application-store">
              <image :src="item.store?.coverUrl || '/static/agency/store-wutong.png'" mode="aspectFill" />
              <view>
                <view class="store-title">{{ item.store?.name }} <text v-if="item.store?.number" class="store-no">{{ item.store.number }}</text></view>
                <text class="store-address">{{ item.store?.address }}</text>
                <text v-if="item.store?.monthlyFee" class="store-fee">合店费 ¥{{ money(item.store.monthlyFee) }} /月</text>
              </view>
            </view>
            <view class="application-row"><text>合店费用</text><text>¥{{ money(item.payableAmount) }}</text></view>
            <view class="application-row"><text>申请时间</text><text>{{ dateLabel(item.createdAt) }}</text></view>
            <view v-if="item.reviewedAt" class="application-row"><text>审核时间</text><text>{{ dateLabel(item.reviewedAt) }}</text></view>
            <view v-if="item.rejectionReason" class="apply-error">{{ item.rejectionReason }}</view>
            <view class="application-states"><text>支付：{{ paymentLabel(item.paymentStatus) }}</text><text>合同：{{ item.contractStatus === 'SIGNED' ? '已签署' : item.contractStatus === 'NOT_SIGNED' ? '未签署' : '待确认' }}</text><text>权益：{{ item.entitlementStatus === 'OPEN' ? '已开通' : item.entitlementStatus === 'NOT_OPEN' ? '未开通' : '待确认' }}</text></view>
            <view v-if="item.refundStatus" class="application-row"><text>合店退款</text><text>{{ ({PENDING:'退款处理中',SUCCEEDED:'已退款',FAILED:'退款失败'})[item.refundStatus] || item.refundStatus }}</text></view>
            <button v-if="item.applicationStatus === 'PENDING_PAYMENT' && item.orderId" class="secondary" @click="pay(item.orderId)">继续付款</button>
          </view>
          <button v-if="hasMore" class="secondary" :disabled="loadingMore" @click="more">{{ loadingMore ? '加载中…' : '加载更多' }}</button>
          <text v-if="moreError" class="apply-error">{{ moreError }}</text>
        </template>
      </view>
    </view>
  </view>
</template>
<script setup>
import { ref, watch } from 'vue'
import { onUnload } from '@dcloudio/uni-app'
import { useAuth } from '../../composables/useAuth'
import { useAsyncPage } from '../../composables/useAsyncPage'
import { getMyApplications } from '../../services/exclusive'
import { money, applicationStatus } from '../../features/exclusive/format'
import { businessDateLabel } from '../../features/business/format'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
import FeaturePageState from '../../components/FeaturePageState.vue'
import EmptyState from '../../components/EmptyState.vue'
useAuth()
const items = ref([]), hasMore = ref(false), loadingMore = ref(false), moreError = ref('')
let cursor = null, epoch = 0
const { data, status, error, load } = useAsyncPage(() => getMyApplications())
watch(status, value => { if (value === 'loading') { ++epoch; loadingMore.value = false; moreError.value = '' } })
watch(data, result => { if (result) { items.value = result.items; hasMore.value = result.hasMore; cursor = result.nextCursor } })
const dateLabel = value => value ? businessDateLabel(value) : '—'
function pay(orderId){uni.navigateTo({url:`/pages/payment/cashier?orderId=${encodeURIComponent(orderId)}`})}
const paymentLabel = value => ({ NOT_STARTED: '未付款', PENDING: '待付款', PAID: '已付款', CANCELLED: '已取消' }[value] || '待确认')
const statusClass = value => ({ PENDING_REVIEW: 'pending', APPROVED: 'approved', REJECTED: 'rejected' }[value] || '')
async function more() {
  if (loadingMore.value || !hasMore.value) return
  const current = epoch
  loadingMore.value = true
  try {
    const result = await getMyApplications(cursor)
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
.apply-page { min-height: 100vh; background: #272c47; color: #fff; font-size: clamp(14px, 3.73vw, 16px); }
.apply-frame { max-width: 750px; margin: 0 auto; }
.apply-body { padding: .85em 1em 1.4em; }
.application-card { margin-bottom: .85em; padding: .95em 1em; border-radius: .85em; background: #353a59; }
.application-heading { display: flex; justify-content: space-between; gap: .6em; font-weight: 600; line-height: 1.45; }
.application-heading > text:last-child { flex-shrink: 0; font-weight: 500; }
.pending { color: #59b6ff; }
.approved { color: #b7bdd2; }
.rejected { color: #ff4b79; }
.application-store { display: flex; gap: .7em; margin: .8em 0 .3em; min-width: 0; }
.application-store > image { width: 4.6em; height: 4.6em; border-radius: .4em; flex-shrink: 0; background: #464c6b; }
.application-store > view { flex: 1; min-width: 0; }
.store-title { font-weight: 600; line-height: 1.45; }
.store-no { display: inline-flex; margin-left: .3em; padding: .02em .4em; border-radius: .3em; background: #2f78ff; font-size: .75em; font-weight: 500; }
.store-address { display: block; margin-top: .25em; color: #9aa3bd; font-size: .84em; line-height: 1.5; overflow-wrap: anywhere; }
.store-fee { display: block; margin-top: .3em; color: #ff4676; font-weight: 600; }
.application-row { display: flex; justify-content: space-between; gap: .8em; margin-top: .7em; line-height: 1.45; }
.application-row > text:first-child { color: #b7bdd2; flex-shrink: 0; }
.application-row > text:last-child { min-width: 0; text-align: right; overflow-wrap: anywhere; }
.application-states { display: flex; flex-wrap: wrap; gap: .35em .7em; margin-top: .75em; color: #9aa3bd; font-size: .82em; }
.apply-error { display: block; margin-top: .5em; color: #ffabbc; }
.secondary { margin-top: .4em; border-radius: 2em; background: #454b6b; color: #fff; }
</style>
