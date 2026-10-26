<template>
  <view class="edit-page">
    <view class="edit-frame">
      <BusinessPageHeader :title="title" fallback="/pages/profile/index" />
      <view v-if="loading" class="edit-state">正在加载…</view>
      <view v-else-if="loadError" class="edit-state"><text>{{ loadError }}</text><button @click="load">重试</button></view>
      <view v-else class="edit-body">
        <view class="edit-card">
          <view class="edit-row"><text>收货人</text><input v-model="recipient" maxlength="30" placeholder="请输入收货人" :disabled="saving" /></view>
          <view class="edit-row"><text>手机号</text><input v-model="phone" type="number" maxlength="11" placeholder="请输入手机号" :disabled="saving" /></view>
        </view>
        <view class="edit-card">
          <view class="edit-row"><text>所在地区</text><view class="address-region"><RegionPicker plain :codes="regionCodes" :label="regionNames.join('')" @change="regionChange" /></view></view>
          <view class="edit-row address-line"><text>详细地址</text><textarea v-model="detail" maxlength="200" auto-height placeholder="街道、门牌号等" :disabled="saving" /></view>
        </view>
        <view class="edit-card">
          <view class="edit-row">
            <view class="default-copy"><text>设置默认地址</text><text>每次下单都会默认使用该地址</text></view>
            <switch :checked="isDefault" :disabled="saving" color="#00adff" @change="isDefault = $event.detail.value" />
          </view>
        </view>
        <text v-if="error" class="edit-error">{{ error }}</text>
      </view>
    </view>
    <view v-if="!loading && !loadError" class="edit-footer"><button :disabled="saving" @click="save">{{ saving ? '保存中…' : '保存' }}</button></view>
  </view>
</template>
<script setup>
import { ref } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { useAuth } from '../../composables/useAuth'
import { getAddress, saveAddress } from '../../services/profile'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
import RegionPicker from '../../components/RegionPicker.vue'
useAuth()
const title = ref('添加地址'), recipient = ref(''), phone = ref(''), detail = ref(''), regionCodes = ref([]), regionNames = ref([]), isDefault = ref(false), loading = ref(true), loadError = ref(''), error = ref(''), saving = ref(false)
let id = '', version, epoch = 0
async function load() { const current = ++epoch; loading.value = true; loadError.value = ''; try { if (id) { const { address } = await getAddress(id); if (current !== epoch) return; recipient.value = address.recipient; phone.value = address.phone; detail.value = address.detail; regionCodes.value = address.regionCodes; regionNames.value = address.regionNames; isDefault.value = address.isDefault; version = address.version } } catch (reason) { if (current === epoch) loadError.value = reason.message || '地址加载失败' } finally { if (current === epoch) loading.value = false } }
function regionChange(value) { if (saving.value) return; regionCodes.value = value.codes; regionNames.value = value.names }
async function save() { if (saving.value) return; const current = epoch; saving.value = true; error.value = ''; try { await saveAddress(id, { recipient: recipient.value, phone: phone.value, detail: detail.value, regionCodes: regionCodes.value, regionNames: regionNames.value, isDefault: isDefault.value, version }); if (current === epoch) { uni.showToast({ title: '已保存', icon: 'success' }); if (getCurrentPages().length > 1) uni.navigateBack(); else uni.redirectTo({ url: '/pages/address/list' }) } } catch (reason) { if (current === epoch) error.value = reason.message || '保存失败' } finally { if (current === epoch) saving.value = false } }
onLoad(options => { id = options.id || ''; title.value = id ? '编辑地址' : '添加地址'; load() }); onUnload(() => { ++epoch })
</script>
<style scoped>
.edit-page, .edit-frame, .edit-body, .edit-card, .edit-state { display: flex; flex-direction: column; }
.edit-page { min-height: 100vh; background: #272c47; color: #f3f6ff; font-size: clamp(14px, 3.73vw, 16px); }
.edit-frame { width: min(750px, 100%); min-height: 100vh; margin: 0 auto; }
.edit-state { padding: 2em 1em; text-align: center; color: #b7bdd2; }
.edit-state button { margin-top: .8em; border: 0; border-radius: 999px; background: #4a516c; color: #fff; }
.edit-body { padding: 1em .85em 7em; }
.edit-card { margin-bottom: .85em; padding: 0 1em; border-radius: .85em; background: #343a5b; }
.edit-row { display: flex; flex-direction: row; align-items: center; gap: .7em; width: 100%; min-height: 3.4em; padding: .7em 0; box-sizing: border-box; }
.edit-row + .edit-row { border-top: 1px solid rgba(103, 112, 141, .28); }
.edit-row > text:first-child { flex-shrink: 0; min-width: 4.2em; }
.edit-row input, .edit-row textarea, .address-region { flex: 1; min-width: 0; color: #f3f6ff; font-size: 1em; text-align: right; }
.address-region { --auth-input-height: 2.2em; }
.address-line { align-items: flex-start; }
.edit-row textarea { min-height: 4.2em; line-height: 1.6; }
.default-copy { display: flex; flex: 1; flex-direction: column; gap: .2em; min-width: 0; }
.default-copy text:last-child { color: #99a8c3; font-size: .75em; }
.edit-error { display: block; color: #ffabbc; font-size: .82em; }
.edit-footer { position: fixed; left: 50%; bottom: 0; z-index: 5; width: min(750px, 100%); transform: translateX(-50%); padding: .8em 1.4em calc(.8em + env(safe-area-inset-bottom)); background: #272c47; box-sizing: border-box; }
.edit-footer button { width: 100%; height: 2.8em; border: 0; border-radius: 999px; background: linear-gradient(100deg, #003eff, #009cff); color: #fff; font-size: .95em; }
</style>
