<template>
  <view class="award-page">
    <view class="award-frame">
      <BusinessPageHeader title="创始奖明细" fallback="/pages/profile/index" />
      <view class="award-body">
        <picker mode="date" fields="month" :value="month" @change="changeMonth">
          <view class="award-month">{{ monthTitle }}<image src="/static/common/icon-chevron-right.png" mode="aspectFit" /></view>
        </picker>
        <FeaturePageState :status="status" :error="error" @retry="load" />
        <template v-if="status === 'ready'">
          <view class="award-summary">
            <text>本月创始奖</text>
            <view class="award-total">¥{{ money(data.summary?.amount) }}</view>
            <view class="award-metrics">
              <view><text>本人身份</text><text>{{ data.summary?.identityLabel || '—' }}</text></view>
              <view><text>本月VIP数量</text><text>{{ data.summary?.vipCount ?? '—' }}</text></view>
              <view><text>分红比例</text><text>{{ percent(data.summary?.rateBps) }}</text></view>
            </view>
          </view>
          <view class="report-table">
            <view class="table-row table-heading"><text>月份</text><text>VIP数量</text><text>分红比例</text><text>本月创始奖</text></view>
            <view v-for="row in rows" :key="row.id" class="table-row"><text>{{ row.month }}</text><text>{{ row.vipCount ?? '—' }}</text><text>{{ percent(row.rateBps) }}</text><text>¥{{ money(row.amount) }}</text></view>
          </view>
          <EmptyState v-if="!rows.length" text="暂无创始奖记录" />
          <button v-if="hasMore" class="secondary" :disabled="loadingMore" @click="more">{{ loadingMore ? '加载中…' : '加载更多' }}</button>
          <text v-if="moreError" class="account-error">{{ moreError }}</text>
        </template>
      </view>
    </view>
  </view>
</template>
<script setup>
import { ref, watch, computed } from 'vue'
import { onUnload } from '@dcloudio/uni-app'
import { useAuth } from '../../composables/useAuth'
import { useAsyncPage } from '../../composables/useAsyncPage'
import { getFounderAwards } from '../../services/exclusive'
import { money, percent } from '../../features/exclusive/format'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
import FeaturePageState from '../../components/FeaturePageState.vue'
import EmptyState from '../../components/EmptyState.vue'
useAuth()
const now = new Date(), month = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`), rows = ref([]), hasMore = ref(false), loadingMore = ref(false), moreError = ref('')
const monthTitle = computed(() => `${Number(month.value.slice(5))}月创始奖`)
let cursor = null, epoch = 0
const { data, status, error, load } = useAsyncPage(() => getFounderAwards(month.value))
watch(data, result => { if (result) { rows.value = result.items; hasMore.value = result.hasMore; cursor = result.nextCursor } })
watch(status, value => { if (value === 'loading') { ++epoch; loadingMore.value = false; moreError.value = '' } })
function changeMonth(event) { month.value = event.detail.value; load() }
async function more() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  const current = epoch
  try {
    const result = await getFounderAwards(month.value, cursor)
    if (current === epoch) {
      rows.value = [...new Map([...rows.value, ...result.items].map(item => [item.id, item])).values()]
      cursor = result.nextCursor
      hasMore.value = result.hasMore
    }
  } catch (reason) { if (current === epoch) moreError.value = reason.message }
  finally { if (current === epoch) loadingMore.value = false }
}
onUnload(() => { ++epoch })
</script>
<style scoped>
.award-page { min-height: 100vh; background: #272c47; color: #fff; font-size: clamp(14px, 3.73vw, 16px); }
.award-frame { max-width: 750px; margin: 0 auto; }
.award-body { padding: .4em 1em 1.4em; }
.award-month { display: flex; align-items: center; justify-content: center; gap: .35em; padding: .7em 0 1em; font-size: 1.05em; }
.award-month image { width: .7em; height: .7em; transform: rotate(90deg); }
.award-summary { text-align: center; color: #b7bdd2; }
.award-total { margin: .25em 0 .9em; color: #fff; font-size: 2em; font-weight: 700; line-height: 1.2; }
.award-metrics { display: flex; gap: .4em; padding: .85em .4em; border-radius: .7em; background: #353a59; }
.award-metrics > view { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: .35em; }
.award-metrics text:last-child { color: #fff; font-weight: 700; overflow-wrap: anywhere; }
.report-table { margin-top: 1em; overflow-x: auto; }
.table-row { display: grid; grid-template-columns: 1.2fr .9fr .9fr 1.2fr; gap: .3em; padding: .75em .35em; text-align: center; background: #313652; }
.table-row > text { min-width: 0; overflow-wrap: anywhere; }
.table-row:nth-child(even) { background: #3a4060; }
.table-heading { background: #12315f; border: 1px solid #2f78ff; color: #d7e6ff; }
.secondary { margin-top: 1em; border-radius: 2em; background: #454b6b; color: #fff; }
.account-error { display: block; margin-top: .6em; color: #ffabbc; }
</style>
