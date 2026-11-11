<template>
  <view class="points-exchange">
    <FeaturePageState :status="status" :error="error" mode="skeleton" skeleton-variant="metrics" @retry="load" />
    <template v-if="status === 'ready' && options">
      <view v-if="result" class="exchange-result">
        <view class="exchange-result-title">{{ successTitle }}</view>
        <text class="exchange-result-note">{{ resultNote }}</text>
        <button class="exchange-submit" @click="records">查看兑换记录</button>
        <button class="exchange-secondary" @click="back">返回上一页</button>
      </view>
      <template v-else>
        <view class="exchange-card">
          <text class="exchange-label">兑换积分</text>
          <input
            class="exchange-input"
            type="digit"
            :value="amount"
            :disabled="busy"
            maxlength="15"
            placeholder="请输入兑换积分"
            placeholder-class="exchange-placeholder"
            @input="onAmount"
          />
          <text class="exchange-available">{{ options.identityLabel }}可兑换积分 <template v-if="!availablePending">{{ availableLabel }}</template><MetricSkeleton v-else size="compact"/></text>
        </view>
        <text v-if="options.hasNegativeBalance && options.negativeBalanceHint" class="exchange-negative">{{ options.negativeBalanceHint }}</text>
        <text v-if="options.rateNote" class="exchange-note">{{ options.rateNote }}</text>
        <text v-if="operationError" class="exchange-error" role="alert">{{ operationError }}</text>
        <button
          class="exchange-submit"
          :disabled="busy || !canApply"
          @click="submit"
        >
          {{ busy ? '处理中…' : '申请兑换' }}
        </button>
        <text v-if="!canApply" class="exchange-disabled">{{ options.disabledReason || '当前暂不可申请兑换' }}</text>
      </template>
    </template>
  </view>
</template>
<script setup>
import { computed, ref, watch, onUnmounted } from 'vue'
import { money } from '../features/exclusive/format'
import { pickMetricNumber } from '../features/business/metric-display'
import { getPartnerPointsOptions, exchangePartnerPoints } from '../services/partner-wallet'
import { useAsyncPage } from '../composables/useAsyncPage'
import FeaturePageState from './FeaturePageState.vue'
import MetricSkeleton from './MetricSkeleton.vue'

const props = defineProps({ pageQuery: Object })
const amount = ref('')
const result = ref(null)
const busy = ref(false)
const operationError = ref('')
let active = true
let epoch = 0
let attemptKey = ''

const { data: options, status, error, load } = useAsyncPage(async () => {
  const output = await getPartnerPointsOptions(props.pageQuery?.contextId)
  amount.value = ''
  result.value = null
  attemptKey = ''
  operationError.value = ''
  return output
}, false)

watch(
  () => props.pageQuery,
  (query) => {
    if (query) load()
  },
  { immediate: true },
)

const available = computed(() => pickMetricNumber(options.value?.availablePoints))
const availablePending = computed(() => available.value == null)
const availableLabel = computed(() => (availablePending.value ? '' : money(available.value)))
const canApply = computed(() => options.value?.allowedActions?.includes('exchange'))
const successTitle = computed(() => {
  if (result.value?.status === 'PENDING_REVIEW') return '兑换申请已提交，等待审核'
  return '兑换申请已提交'
})
const resultNote = computed(() =>
  result.value?.status === 'PENDING_REVIEW'
    ? '等待审核，不代表已到账。'
    : '结果以所属身份的后台记录为准。',
)

function onAmount(event) {
  if (busy.value) return
  amount.value = String(event.detail?.value ?? '').replace(/[^\d.]/g, '')
  attemptKey = ''
  operationError.value = ''
  ++epoch
}

function validateAmount() {
  const value = Number(amount.value)
  if (!Number.isFinite(value) || value <= 0) throw new Error('请输入兑换积分')
  const min = options.value?.minPoints
  const max = options.value?.maxPoints ?? available.value
  if (min != null && value < min) throw new Error(`兑换积分至少 ${money(min)}`)
  if (max != null && value > max) throw new Error(`兑换积分不能超过 ${money(max)}`)
  if (available.value != null && value > available.value) throw new Error('可兑换积分不足')
  return value
}

async function submit() {
  if (busy.value || !canApply.value) return
  const current = ++epoch
  busy.value = true
  operationError.value = ''
  try {
    const points = validateAmount()
    if (!attemptKey) attemptKey = `points-exchange-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const output = await exchangePartnerPoints(points, attemptKey, props.pageQuery?.contextId)
    if (!active || current !== epoch) return
    result.value = output
  } catch (reason) {
    if (active && current === epoch) {
      operationError.value = reason.message || '申请未完成，请稍后查看记录'
      attemptKey = ''
    }
  } finally {
    if (active) busy.value = false
  }
}

function records() {
  const contextId = props.pageQuery?.contextId
  uni.navigateTo({
    url: contextId
      ? `/pages/wallet/withdrawals?contextId=${encodeURIComponent(contextId)}`
      : '/pages/wallet/withdrawals',
  })
}

function back() {
  if (getCurrentPages().length > 1) uni.navigateBack()
  else uni.switchTab({ url: '/pages/partners/index' })
}

async function refresh() {
  if (busy.value || result.value) return
  return load()
}

onUnmounted(() => {
  active = false
  ++epoch
})
defineExpose({ refresh })
</script>
<style scoped>
.points-exchange {
  min-height: calc(100vh - 3.2em);
  padding: 0.9em 0.85em 1.5em;
  box-sizing: border-box;
  color: #edf4ff;
}
.exchange-card {
  margin-bottom: 1.1em;
  padding: 0.95em 0.9em 0.85em;
  border-radius: 0.85em;
  background: #353a59;
}
.exchange-label {
  display: block;
  margin-bottom: 0.65em;
  font-size: 0.95em;
  line-height: 1.4;
}
.exchange-input {
  width: 100%;
  height: 2.7em;
  padding: 0 0.9em;
  box-sizing: border-box;
  border-radius: 0.55em;
  background: #2b314d;
  color: #fff;
  font-size: 0.95em;
}
.exchange-placeholder {
  color: #8d95b0;
}
.exchange-available {
  display: block;
  margin-top: 0.7em;
  text-align: right;
  color: #57adff;
  font-size: 0.82em;
  line-height: 1.5;
}
.exchange-note {
  display: block;
  margin: -0.4em 0 0.85em;
  color: #a8adc3;
  font-size: 0.82em;
  line-height: 1.5;
  text-align: center;
}
.exchange-negative { display: block; margin: -0.4em 0 0.85em; color: #ff9ab1; font-size: 0.82em; line-height: 1.5; text-align: center; }
.exchange-error {
  display: block;
  margin: 0 0 0.85em;
  color: #ff9ab1;
  font-size: 0.85em;
  line-height: 1.5;
}
.exchange-submit,
.exchange-secondary {
  display: block;
  width: 100%;
  margin: 0;
  padding: 0.85em 1em;
  border-radius: 2em;
  background: linear-gradient(95deg, #0340ff, #009bff);
  color: #fff;
  font-size: 1em;
  line-height: 1.4;
  text-align: center;
}
.exchange-submit::after,
.exchange-secondary::after {
  border: 0;
}
.exchange-submit[disabled] {
  opacity: 0.45;
}
.exchange-secondary {
  margin-top: 0.75em;
  background: #464c6b;
}
.exchange-disabled {
  display: block;
  margin-top: 0.75em;
  color: #a8adc3;
  font-size: 0.82em;
  text-align: center;
}
.exchange-result {
  padding: 1.2em 0.2em;
  text-align: center;
}
.exchange-result-title {
  margin-bottom: 0.55em;
  font-size: 1.15em;
  font-weight: 700;
}
.exchange-result-note {
  display: block;
  margin-bottom: 1.2em;
  color: #a8adc3;
  font-size: 0.85em;
  line-height: 1.6;
}
</style>
