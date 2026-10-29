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
            <view class="agency-row"><text>门店地区</text><RegionPicker plain :label="draft.regionNames.join('')" :codes="draft.regionCodes" @change="regionChanged" /></view>
            <view class="agency-row address-row"><text>门店地址</text><textarea v-model="draft.address" maxlength="200" placeholder="请输入详细地址" auto-height /></view>
            <view v-if="data.agencyType === 'STORE' || !config.useMock" class="agency-row upload-row">
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
            <view class="agency-line"><text>代理费用合计</text><text class="agency-price">¥{{ money(data.payableAmount) }}</text></view>
            <text v-if="data.feeNote" class="fee-note">{{ data.feeNote }}</text>
            <text v-if="actionError" class="agency-error">{{ actionError }}</text>
            <text v-if="submitted" class="agency-done">申请已提交，等待审核</text>
            <view v-if="!submitted" @click="draft.agreementAccepted = !draft.agreementAccepted"><checkbox :checked="draft.agreementAccepted" />我已阅读并同意<text>《代理协议》</text></view>
            <button v-if="!submitted" class="submit" :disabled="busy || uploading" @click="submit">{{ busy ? '提交中…' : '提交开通申请' }}</button>
            <text v-if="data.agreement?.content?.nodes?.length" class="agreement-note">已阅读并同意《代理协议》</text>
            <text v-else class="agreement-note">代理协议暂未发布</text>
          </view>
        </template>
      </view>
    </view>
  </view>
</template>
<script setup>
import { ref } from 'vue'
import { config } from '../../config'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { rememberAgencyReturn } from '../../services/login-return'
import { getSession } from '../../services/api'
import { getAgencyApplicationOptions, submitAgencyApplication } from '../../services/agency-application'
import { uploadProfileImage } from '../../services/profile'
import { useAuth } from '../../composables/useAuth'
import { useAsyncPage } from '../../composables/useAsyncPage'
import { commerceRequestKey } from '../../services/commerce'
import { money } from '../../features/exclusive/format'
import RegionPicker from '../../components/RegionPicker.vue'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
import FeaturePageState from '../../components/FeaturePageState.vue'
useAuth()
let type = '', promotionId = '', active = true, key = '', fingerprint = ''
const draft = ref({ name: '', phone: '', address: '', regionNames: [], regionCodes: [], storefrontAssetId: '', agreementAccepted: false }), cover = ref(''), busy = ref(false), uploading = ref(false), submitted = ref(false), actionError = ref('')
const { data, status, error, load } = useAsyncPage(() => getAgencyApplicationOptions(type, promotionId), false)
function regionChanged(value) { draft.value.regionNames = value.names; draft.value.regionCodes = value.codes }
async function upload() {
  uploading.value = true
  try {
    const result = await new Promise((resolve, reject) => uni.chooseImage({ count: 1, success: resolve, fail: reject })), file = result.tempFiles[0], asset = await uploadProfileImage({ path: file.path, size: file.size }, 'storefront')
    if (active) { cover.value = asset.previewUrl; draft.value.storefrontAssetId = asset.assetId }
  } catch (reason) { if (active) actionError.value = reason.message || '门头照片上传未完成，请检查网络后重试' }
  finally { if (active) uploading.value = false }
}
async function submit() {
  if (busy.value) return
  busy.value = true
  actionError.value = ''
  try {
    const session = getSession(), value = JSON.stringify(draft.value)
    if (value !== fingerprint) { fingerprint = value; key = commerceRequestKey() }
    await submitAgencyApplication(data.value, { ...draft.value }, key)
    if (active && getSession()?.token === session.token) submitted.value = true
  } catch (reason) { if (active) actionError.value = reason.message || '代理申请提交未完成，请勿重复提交，可稍后查看申请记录' }
  finally { if (active) busy.value = false }
}
onLoad(query => { if (!getSession()) rememberAgencyReturn(query); type = query.agencyType || 'STORE'; promotionId = query.promotionId || ''; load() })
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
.agency-row input, .agency-row textarea { flex: 1; min-width: 0; margin: 0; padding: 0; border: 0; background: transparent; color: #fff; font-size: 1em; text-align: right; }
.address-row { align-items: flex-start; }
.address-row textarea { min-height: 2.6em; line-height: 1.5; }
.agency-line > text:last-child { flex: 1; min-width: 0; text-align: right; overflow-wrap: anywhere; }
.agency-price { color: #fff; font-weight: 700; }
.fee-note { display: block; margin-top: -.2em; color: #9aa3bd; font-size: .82em; text-align: right; }
.upload-row { align-items: flex-start; }
.upload-box { width: 5.2em; height: 5.2em; margin: 0 0 0 auto; padding: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: .45em; background: #4a516c; color: #c5cadb; line-height: 1.2; }
.upload-box image { width: 100%; height: 100%; border-radius: .45em; }
.upload-plus { font-size: 1.5em; line-height: 1; }
.agency-error { display: block; margin-top: .4em; color: #ffabbc; text-align: center; }
.agency-done { display: block; margin: .8em 0; color: #7eb6ff; text-align: center; }
.submit { width: 100%; margin: .9em 0 0; border-radius: 3em; background: linear-gradient(100deg, #003eff, #009cff); color: #fff; }
.submit[disabled] { opacity: .45; }
.agreement-note { display: block; margin-top: .75em; color: #9aa3bd; font-size: .86em; text-align: center; }
.agency-row :deep(.region-input) { flex: 1; min-width: 0; height: auto; justify-content: flex-end; background: none; padding: 0; color: #fff; font-size: 1em; }
.agency-row :deep(.region-input text) { text-align: right; }
</style>
