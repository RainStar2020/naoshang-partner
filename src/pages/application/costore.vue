<template>
  <view class="apply-page">
    <view class="apply-frame">
      <BusinessPageHeader title="申请合店" fallback="/pages/profile/index" />
      <view class="apply-body">
        <FeaturePageState :status="status" :error="error" @retry="load" />
        <template v-if="status === 'ready'">
          <view class="apply-card">
            <view class="panel-heading"><text>选择门店</text><button class="switch-store" :disabled="submitting || !!pendingIntent" @click="storeOpen = true">切换<image src="/static/common/icon-switch-arrows.png" mode="aspectFit" /></button></view>
            <view v-if="selectedStore" class="store-body">
              <image :src="selectedStore.coverUrl || '/static/common/icon-store.png'" mode="aspectFill" />
              <view>
                <view class="store-title">{{ selectedStore.name }} <text v-if="selectedStore.number" class="store-no">{{ selectedStore.number }}</text></view>
                <text class="store-address">{{ selectedStore.address }}</text>
                <text v-if="selectedStore.monthlyFee" class="store-fee">合店费 ¥{{ money(selectedStore.monthlyFee) }} /月</text>
              </view>
            </view>
            <EmptyState v-else text="暂无可申请门店" />
          </view>
          <view class="apply-card">
            <view class="panel-heading">开通时长</view>
            <view class="duration-options">
              <button v-for="option in data.durations" :key="option.id" :class="{ selected: durationId === option.id }" :disabled="submitting || !!pendingIntent" @click="selectDuration(option.id)">{{ option.label }}</button>
            </view>
            <view class="quote-total">合计价格：<text>{{ quoting ? '试算中…' : quote ? `¥${money(quote.payableAmount)}` : '—' }}</text></view>
            <text v-if="quoteError" class="apply-error">{{ quoteError }}</text>
            <button v-if="quoteError || (!quote && !quoting && storeId && durationId)" class="text-link" :disabled="submitting" @click="refreshQuote">重新试算</button>
            <view v-if="data.agreement?.version && data.agreement.content.nodes.length" class="agreement-line">
              <checkbox-group @change="agreed = $event.detail.value.includes('yes')"><label><checkbox value="yes" :checked="agreed" :disabled="submitting" color="#2f78ff" />已阅读并同意</label></checkbox-group>
              <button class="text-link" @click="agreementOpen = true">《合店协议》</button>
            </view>
            <text v-else class="apply-note">合店协议暂未发布{{ isMock ? '，当前仅可演示申请流程。' : '，暂不能提交正式申请。' }}</text>
            <text v-if="submitError" class="apply-error">{{ submitError }}</text>
            <text v-if="pendingIntent" class="apply-note">上一笔申请结果待确认，请重试原申请或查看我的申请。</text>
            <button class="submit" :disabled="submitting || quoting || !quote || (!pendingIntent && !isMock && !agreed)" @click="submit">{{ submitting ? '提交中…' : pendingIntent ? '重试原申请' : '支付并申请合店' }}</button>
            <button class="text-link applications" @click="openApplications">我的申请</button>
          </view>
          <view class="apply-card benefits">
            <view class="panel-heading centered">等级权益</view>
            <ManagedRichContent v-if="data.benefits?.nodes?.length" :content="data.benefits" />
            <EmptyState v-else text="这里还没有内容～" />
          </view>
        </template>
      </view>
    </view>
    <view v-if="storeOpen" class="apply-mask" @click="storeOpen = false">
      <view class="apply-sheet" role="dialog" aria-label="切换门店" @click.stop>
        <view class="sheet-heading">切换门店<button class="sheet-close" aria-label="关闭门店选择" @click="storeOpen = false"><image src="/static/common/icon-close.png" mode="aspectFit" /></button></view>
        <scroll-view scroll-y class="store-options">
          <button v-for="store in data.stores" :key="store.id" class="store-option" @click="selectStore(store.id)">
            <image :src="store.coverUrl || '/static/common/icon-store.png'" mode="aspectFill" />
            <view class="store-option-copy">
              <view class="store-title">{{ store.name }} <text v-if="store.number" class="store-no">{{ store.number }}</text></view>
              <text v-if="store.ownerLabel" class="owner-label">{{ store.ownerLabel }}</text>
              <text class="store-address">{{ store.address }}</text>
              <view class="store-facts">
                <view><text class="fact-label">店长姓名</text><text>{{ store.managerName || '—' }}</text></view>
                <view><text class="fact-label">联系方式</text><text>{{ store.phone || '—' }}</text></view>
                <view><text class="fact-label">合店费</text><text>{{ store.monthlyFee ? `¥${money(store.monthlyFee)}/月` : '—' }}</text></view>
              </view>
            </view>
          </button>
          <EmptyState v-if="!data.stores.length" text="暂无可申请门店" />
        </scroll-view>
      </view>
    </view>
    <view v-if="agreementOpen" class="apply-mask" @click="agreementOpen = false">
      <view class="apply-sheet" role="dialog" aria-label="合店协议" @click.stop>
        <view class="sheet-heading">合店协议<button class="sheet-close" aria-label="关闭协议" @click="agreementOpen = false"><image src="/static/common/icon-close.png" mode="aspectFit" /></button></view>
        <scroll-view scroll-y class="store-options"><ManagedRichContent :content="data.agreement.content" /></scroll-view>
      </view>
    </view>
  </view>
</template>
<script setup>
import { ref, computed } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { config } from '../../config'
import { useAuth } from '../../composables/useAuth'
import { useAsyncPage } from '../../composables/useAsyncPage'
import { getCostoreOptions, quoteCostore, submitCostoreApplication, getCostoreApplicationIntent, rememberCostoreApplicationIntent, clearCostoreApplicationIntent } from '../../services/exclusive'
import { money } from '../../features/exclusive/format'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
import FeaturePageState from '../../components/FeaturePageState.vue'
import ManagedRichContent from '../../components/ManagedRichContent.vue'
import EmptyState from '../../components/EmptyState.vue'
useAuth()
const isMock = config.useMock, storeId = ref(''), durationId = ref(''), storeOpen = ref(false), agreementOpen = ref(false), agreed = ref(false), quote = ref(null), quoting = ref(false), quoteError = ref(''), submitError = ref(''), submitting = ref(false)
let epoch = 0, active = true, attemptKey = '', quoteReceivedAt = 0
const pendingIntent=ref(getCostoreApplicationIntent())
const { data, status, error, load } = useAsyncPage(async () => {
  const result = await getCostoreOptions()
  if (!active) return result
  if(pendingIntent.value?.quote){const pending=pendingIntent.value;quote.value=pending.quote;storeId.value=pending.quote.storeId;durationId.value=pending.quote.durationId;attemptKey=pending.idempotencyKey;return result}
  storeId.value = result.stores.some(item => item.id === storeId.value) ? storeId.value : result.stores[0]?.id || ''
  durationId.value = result.durations.some(item => item.id === durationId.value) ? durationId.value : result.durations[0]?.id || ''
  await refreshQuote()
  return result
}, false)
const selectedStore = computed(() => data.value?.stores.find(item => item.id === storeId.value))
async function refreshQuote() {
  if(pendingIntent.value)return
  const current = ++epoch
  quote.value = null
  attemptKey = ''
  quoteError.value = ''
  submitError.value = ''
  if (!storeId.value || !durationId.value) return
  quoting.value = true
  try { const result = await quoteCostore(storeId.value, durationId.value); if (current === epoch && active) { quote.value = result; quoteReceivedAt = Date.now() } }
  catch (reason) { if (current === epoch && active) quoteError.value = reason.message }
  finally { if (current === epoch && active) quoting.value = false }
}
function selectStore(id) { if (submitting.value || pendingIntent.value) return; storeId.value = id; storeOpen.value = false; refreshQuote() }
function selectDuration(id) { if (submitting.value || pendingIntent.value || durationId.value === id) return; durationId.value = id; refreshQuote() }
function openApplications() { uni.navigateTo({ url: '/pages/application/list' }) }
async function submit() {
  if (submitting.value || quoting.value || !quote.value) return
  const selected = quote.value
  const current = epoch
  submitError.value = ''
  if (!pendingIntent.value && selected.expiresAt <= selected.serverTime + (Date.now() - quoteReceivedAt)) { submitError.value = '报价已过期，请重新试算'; await refreshQuote(); return }
  if (!pendingIntent.value && !isMock && (!agreed.value || !data.value.agreement?.version)) { submitError.value = '请阅读并同意已发布的合店协议'; return }
  submitting.value = true
  if (!attemptKey) attemptKey = `costore-${Date.now()}-${Math.random().toString(36).slice(2)}`
  try {
    const agreementVersion=pendingIntent.value?.agreementVersion || (agreed.value ? data.value.agreement?.version : null)
    pendingIntent.value=rememberCostoreApplicationIntent(selected,attemptKey,agreementVersion)
    const result = await submitCostoreApplication({ quoteId: selected.id, idempotencyKey: attemptKey, agreementVersion })
    if (!active || current !== epoch) return
    if (!result?.application?.id) throw new Error('申请结果异常，请到我的申请确认')
    quote.value = null
    pendingIntent.value=null
    const orderId = result.orderId || result.application.orderId
    if (!orderId) throw new Error('未返回付款订单，请到我的申请确认后重试')
    uni.navigateTo({ url: `/pages/payment/cashier?orderId=${encodeURIComponent(orderId)}` })
  } catch (reason) { if (active && current === epoch) {if(isMock)clearCostoreApplicationIntent();pendingIntent.value=getCostoreApplicationIntent();submitError.value = reason.message || '提交失败，请重试'} }
  finally { if (active) submitting.value = false }
}
onLoad(load)
onUnload(() => { active = false; ++epoch })
</script>
<style scoped>
.apply-page { min-height: 100vh; background: #272c47; color: #fff; font-size: clamp(14px, 3.73vw, 16px); }
.apply-frame { max-width: 750px; margin: 0 auto; }
.apply-body { padding: .85em 1em 1.4em; }
.apply-card { margin-bottom: .85em; padding: .95em 1em; border-radius: .85em; background: #353a59; }
.panel-heading { display: flex; align-items: center; justify-content: space-between; gap: .6em; margin-bottom: .8em; font-weight: 600; }
.switch-store, .text-link { display: inline-flex; align-items: center; gap: .25em; margin: 0; padding: 0; background: none; color: #7eb6ff; font-size: .92em; line-height: 1.4; }
.switch-store image { width: .9em; height: .9em; }
.store-body, .store-option { display: flex; gap: .7em; align-items: flex-start; min-width: 0; }
.store-body > image, .store-option > image { width: 4.6em; height: 4.6em; border-radius: .4em; flex-shrink: 0; background: #464c6b; }
.store-body > view, .store-option-copy { flex: 1; min-width: 0; }
.store-title { font-weight: 600; line-height: 1.45; }
.store-no { display: inline-flex; margin-left: .3em; padding: .02em .4em; border-radius: .3em; background: #2f78ff; font-size: .75em; font-weight: 500; }
.store-address, .owner-label { display: block; margin-top: .25em; color: #9aa3bd; font-size: .84em; line-height: 1.5; overflow-wrap: anywhere; }
.owner-label { color: #7eb6ff; }
.store-fee { display: block; margin-top: .35em; color: #ff4676; font-weight: 600; }
.duration-options { display: flex; gap: .7em; }
.duration-options button { flex: 1; margin: 0; padding: .7em .4em; border-radius: .45em; border: 1px solid transparent; background: #4a516c; color: #fff; }
.duration-options .selected { border-color: #2f9dff; background: #1d3f78; color: #59b6ff; }
.quote-total { margin: .9em 0 .2em; padding: .7em; border-radius: 2em; background: #4a516c; text-align: center; color: #d5dced; }
.quote-total text { color: #ff4676; font-weight: 700; }
.agreement-line { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: .2em; margin: .8em 0; color: #c5cadb; font-size: .9em; }
.apply-note, .apply-error { display: block; margin: .6em 0; color: #9aa3bd; font-size: .86em; line-height: 1.5; text-align: center; }
.apply-error { color: #ffabbc; }
.submit { width: 100%; margin: .4em 0 0; border-radius: 3em; background: linear-gradient(100deg, #003eff, #009cff); color: #fff; }
.submit[disabled] { opacity: .45; }
.applications { display: flex; width: 100%; justify-content: center; margin-top: .85em; }
.centered { justify-content: center; }
.benefits { text-align: center; }
.apply-mask { position: fixed; inset: 0; z-index: 150; display: flex; align-items: flex-end; background: #0009; }
.apply-sheet { width: min(750px, 100%); margin: 0 auto; max-height: 82vh; padding: 1em 1em calc(1em + env(safe-area-inset-bottom)); border-radius: 1.2em 1.2em 0 0; background: #343a5c; }
.sheet-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: .8em; font-weight: 600; }
.sheet-close { width: 1.8em; height: 1.8em; margin: 0; padding: 0; background: none; }
.sheet-close image { width: 1.2em; height: 1.2em; }
.store-options { max-height: 68vh; }
.store-option { width: 100%; margin: 0 0 .7em; padding: .75em; text-align: left; background: #484e6e; border-radius: .7em; color: #fff; }
.store-facts { display: flex; flex-wrap: wrap; gap: .45em 1em; width: 100%; margin-top: .55em; }
.store-facts > view { display: flex; flex-direction: column; gap: .15em; font-size: .8em; line-height: 1.35; }
.store-facts > view text:last-child { white-space: nowrap; }
.fact-label { color: #9aa3bd; }
</style>
