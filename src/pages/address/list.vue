<template>
  <view class="address-page">
    <view class="address-frame">
      <BusinessPageHeader title="地址管理" fallback="/pages/profile/index" />
      <view v-if="status === 'loading'" class="address-state">正在加载地址…</view>
      <view v-else-if="status === 'error'" class="address-state"><text>{{ error }}</text><button @click="load">重试</button></view>
      <view v-else class="address-body">
        <EmptyState v-if="!items.length" text="暂无收货地址" />
        <view v-for="address in items" :key="address.id" class="address-card">
          <view class="address-person"><text v-if="address.isDefault" class="default-badge">默认</text>{{ address.recipient }} {{ address.phone }}</view>
          <view class="address-detail">{{ address.regionNames?.join('') }} {{ address.detail }}</view>
          <view class="address-actions">
            <button :disabled="busy || address.isDefault" class="default-action" :class="{ selected: address.isDefault }" @click="setDefault(address)"><image class="default-radio" :src="address.isDefault ? '/static/common/icon-radio-checked.png' : '/static/common/icon-radio-unchecked.png'" mode="aspectFit" /><text>默认地址</text></button>
            <button :disabled="busy" @click="edit(address.id)"><image class="address-action-icon" src="/static/common/icon-edit.png" mode="aspectFit" />编辑</button>
            <button :disabled="busy" @click="remove(address)"><image class="address-action-icon" src="/static/common/icon-delete.png" mode="aspectFit" />删除</button>
          </view>
        </view>
        <button v-if="hasMore" class="address-more" :disabled="loadingMore" @click="more">{{ loadingMore ? '加载中…' : '加载更多' }}</button>
        <text v-if="operationError" class="address-error">{{ operationError }}</text>
      </view>
    </view>
    <view class="address-footer"><button :disabled="busy" @click="edit('')">添加地址</button></view>
    <view v-if="pending" class="address-mask" @click="pending = null">
      <view class="address-dialog" role="dialog" :aria-label="pending.message" @click.stop>
        <text>{{ pending.message }}</text>
        <view class="dialog-actions">
          <button @click="pending = null">取消</button>
          <button class="dialog-ok" @click="confirmPending">确定</button>
        </view>
      </view>
    </view>
  </view>
</template>
<script setup>
import { ref } from 'vue'
import { onShow, onUnload } from '@dcloudio/uni-app'
import { useAuth } from '../../composables/useAuth'
import { getAddresses, setDefaultAddress, deleteAddress } from '../../services/profile'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
import EmptyState from '../../components/EmptyState.vue'
useAuth()
const status = ref('loading'), items = ref([]), error = ref(''), operationError = ref(''), busy = ref(false), hasMore = ref(false), loadingMore = ref(false), pending = ref(null)
let epoch = 0, cursor = null
async function load() { const current = ++epoch; status.value = 'loading'; items.value = []; try { const result = await getAddresses(); if (current === epoch) { items.value = result.items; cursor = result.nextCursor; hasMore.value = result.hasMore === true; status.value = 'ready' } } catch (reason) { if (current === epoch) { error.value = reason.message || '地址加载失败'; status.value = 'error' } } }
async function more() { if (loadingMore.value || !hasMore.value) return; const current = epoch; loadingMore.value = true; try { const result = await getAddresses(cursor); if (current === epoch) { items.value = [...new Map([...items.value, ...result.items].map(item => [item.id, item])).values()]; cursor = result.nextCursor; hasMore.value = result.hasMore === true } } catch (reason) { if (current === epoch) operationError.value = reason.message } finally { if (current === epoch) loadingMore.value = false } }
function edit(id) { uni.navigateTo({ url: `/pages/address/edit${id ? `?id=${encodeURIComponent(id)}` : ''}` }) }
function setDefault(address) { if (busy.value || address.isDefault) return; pending.value = { address, action: setDefaultAddress, message: '确定要将该地址设置为默认地址吗？' } }
function remove(address) { if (busy.value) return; pending.value = { address, action: deleteAddress, message: '确定要删除该地址吗？' } }
async function confirmPending() {
  const job = pending.value
  if (!job || busy.value) return
  pending.value = null
  busy.value = true
  operationError.value = ''
  const current = epoch
  try { await job.action(job.address.id, job.address.version); if (current === epoch) await load() }
  catch (reason) { if (current === epoch) operationError.value = reason.message || '操作失败，请刷新后重试' }
  finally { busy.value = false }
}
onShow(load); onUnload(() => { ++epoch })
</script>
<style scoped>
.address-page, .address-frame, .address-body, .address-card, .address-state, .address-dialog { display: flex; flex-direction: column; }
.address-page { min-height: 100vh; background: #272c47; color: #f3f6ff; font-size: clamp(14px, 3.73vw, 16px); }
.address-frame { width: min(750px, 100%); min-height: 100vh; margin: 0 auto; }
.address-state { padding: 2em 1em; text-align: center; color: #b7bdd2; }
.address-state button, .address-more { margin-top: .8em; border: 0; border-radius: 999px; background: #4a516c; color: #fff; }
.address-body { padding: 1em .85em 7em; }
.address-card { margin-bottom: .85em; padding: 1em .9em; border-radius: .85em; background: #343a5b; }
.address-person { font-size: 1em; line-height: 1.7; overflow-wrap: anywhere; }
.default-badge { display: inline-block; margin-right: .35em; padding: 0 .45em; border-radius: 999px; background: #008fff; font-size: .72em; vertical-align: .1em; }
.address-detail { margin-top: .45em; color: #b7c3d9; font-size: .86em; line-height: 1.6; overflow-wrap: anywhere; }
.address-actions { display: flex; align-items: center; gap: .8em; margin-top: .8em; }
.address-actions button { display: flex; align-items: center; gap: .25em; margin: 0; padding: .2em 0; background: none; color: #e9f0ff; font-size: .86em; line-height: 1.5; }
.address-actions .default-action { margin-right: auto; color: #9ca9c2; }
.address-actions .default-action[disabled] { opacity: 1; }
.address-actions .selected { color: #00c7ef; }
.default-radio, .address-action-icon { width: 1.15em; height: 1.15em; flex-shrink: 0; }
.address-error { display: block; margin-top: .6em; color: #ffabbc; font-size: .82em; }
.address-footer { position: fixed; left: 50%; bottom: 0; z-index: 5; width: min(750px, 100%); transform: translateX(-50%); padding: .8em 1.4em calc(.8em + env(safe-area-inset-bottom)); background: #272c47; box-sizing: border-box; }
.address-footer button { width: 100%; height: 2.8em; border: 0; border-radius: 999px; background: linear-gradient(100deg, #003eff, #009cff); color: #fff; font-size: .95em; }
.address-mask { position: fixed; inset: 0; z-index: 30; display: flex; align-items: center; justify-content: center; padding: 1.5em; background: rgba(7, 10, 24, .62); box-sizing: border-box; }
.address-dialog { width: min(18em, 100%); padding: 1.5em 1.1em 1.05em; border-radius: .85em; background: #343a5b; text-align: center; }
.address-dialog > text { display: block; font-size: 1em; line-height: 1.6; }
.dialog-actions { display: flex; gap: .7em; margin-top: 1.2em; }
.dialog-actions button { flex: 1; height: 2.4em; margin: 0; border: 0; border-radius: 999px; background: #4a516c; color: #fff; font-size: .9em; }
.dialog-ok { background: #2f78ff !important; }
</style>
