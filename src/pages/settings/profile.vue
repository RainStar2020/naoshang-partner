<template><view class="account-page"><view v-if="loading" class="account-state">正在加载资料…</view><view v-else-if="loadError" class="account-state"><text>{{ loadError }}</text><button class="secondary" @click="load">重新加载</button></view><template v-else-if="profile"><view class="account-card"><view class="account-row" @click="chooseAvatar"><text class="account-label">头像</text><view class="account-value"><image v-if="avatarPreview" class="edit-avatar" :src="avatarPreview" mode="aspectFill" /><view v-else class="edit-avatar letter">{{ nickname.slice(0,1) || '会' }}</view></view><image class="account-chevron" src="/static/common/icon-chevron-right.png" mode="aspectFit" /></view><view class="account-row"><text class="account-label">昵称</text><input v-model="nickname" class="account-input nickname" placeholder="请输入昵称" :maxlength="24" :disabled="saving" /></view><view class="account-row"><text class="account-label">地区</text><view class="region-field"><RegionPicker plain :codes="regionCodes" :label="regionNames.join('·')" @change="regionChange" /></view></view><view class="account-row"><text class="account-label">手机号</text><text class="account-value">{{ profile.phone || '未设置' }}</text></view><view class="account-row" @click="copyInvite"><text class="account-label">邀请码</text><text class="account-value">{{ profile.inviteCode || '暂无' }}</text><image v-if="profile.inviteCode" class="account-copy" src="/static/common/icon-copy.png" mode="aspectFit" /></view><view class="account-row"><text class="account-label">微信授权</text><text class="account-value">{{ profile.wechatBound ? '已授权' : '未授权' }}</text></view></view><text v-if="error" class="account-error">{{ error }}</text><view class="account-bottom"><button class="primary" :disabled="saving || uploading || !dirty" @click="save">{{ uploading ? '正在处理头像…' : saving ? '保存中…' : '保存' }}</button></view></template></view></template>
<script setup>
import { ref, computed } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { config } from '../../config'
import { useAuth } from '../../composables/useAuth'
import { getMyProfile, updateMyProfile, uploadProfileImage } from '../../services/profile'
import RegionPicker from '../../components/RegionPicker.vue'
useAuth()
const isMock = config.useMock, profile = ref(null), loading = ref(true), loadError = ref(''), error = ref(''), saving = ref(false), uploading = ref(false)
const nickname = ref(''), regionNames = ref([]), regionCodes = ref([]), avatarPreview = ref(''), avatarAssetId = ref('')
let epoch = 0
const dirty = computed(() => profile.value && (nickname.value.trim() !== profile.value.nickname || JSON.stringify(regionCodes.value) !== JSON.stringify(profile.value.regionCodes || []) || !!avatarAssetId.value))
async function load() {
  const current = ++epoch; loading.value = true; loadError.value = ''
  try { const result = await getMyProfile(); if(current !== epoch) return; profile.value = result.profile; nickname.value = result.profile.nickname; regionNames.value = result.profile.regionNames || []; regionCodes.value = result.profile.regionCodes || []; avatarPreview.value = result.profile.avatarUrl || ''; avatarAssetId.value = '' }
  catch(reason) { if(current === epoch) loadError.value = reason.message || '资料加载失败' }
  finally { if(current === epoch) loading.value = false }
}
function regionChange(value) { if(saving.value) return; regionNames.value = value.names; regionCodes.value = value.codes }
async function chooseAvatar() {
  if(saving.value || uploading.value) return
  const current = epoch; uploading.value = true; error.value = ''
  try { const result = await new Promise(resolve => uni.chooseImage({ count: 1, sourceType: ['album'], success: resolve, fail: () => resolve(null) })); if(!result || current !== epoch) return; const asset = await uploadProfileImage({ path: result.tempFilePaths[0], size: result.tempFiles[0].size }, 'avatar'); if(current === epoch) { avatarAssetId.value = asset.assetId; avatarPreview.value = asset.previewUrl } }
  catch(reason) { if(current === epoch) error.value = reason.message || '头像处理失败' }
  finally { if(current === epoch) uploading.value = false }
}
function copyInvite() { if(profile.value.inviteCode) uni.setClipboardData({ data: profile.value.inviteCode }) }
async function save() {
  if(saving.value || uploading.value || !dirty.value) return
  const current = epoch; saving.value = true; error.value = ''
  try { const result = await updateMyProfile({ nickname: nickname.value, regionCodes: regionCodes.value, regionNames: regionNames.value, avatarAssetId: avatarAssetId.value, version: profile.value.version }); if(current !== epoch) return; profile.value = result.profile; nickname.value = result.profile.nickname; avatarAssetId.value = ''; uni.showToast({ title: '已保存', icon: 'success' }) }
  catch(reason) { if(current === epoch) error.value = reason.message || '保存失败' }
  finally { if(current === epoch) saving.value = false }
}
onLoad(load); onUnload(() => { ++epoch })
</script>
<style>@import '../../styles/account.css';</style>
<style scoped>.edit-avatar{height:88rpx;width:88rpx;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle}.edit-avatar.letter{background:#24456f;border:2rpx solid #8fafd6;font-size:34rpx}.nickname{text-align:right}.region-field{flex:1;min-width:0;--auth-input-height:60rpx}</style>
