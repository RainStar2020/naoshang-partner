<template>
  <view class="agency-page">
    <view class="agency-frame">
      <BusinessPageHeader :title="`申请${data?.label || '代理'}`" fallback="/pages/profile/index" />
      <view class="agency-body">
        <FeaturePageState :status="status" :error="error" @retry="load" />
        <template v-if="data">
          <view class="agency-card">
            <view class="agency-row"><text>姓名</text><input v-model="draft.name" placeholder="请输入姓名" maxlength="30" /></view>
            <view class="agency-row"><text>手机号</text><input v-model="draft.phone" placeholder="请输入手机号" type="number" maxlength="11" /></view>
          </view>
          <view class="agency-card">
            <view class="agency-row">
              <text>{{ regionFieldLabel }}</text>
              <RegionPicker
                plain
                :levels="data.regionLevels"
                :label="draft.regionNames.join('')"
                :codes="draft.regionCodes"
                @change="regionChanged"
              />
            </view>
            <text v-if="regionChecking" class="region-hint">正在检查该区域是否可申请…</text>
            <text v-else-if="regionOccupied" class="agency-error region-hint">该区域已有有效代理，请更换地区</text>
            <text v-else-if="regionAvailable" class="region-ok region-hint">该区域暂无代理，可以继续申请</text>
            <view v-if="data.agencyType === 'CITY'" class="agency-tier-block">
              <text class="agency-tier-label">城市人口档位</text>
              <view class="agency-tiers">
                <button
                  v-for="tier in data.cityTiers || []"
                  :key="tier.id"
                  :class="{ selected: draft.cityTierId === tier.id }"
                  :disabled="busy || uploading"
                  @click="selectCityTier(tier.id)"
                >{{ tier.label }}</button>
              </view>
            </view>
            <view v-if="isStoreApplication" class="agency-row">
              <text>门店名称</text>
              <input v-model="draft.storeName" placeholder="请输入门店名称" maxlength="255" />
            </view>
            <view v-if="data.requiresAddress" class="agency-row address-row">
              <text>门店地址</text>
              <textarea v-model="draft.address" maxlength="200" placeholder="请输入详细地址" auto-height />
            </view>
            <view v-if="data.requiresStorefront" class="agency-row upload-row">
              <text>门头照</text>
              <button class="upload-box" :disabled="uploading || busy" @click="upload">
                <image v-if="cover" :src="cover" mode="aspectFill" />
                <template v-else><text class="upload-plus">+</text><text>上传</text></template>
              </button>
            </view>
          </view>
          <view class="agency-card">
            <view class="agency-line"><text>代理推广码</text><text>{{ data.promotionId }}</text></view>
            <view class="agency-line"><text>申请代理等级</text><text>{{ data.label }}</text></view>
            <view class="agency-line"><text>代理费用合计</text><text class="agency-price">{{ data.payableWan }}万</text></view>
            <text v-if="data.feeNote" class="fee-note">{{ data.feeNote }} = {{ data.payableWan }}万</text>
            <text v-if="actionError" class="agency-error">{{ actionError }}</text>
            <text v-if="submitted" class="agency-done">申请已提交，等待审核</text>
            <view v-if="!submitted" class="agreement-line">
              <view
                class="agreement-check"
                :class="{ checked: draft.agreementAccepted }"
                role="checkbox"
                :aria-checked="draft.agreementAccepted"
                @click="draft.agreementAccepted = !draft.agreementAccepted"
              >
                <image v-if="draft.agreementAccepted" src="/static/login/icon-checked.png" mode="aspectFit" />
              </view>
              <view class="agreement-copy">
                我已阅读并同意
                <text @click.stop="agreementOpen = true">《代理协议》</text>
              </view>
            </view>
            <button v-if="!submitted" class="submit" :disabled="busy || uploading || regionChecking || regionOccupied" @click="submit">{{ busy ? '提交中…' : '提交开通申请' }}</button>
          </view>
        </template>
      </view>
    </view>
    <view v-if="agreementOpen" class="agency-mask" @click="agreementOpen = false">
      <view class="agency-sheet" role="dialog" aria-label="代理协议" @click.stop>
        <view class="sheet-heading">
          代理协议
          <button class="sheet-close" aria-label="关闭协议" @click="agreementOpen = false">
            <image src="/static/common/icon-close.png" mode="aspectFit" />
          </button>
        </view>
        <scroll-view scroll-y class="agreement-scroll">
          <ManagedRichContent v-if="data?.agreement?.content" :content="data.agreement.content" />
        </scroll-view>
      </view>
    </view>
  </view>
</template>
<script setup>
import { ref, computed } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { config } from '../../config'
import { rememberAgencyReturn } from '../../services/login-return'
import { getSession } from '../../services/api'
import { getMyProfile, uploadProfileImage } from '../../services/profile'
import {assetUrl} from '../../services/asset-url'
import { uploadAsset } from '../../services/asset-upload'
import { getAgencyApplicationOptions, submitAgencyApplication, applyCityTier, checkAgencyRegionAvailability } from '../../services/agency-application'
import { useAuth } from '../../composables/useAuth'
import { useAsyncPage } from '../../composables/useAsyncPage'
import { commerceRequestKey } from '../../services/commerce'
import RegionPicker from '../../components/RegionPicker.vue'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
import FeaturePageState from '../../components/FeaturePageState.vue'
import ManagedRichContent from '../../components/ManagedRichContent.vue'
useAuth()
let type = '', promotionId = '', active = true, key = '', fingerprint = '', applicantSeeded = false, regionCheckSeq = 0
const draft = ref({
  name: '',
  phone: '',
  promotionCode: '',
  storeName: '',
  address: '',
  regionNames: [],
  regionCodes: [],
  storefrontFileId: '',
  cityTierId: '',
  agreementAccepted: false,
})
const cover = ref(''), busy = ref(false), uploading = ref(false), submitted = ref(false), actionError = ref(''), agreementOpen = ref(false)
const regionChecking = ref(false), regionOccupied = ref(false), regionAvailable = ref(false)
function seedApplicant(profile) {
  if (applicantSeeded) return
  const user = getSession()?.user || {}
  draft.value.name = String(profile?.nickname || user.name || '').trim()
  draft.value.phone = String(profile?.phone || user.phone || '').trim()
  applicantSeeded = true
}
function resetRegionCheck() {
  regionChecking.value = false
  regionOccupied.value = false
  regionAvailable.value = false
}
const { data, status, error, load } = useAsyncPage(async () => {
  const [options, profileResult] = await Promise.all([
    getAgencyApplicationOptions(type, promotionId, draft.value.cityTierId || null, draft.value.promotionCode),
    getMyProfile().catch(() => null),
  ])
  seedApplicant(profileResult?.profile)
  draft.value.cityTierId = options.cityTierId || ''
  draft.value.regionNames = []
  draft.value.regionCodes = []
  draft.value.address = ''
  draft.value.storeName = ''
  draft.value.storefrontFileId = ''
  cover.value = ''
  resetRegionCheck()
  return options
}, false)
const isStoreApplication = computed(() => String(data.value?.agencyType || '').toUpperCase() === 'STORE')
const regionFieldLabel = computed(() => (data.value?.requiresAddress ? '门店地区' : '代理地区'))
async function verifySelectedRegion() {
  const seq = ++regionCheckSeq
  const codes = draft.value.regionCodes
  const levels = Number(data.value?.regionLevels) || 0
  const regionCode = Array.isArray(codes) && codes.length ? String(codes[codes.length - 1] || '').trim() : ''
  if (!data.value || !regionCode || (levels > 0 && codes.length < levels)) {
    if (seq === regionCheckSeq) resetRegionCheck()
    return
  }
  regionChecking.value = true
  regionOccupied.value = false
  regionAvailable.value = false
  try {
    const result = await checkAgencyRegionAvailability(data.value.agencyType, regionCode)
    if (!active || seq !== regionCheckSeq) return
    regionOccupied.value = result.available !== true
    regionAvailable.value = result.available === true
    if (regionOccupied.value) actionError.value = '该区域已有有效代理，请更换地区'
    else if (actionError.value.includes('已有有效代理')) actionError.value = ''
  } catch (reason) {
    if (!active || seq !== regionCheckSeq) return
    resetRegionCheck()
    actionError.value = reason.message || '区域占用检验未完成，请稍后重试'
  } finally {
    if (active && seq === regionCheckSeq) regionChecking.value = false
  }
}
function regionChanged(value) {
  draft.value.regionNames = value.names
  draft.value.regionCodes = value.codes
  actionError.value = ''
  verifySelectedRegion()
}
function selectCityTier(tierId) {
  if (!data.value || draft.value.cityTierId === tierId || busy.value || uploading.value) return
  draft.value.cityTierId = tierId
  data.value = applyCityTier(data.value, tierId)
}
async function upload() {
  uploading.value = true
  try {
    const result = await new Promise((resolve, reject) => uni.chooseImage({ count: 1, success: resolve, fail: reject }))
    const file = result.tempFiles?.[0]
    const path = file?.path || result.tempFilePaths?.[0]
    const uploadInput = { path, size: file?.size || 1, type: file?.type || file?.mimeType || '', name: file?.name || path || '' }
    const asset = config.useMock
      ? await uploadProfileImage(uploadInput, 'storefront')
      : await uploadAsset(uploadInput, {
        purpose: 'storefront',
        mimeType: uploadInput.type || 'image/jpeg',
        fileName: uploadInput.name || 'storefront.jpg',
      })
    if (active) {
      cover.value = assetUrl(asset.previewUrl)
      draft.value.storefrontFileId = asset.fileId || asset.assetId
    }
  } catch (reason) {
    if (active) actionError.value = reason.message || '门头照片上传未完成，请检查网络后重试'
  } finally {
    if (active) uploading.value = false
  }
}
async function submit() {
  if (busy.value || regionChecking.value || regionOccupied.value) return
  busy.value = true
  actionError.value = ''
  try {
    const session = getSession()
    const value = JSON.stringify(draft.value)
    if (value !== fingerprint) {
      fingerprint = value
      key = commerceRequestKey()
    }
    await submitAgencyApplication(data.value, { ...draft.value }, key)
    if (active && getSession()?.token === session.token) submitted.value = true
  } catch (reason) {
    if (!active) return
    actionError.value = reason.message || '代理申请提交未完成，请勿重复提交，可稍后查看申请记录'
    if (String(reason.message || '').includes('已有有效代理')) {
      regionOccupied.value = true
      regionAvailable.value = false
    }
  } finally {
    if (active) busy.value = false
  }
}
onLoad(query => {
  if (!getSession()) rememberAgencyReturn(query)
  type = query.agencyType || 'STORE'
  promotionId = query.promotionId || query.promotionCode || query.inviteCode || ''
  draft.value.promotionCode = promotionId
  load()
})
onUnload(() => { active = false })
</script>
<style scoped>
.agency-page { min-height: 100vh; background: #272c47; color: #fff; font-size: clamp(14px, 3.73vw, 16px); }
.agency-frame { max-width: 750px; margin: 0 auto; }
.agency-body { padding: .85em 1em 1.4em; }
.agency-card { margin-bottom: .85em; padding: .15em 1em .9em; border-radius: .85em; background: #353a59; }
.agency-row, .agency-line { display: flex; align-items: center; gap: .7em; min-width: 0; padding: .85em 0; }
.agency-row + .agency-row, .agency-line + .agency-line { border-top: 1px solid #454b6c; }
.agency-row > text, .agency-line > text:first-child { flex-shrink: 0; color: #d5dced; min-width: 4.6em; }
.agency-row input, .agency-row textarea { flex: 1; min-width: 0; margin: 0; padding: 0; border: 0; background: transparent; color: #fff; font-size: 1em; text-align: left; }
.address-row { align-items: flex-start; }
.address-row textarea { min-height: 2.6em; line-height: 1.5; }
.agency-line > text:last-child { flex: 1; min-width: 0; text-align: right; overflow-wrap: anywhere; }
.agency-price { color: #fff; font-weight: 700; }
.fee-note { display: block; margin-top: -.2em; color: #9aa3bd; font-size: .82em; text-align: right; line-height: 1.5; }
.agency-tier-block { padding: .85em 0 0; border-top: 1px solid #454b6c; }
.agency-tier-label { display: block; margin-bottom: .55em; color: #d5dced; }
.agency-tiers { display: flex; flex-direction: column; gap: .45em; }
.agency-tiers button { margin: 0; padding: .55em .75em; border-radius: .55em; background: #4a516c; color: #c5cadb; text-align: left; font-size: .9em; line-height: 1.4; }
.agency-tiers .selected { background: linear-gradient(100deg, #2f78ff, #009cff); color: #fff; }
.upload-row { align-items: flex-start; }
.upload-box { width: 5.2em; height: 5.2em; margin: 0; padding: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: .45em; background: #4a516c; color: #c5cadb; line-height: 1.2; }
.upload-box image { width: 100%; height: 100%; border-radius: .45em; }
.upload-plus { font-size: 1.5em; line-height: 1; }
.agency-error { display: block; margin-top: .4em; color: #ffabbc; text-align: center; }
.region-hint { display: block; margin: -.15em 0 .55em; font-size: .86em; line-height: 1.45; text-align: left; }
.region-ok { color: #7eb6ff; }
.agency-done { display: block; margin: .8em 0; color: #7eb6ff; text-align: center; }
.agreement-line { display: flex; align-items: center; gap: .45em; margin: 1em 0 .15em; color: #c5cadb; font-size: .9em; line-height: 1.4; }
.agreement-check { display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 1em; height: 1em; border: 1.5px solid #8eabda; border-radius: .2em; box-sizing: border-box; }
.agreement-check.checked { border-color: transparent; }
.agreement-check image { width: 1em; height: 1em; }
.agreement-copy { flex: 1; min-width: 0; }
.agreement-copy text { color: #7eb6ff; }
.submit { width: 100%; margin: .9em 0 0; border-radius: 3em; background: linear-gradient(100deg, #003eff, #009cff); color: #fff; }
.submit[disabled] { opacity: .45; }
.agency-row :deep(.region-input) { flex: 1; min-width: 0; height: auto; justify-content: flex-start; background: none; padding: 0; color: #fff; font-size: 1em; }
.agency-row :deep(.region-input text) { text-align: left; }
.agency-mask { position: fixed; inset: 0; z-index: 150; display: flex; align-items: flex-end; background: #0009; }
.agency-sheet { width: min(750px, 100%); margin: 0 auto; max-height: 82vh; padding: 1em 1em calc(1em + env(safe-area-inset-bottom)); border-radius: 1.2em 1.2em 0 0; background: #343a5c; }
.sheet-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: .8em; font-weight: 600; }
.sheet-close { width: 1.8em; height: 1.8em; margin: 0; padding: 0; background: none; }
.sheet-close image { width: 1.2em; height: 1.2em; }
.agreement-scroll { max-height: 68vh; color: #d5dced; font-size: .92em; line-height: 1.65; }
</style>
