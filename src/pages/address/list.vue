<template><view class="account-page"><view v-if="status === 'loading'" class="account-state">正在加载地址…</view><view v-else-if="status === 'error'" class="account-state"><text>{{ error }}</text><button class="secondary" @click="load">重试</button></view><template v-else><EmptyState v-if="!items.length" text="暂无收货地址" /><view v-for="address in items" :key="address.id" class="address-card"><view class="address-person"><text v-if="address.isDefault" class="default-badge">默认</text>{{ address.recipient }} {{ address.phone }}</view><view class="address-detail">{{ address.regionNames?.join('') }} {{ address.detail }}</view><view class="address-actions"><button :disabled="busy || address.isDefault" class="default-action" :class="{ selected: address.isDefault }" @click="setDefault(address)"><image class="default-radio" :src="address.isDefault ? '/static/common/icon-radio-checked.png' : '/static/common/icon-radio-unchecked.png'" mode="aspectFit" /><text>默认地址</text></button><button :disabled="busy" @click="edit(address.id)"><image class="address-action-icon" src="/static/common/icon-edit.png" mode="aspectFit"/>编辑</button><button :disabled="busy" @click="remove(address)"><image class="address-action-icon" src="/static/common/icon-delete.png" mode="aspectFit"/>删除</button></view></view><button v-if="hasMore" class="secondary" :disabled="loadingMore" @click="more">{{ loadingMore ? '加载中…' : '加载更多' }}</button><text v-if="operationError" class="account-error">{{ operationError }}</text></template><view class="account-bottom"><button class="primary" :disabled="busy" @click="edit('')">添加地址</button></view></view></template>
<script setup>
import { ref } from 'vue'
import { onShow, onUnload } from '@dcloudio/uni-app'
import { useAuth } from '../../composables/useAuth'
import { getAddresses, setDefaultAddress, deleteAddress } from '../../services/profile'
import EmptyState from '../../components/EmptyState.vue'
useAuth()
const status = ref('loading'), items = ref([]), error = ref(''), operationError = ref(''), busy = ref(false), hasMore = ref(false), loadingMore = ref(false)
let epoch = 0, cursor = null
async function load() { const current = ++epoch; status.value = 'loading'; items.value = []; try { const result = await getAddresses(); if(current === epoch) { items.value = result.items; cursor = result.nextCursor; hasMore.value = result.hasMore === true; status.value = 'ready' } } catch(reason) { if(current === epoch) { error.value = reason.message || '地址加载失败'; status.value = 'error' } } }
async function more() { if(loadingMore.value || !hasMore.value) return; const current = epoch; loadingMore.value = true; try { const result = await getAddresses(cursor); if(current === epoch) { items.value = [...new Map([...items.value,...result.items].map(item=>[item.id,item])).values()]; cursor = result.nextCursor; hasMore.value = result.hasMore === true } } catch(reason) { if(current === epoch) operationError.value = reason.message } finally { if(current === epoch) loadingMore.value = false } }
function edit(id) { uni.navigateTo({ url: `/pages/address/edit${id ? `?id=${encodeURIComponent(id)}` : ''}` }) }
const confirm = content => new Promise(resolve => uni.showModal({ title: '确认操作', content, success: result => resolve(result.confirm), fail: () => resolve(false) }))
async function mutate(address, action, message) {
  if(busy.value) return
  busy.value = true; operationError.value = ''; const current = epoch
  try { if(!await confirm(message) || current !== epoch) return; await action(address.id,address.version); if(current === epoch) await load() }
  catch(reason) { if(current === epoch) operationError.value = reason.message || '操作失败，请刷新后重试' }
  finally { busy.value = false }
}
function setDefault(address) { mutate(address,setDefaultAddress,'确定要将该地址设置为默认地址吗？') }
function remove(address) { mutate(address,deleteAddress,'确定要删除该地址吗？') }
onShow(load); onUnload(()=>{++epoch})
</script>
<style>@import '../../styles/account.css';</style>
<style scoped>.address-card{padding:28rpx 24rpx;background:#343a5b;border-radius:24rpx;margin-bottom:24rpx}.address-person{font-size:30rpx;line-height:1.8;overflow-wrap:anywhere}.default-badge{display:inline-block;background:#008fff;border-radius:28rpx;font-size:22rpx;padding:0 12rpx;margin-right:10rpx}.address-detail{font-size:26rpx;color:#b7c3d9;line-height:1.7;margin-top:16rpx;overflow-wrap:anywhere}.address-actions{display:flex;align-items:center;gap:28rpx;margin-top:24rpx}.address-actions button{padding:6rpx 0;margin:0;background:none;color:#e9f0ff;font-size:26rpx;line-height:1.6}.address-actions .default-action{display:flex;gap:8rpx;align-items:center;margin-right:auto;color:#9ca9c2}.address-actions .default-action[disabled]{opacity:1}.address-actions .selected{color:#00c7ef}.default-radio{height:36rpx;width:36rpx;flex-shrink:0}.address-actions button{display:flex;align-items:center;gap:8rpx}.address-action-icon{height:38rpx;width:38rpx;flex-shrink:0}</style>
