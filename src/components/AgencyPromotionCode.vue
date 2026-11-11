<template>
  <view class="agency-promo-overlay" @click="emit('close')">
    <view class="agency-promo-dialog" @click.stop>
      <view class="agency-promo-card">
        <view class="agency-promo-head">
          <text class="agency-promo-mark" aria-hidden="true">TuiGuangMa</text>
          <text>推广码</text>
          <image src="/static/profile/icon-referral-code.png" mode="aspectFit" />
        </view>
        <view class="agency-promo-body">
          <view class="agency-promo-tabs">
            <button
              v-for="type in agencyTypes"
              :key="type.id"
              :class="{ selected: selectedType === type.id }"
              :disabled="saving || status === 'loading'"
              @click="changeType(type.id)"
            >{{ type.label }}</button>
          </view>
          <FeaturePageState :status="status" :error="error" mode="skeleton" skeleton-variant="dialog" @retry="load" />
          <template v-if="status === 'ready'">
            <image
              v-if="showRemoteQr"
              class="agency-promo-qr"
              :src="data.qrUrl"
              mode="aspectFit"
              @error="imageError = true"
            />
            <view v-else-if="scanPayload" class="agency-promo-qr-wrap">
              <BusinessQrCode
                ref="localQr"
                :show-save="false"
                :value="scanPayload"
                :poster-title="data.agencyPromotionCode || data.promotionId"
                :poster-heading="`${agencyTypeLabel}推广码`"
                :poster-hint="`扫码申请成为${agencyTypeLabel}代理`"
              />
            </view>
            <EmptyState v-else text="暂无推广码" />
            <text v-if="imageError && data.qrUrl" class="agency-promo-error">二维码图片加载失败，已尝试本地生成。</text>
            <text v-if="operationError" class="agency-promo-error">{{ operationError }}</text>
          </template>
        </view>
      </view>
      <button
        v-if="status === 'ready' && canSaveImage"
        class="agency-promo-save"
        :disabled="saving"
        @click="save"
      >{{ saving ? '保存中…' : '保存图片' }}</button>
      <button
        role="button"
        class="agency-promo-close"
        aria-label="关闭推广码"
        @click="emit('close')"
      >
        <image src="/static/common/icon-close-circle.png" mode="aspectFit" />
      </button>
    </view>
  </view>
</template>
<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { getSession } from '../services/api'
import { useAsyncPage } from '../composables/useAsyncPage'
import { getAgencyPromotion, agencyTypes } from '../services/exclusive'
import BusinessQrCode from './BusinessQrCode.vue'
import FeaturePageState from './FeaturePageState.vue'
import EmptyState from './EmptyState.vue'

const emit = defineEmits(['close'])
const selectedType = ref('STORE')
const saving = ref(false)
const operationError = ref('')
const imageError = ref(false)
const localQr = ref(null)
let active = true
let receivedAt = 0

// Overlay tool: explicit load only — avoid page onShow refreshing a closed/open sheet.
const { data, status, error, load } = useAsyncPage(async () => {
  const result = await getAgencyPromotion(selectedType.value)
  receivedAt = Date.now()
  imageError.value = false
  return result
}, false)

const scanPayload = computed(() => data.value?.localPayload || data.value?.shareUrl || '')
const agencyTypeLabel = computed(() => agencyTypes.find(type => type.id === selectedType.value)?.label || '代理')
const showRemoteQr = computed(() => Boolean(data.value?.qrUrl && !imageError.value))
const canSaveImage = computed(() => Boolean(data.value?.posterUrl || showRemoteQr.value || scanPayload.value))

load()

function changeType(type) {
  if (saving.value || selectedType.value === type) return
  selectedType.value = type
  operationError.value = ''
  load()
}

function ensureCurrent(result) {
  if (!result?.promotionId) throw new Error('推广码无效，请刷新后重试')
  if (result.accountId !== getSession()?.user?.id) throw new Error('账号已变化，请刷新推广码')
  if (Number.isFinite(result.expiresAt) && Number.isFinite(result.serverTime) && result.expiresAt <= result.serverTime + Date.now() - receivedAt) {
    throw new Error('推广码已过期，请刷新后重试')
  }
}

async function downloadImage(url) {
  const response = await new Promise((resolve, reject) => uni.downloadFile({ url, success: resolve, fail: reject }))
  if (response.statusCode && response.statusCode !== 200) throw new Error('图片下载失败')
  // #ifdef H5
  const link = document.createElement('a')
  link.href = response.tempFilePath
  link.download = `agency-${selectedType.value}.png`
  link.click()
  // #endif
  // #ifndef H5
  await new Promise((resolve, reject) => uni.saveImageToPhotosAlbum({ filePath: response.tempFilePath, success: resolve, fail: reject }))
  // #endif
}

async function save() {
  if (saving.value || !canSaveImage.value) return
  saving.value = true
  operationError.value = ''
  const result = data.value
  try {
    ensureCurrent(result)
    if (result.posterUrl) await downloadImage(result.posterUrl)
    else if (localQr.value?.save) localQr.value.save()
    else if (result.qrUrl && !imageError.value) await downloadImage(result.qrUrl)
    else throw new Error('暂无可保存的二维码')
    if (active) uni.showToast({ title: '已保存', icon: 'success' })
  } catch (reason) {
    if (active) {
      operationError.value = reason?.errMsg?.includes('auth')
        ? '请开启相册权限后重试'
        : (reason.message || '保存失败，请检查相册权限后重试')
    }
  } finally {
    if (active) saving.value = false
  }
}

onUnmounted(() => { active = false })
</script>
<style scoped>
.agency-promo-overlay {
  position: fixed;
  inset: 0;
  z-index: 110;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5em;
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.72);
  font-size: clamp(14px, 3.73vw, 16px);
  color: #fff;
}
.agency-promo-overlay button::after { border: 0; }
.agency-promo-dialog {
  width: 100%;
  max-width: 22em;
  padding: 0;
  background: transparent;
  overflow: visible;
}
.agency-promo-card {
  overflow: hidden;
  border-radius: 1.1em;
  background: linear-gradient(#9bb7ff, #fff 50%);
  color: #24324d;
}
.agency-promo-head {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.5em;
  overflow: hidden;
  min-height: 5.4em;
  padding: 2.1em 1em 0.95em;
  background: linear-gradient(110deg, #7476fc, #3a95ff);
  color: #fff;
  font-size: 1.2em;
  font-weight: 700;
}
.agency-promo-mark {
  position: absolute;
  left: 0.4em;
  top: 0.32em;
  z-index: 0;
  max-width: calc(100% - 0.8em);
  overflow: hidden;
  font-size: 1.2em;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.03em;
  color: rgba(255, 255, 255, 0.34);
  pointer-events: none;
  white-space: nowrap;
}
.agency-promo-head > text:not(.agency-promo-mark),
.agency-promo-head > image {
  position: relative;
  z-index: 1;
}
.agency-promo-head image {
  width: 3.6em;
  height: 3.6em;
}
.agency-promo-body {
  padding: 1em 0.9em 1.4em;
  border-radius: 1em;
  border-top: 1rpx solid #fff;
  background: #fff;
}
.agency-promo-tabs {
  display: flex;
  gap: 0.4em;
}
.agency-promo-tabs button {
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 0.35em 0.15em;
  border-radius: 2em;
  background: #e7eef8;
  color: #6d7f9e;
  font-size: 0.82em;
  line-height: 1.4;
}
.agency-promo-tabs .selected {
  background: linear-gradient(100deg, #2f78ff, #009cff);
  color: #fff;
}
.agency-promo-qr,
.agency-promo-qr-wrap {
  display: flex;
  justify-content: center;
  width: 12em;
  height: 12em;
  margin: 1.1em auto 0.4em;
}
.agency-promo-qr {
  object-fit: contain;
  background: #fff;
}
.agency-promo-qr-wrap :deep(.qr-wrap) {
  width: 100%;
  height: 100%;
  margin: 0;
  max-width: none;
}
.agency-promo-qr-wrap :deep(.qr-code) {
  width: 100%;
  height: 100%;
  padding: 0;
  aspect-ratio: auto;
  box-sizing: border-box;
}
.agency-promo-save {
  display: block;
  width: 55%;
  margin: 1.3em auto 0;
  border-radius: 3em;
  background: linear-gradient(95deg, #0340ff, #009bff);
  color: #fff;
  line-height: 2.4;
  font-size: 0.9em;
}
.agency-promo-close {
  display: block;
  width: 2em;
  margin: 1em auto 0;
  padding: 0;
  background: none;
  line-height: 1;
}
.agency-promo-close image {
  width: 2em;
  height: 2em;
}
.agency-promo-error {
  display: block;
  margin-top: 0.5em;
  color: #b23250;
  text-align: center;
  font-size: 0.86em;
}
</style>
