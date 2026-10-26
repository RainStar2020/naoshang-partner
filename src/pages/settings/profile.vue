<template>
  <view class="profile-page">
    <view class="profile-frame">
      <BusinessPageHeader title="个人信息" fallback="/pages/profile/index" />
      <view v-if="loading" class="profile-state">正在加载资料…</view>
      <view v-else-if="loadError" class="profile-state"><text>{{ loadError }}</text><button @click="load">重新加载</button></view>
      <view v-else-if="profile" class="profile-body">
        <view class="profile-card">
          <button class="profile-row" @click="chooseAvatar"><text>头像</text><image v-if="avatarPreview" class="avatar" :src="avatarPreview" mode="aspectFill" /><view v-else class="avatar letter">{{ nickname.slice(0, 1) || '会' }}</view><image class="chevron" src="/static/common/icon-chevron-right.png" mode="aspectFit" /></button>
          <view class="profile-row"><text>昵称</text><input v-model="nickname" maxlength="24" placeholder="请输入昵称" :disabled="saving" /><image class="chevron" src="/static/common/icon-chevron-right.png" mode="aspectFit" /></view>
          <view class="profile-row"><text>地区</text><view class="region-field"><RegionPicker plain :codes="regionCodes" :label="regionNames.join(' · ')" @change="regionChange" /></view></view>
          <view class="profile-row"><text>手机号</text><text class="value">{{ profile.phone || '未设置' }}</text></view>
          <view class="profile-row" @click="copyInvite"><text>邀请码</text><text class="value">{{ profile.inviteCode || '暂无' }}</text><image v-if="profile.inviteCode" class="copy" src="/static/common/icon-copy.png" mode="aspectFit" /></view>
          <view class="profile-row"><text>微信授权</text><text class="value">{{ profile.wechatBound ? '已授权' : '未授权' }}</text></view>
        </view>
        <text v-if="error" class="profile-error">{{ error }}</text>
      </view>
    </view>
    <view v-if="profile && !loading && !loadError" class="profile-footer"><button :disabled="saving || uploading || !dirty" @click="save">{{ uploading ? '正在处理头像…' : saving ? '保存中…' : '保存' }}</button></view>
  </view>
</template>
<script setup>
import { ref, computed } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { config } from '../../config'
import { useAuth } from '../../composables/useAuth'
import { getMyProfile, updateMyProfile, uploadProfileImage } from '../../services/profile'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
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
<style scoped>
.profile-page, .profile-frame, .profile-body, .profile-card, .profile-state { display: flex; flex-direction: column; }
.profile-page { min-height: 100vh; background: #272c47; color: #f3f6ff; font-size: clamp(14px, 3.73vw, 16px); }
.profile-frame { width: min(750px, 100%); min-height: 100vh; margin: 0 auto; }
.profile-state { padding: 2em 1em; text-align: center; color: #b7bdd2; }
.profile-state button { margin-top: .8em; border: 0; border-radius: 999px; background: #4a516c; color: #fff; }
.profile-body { padding: 1em .85em 7em; }
.profile-card { border-radius: .85em; background: #343a5b; overflow: hidden; }
.profile-row { width: 100%; min-height: 3.5em; margin: 0; padding: 0 1em; display: flex; flex-direction: row; align-items: center; gap: .7em; background: transparent; color: #f3f6ff; font-size: .95em; box-sizing: border-box; }
button.profile-row { width: 100%; border: 0; border-radius: 0; text-align: left; }
.profile-row + .profile-row { border-top: 1px solid rgba(103, 112, 141, .28); }
.profile-row > text:first-child { flex-shrink: 0; }
.avatar { width: 2.4em; height: 2.4em; margin-left: auto; border-radius: 50%; }
.avatar.letter { display: flex; align-items: center; justify-content: center; background: #24456f; border: 1px solid #8fafd6; }
.profile-row input, .value, .region-field { flex: 1; min-width: 0; text-align: right; color: #f3f6ff; font-size: 1em; }
.region-field { --auth-input-height: 2.2em; }
.chevron, .copy { width: .9em; height: .9em; flex-shrink: 0; }
.profile-error { display: block; margin-top: .7em; color: #ffabbc; font-size: .82em; }
.profile-footer { position: fixed; left: 50%; bottom: 0; z-index: 5; width: min(750px, 100%); transform: translateX(-50%); padding: .8em 1.4em calc(.8em + env(safe-area-inset-bottom)); background: #272c47; box-sizing: border-box; }
.profile-footer button { width: 100%; height: 2.8em; border: 0; border-radius: 999px; background: #3a4264; color: #9aa3bd; font-size: .95em; }
.profile-footer button:not([disabled]) { background: linear-gradient(100deg, #003eff, #009cff); color: #fff; }
</style>
