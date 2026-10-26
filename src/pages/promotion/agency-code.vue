<template>
  <view class="promo-page">
    <view class="promo-frame">
      <button class="promo-back" aria-label="返回" @click="back"><image src="/static/common/icon-back.png" mode="aspectFit" /></button>
      <view class="promo-card">
        <view class="promo-banner"><text>推广码</text><image src="/static/profile/icon-referral-code.png" mode="aspectFit" /></view>
        <view class="promo-body">
          <view class="promo-tabs">
            <button v-for="type in agencyTypes" :key="type.id" :class="{ selected: selectedType === type.id }" :disabled="saving" @click="changeType(type.id)">{{ type.label }}</button>
          </view>
          <FeaturePageState :status="status" :error="error" @retry="load" />
          <template v-if="status === 'ready'">
            <image v-if="data.qrUrl" class="promo-qr" :src="data.qrUrl" mode="aspectFit" @error="imageError = true" />
            <view v-else-if="isMock && data.localPayload" class="promo-qr-wrap"><BusinessQrCode ref="localQr" :show-save="false" :value="data.localPayload" /></view>
            <EmptyState v-else text="暂无推广码" />
            <text v-if="imageError" class="promo-error">二维码图片加载失败，请刷新重试。</text>
            <text v-if="operationError" class="promo-error">{{ operationError }}</text>
            <button v-if="canSave || (isMock && data.localPayload)" class="promo-save" :disabled="saving" @click="canSave ? save() : saveLocal()">{{ saving ? '保存中…' : '保存图片' }}</button>
            <button v-if="isMock && data.localPayload" class="promo-link" @click="openApplication">填写代理申请</button>
            <button v-if="canCopy" class="promo-link" @click="copyLink">复制推广链接</button>
          </template>
        </view>
      </view>
    </view>
  </view>
</template>
<script setup>
import { ref, computed } from 'vue'
import { onUnload } from '@dcloudio/uni-app'
import { config } from '../../config'
import { getSession } from '../../services/api'
import { useAuth } from '../../composables/useAuth'
import { useAsyncPage } from '../../composables/useAsyncPage'
import { getAgencyPromotion, agencyTypes } from '../../services/exclusive'
import BusinessQrCode from '../../components/BusinessQrCode.vue'
import FeaturePageState from '../../components/FeaturePageState.vue'
import EmptyState from '../../components/EmptyState.vue'
useAuth()
const isMock = config.useMock, selectedType = ref('STORE'), saving = ref(false), operationError = ref(''), imageError = ref(false), localQr = ref(null)
let active = true, receivedAt = 0
const { data, status, error, load } = useAsyncPage(async () => { const result = await getAgencyPromotion(selectedType.value); receivedAt = Date.now(); imageError.value = false; return result })
const canSave = computed(() => data.value?.posterUrl && data.value?.allowedActions?.includes('download'))
const canCopy = computed(() => data.value?.shareUrl && data.value?.allowedActions?.includes('copy-link'))
function changeType(type) { if (saving.value || selectedType.value === type) return; selectedType.value = type; operationError.value = ''; load() }
function ensureCurrent(result) {
  if (result.accountId !== getSession()?.user?.id) throw new Error('账号已变化，请刷新推广码')
  if (!Number.isFinite(result.expiresAt) || !Number.isFinite(result.serverTime) || result.expiresAt <= result.serverTime + Date.now() - receivedAt) throw new Error('推广码已过期，请刷新后重试')
}
function copyLink() { try { ensureCurrent(data.value); uni.setClipboardData({ data: data.value.shareUrl }) } catch (reason) { operationError.value = reason.message } }
function openApplication() { uni.navigateTo({ url: `/pages/application/agency?promotionId=${encodeURIComponent(data.value.promotionId)}&agencyType=${selectedType.value}` }) }
function back() { uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/profile/index' }) }) }
function saveLocal() { localQr.value?.save?.() }
async function save() {
  if (saving.value || !canSave.value) return
  saving.value = true
  operationError.value = ''
  const result = data.value
  try {
    ensureCurrent(result)
    const response = await new Promise((resolve, reject) => uni.downloadFile({ url: result.posterUrl, success: resolve, fail: reject }))
    if (!active) return
    ensureCurrent(result)
    if (response.statusCode !== 200) throw new Error('图片下载失败')
    // #ifdef H5
    const link = document.createElement('a'); link.href = response.tempFilePath; link.download = `agency-${selectedType.value}.png`; link.click()
    // #endif
    // #ifndef H5
    await new Promise((resolve, reject) => uni.saveImageToPhotosAlbum({ filePath: response.tempFilePath, success: resolve, fail: reject }))
    // #endif
  } catch (reason) { if (active) operationError.value = reason.message || '保存失败，请检查相册权限后重试' }
  finally { if (active) saving.value = false }
}
onUnload(() => { active = false })
</script>
<style scoped>
.promo-page { min-height: 100vh; background: #07080d; color: #fff; font-size: clamp(14px, 3.73vw, 16px); }
.promo-frame { max-width: 750px; margin: 0 auto; padding: calc(1em + var(--status-bar-height, 0px)) 1.3em 2em; }
.promo-back { width: 2em; height: 2em; margin: 0 0 .8em; padding: 0; background: none; }
.promo-back image { width: 1.5em; height: 1.5em; }
.promo-card { overflow: hidden; border-radius: 1.1em; background: #fff; color: #24324d; }
.promo-banner { display: flex; align-items: flex-end; justify-content: space-between; min-height: 6.2em; padding: 1.1em 1.1em .9em; background: linear-gradient(120deg, #5aa6ff, #2f78ff); color: #fff; }
.promo-banner text { font-size: 1.45em; font-weight: 700; }
.promo-banner image { width: 4.2em; height: 4.2em; }
.promo-body { padding: 1em .9em 1.2em; }
.promo-tabs { display: flex; gap: .4em; }
.promo-tabs button { flex: 1; min-width: 0; margin: 0; padding: .35em .15em; border-radius: 2em; background: #e7eef8; color: #6d7f9e; font-size: .82em; line-height: 1.4; }
.promo-tabs .selected { background: linear-gradient(100deg, #2f78ff, #009cff); color: #fff; }
.promo-qr, .promo-qr-wrap { display: flex; justify-content: center; width: 12em; height: 12em; margin: 1.1em auto; }
.promo-qr { object-fit: contain; background: #fff; }
.promo-save { display: block; width: min(14em, 100%); margin: .2em auto 0; border-radius: 3em; background: linear-gradient(100deg, #003eff, #009cff); color: #fff; }
.promo-link { display: block; width: 100%; margin: .7em 0 0; padding: 0; background: none; color: #2f78ff; text-align: center; }
.promo-error { display: block; margin-top: .5em; color: #b23250; text-align: center; font-size: .86em; }
</style>
