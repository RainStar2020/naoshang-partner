<template>
  <view class="partner-store account-page">
    <FeaturePageState :status="status" :error="error" @retry="load" />
    <template v-if="status === 'ready' && data">
      <template v-if="!targetAccountId">
        <view class="store-panel"><text class="store-heading">我的门店</text><view class="store-card static"><image class="store-cover" :class="{ photo: !!data.imageUrl }" :src="data.imageUrl || fallbackCover" :mode="data.imageUrl ? 'aspectFill' : 'aspectFit'" /><view class="store-copy"><text class="store-name">{{ data.label }}</text><text v-if="data.storeNo" class="store-meta">门店编号：{{ data.storeNo }}</text><text v-if="data.address" class="store-meta">{{ data.address }}</text><text v-if="data.ownerName" class="store-meta">服务负责人：{{ data.ownerName }}</text><text v-if="data.boundAt" class="store-meta">绑定时间：{{ dateLabel(data.boundAt) }}</text></view></view></view>
        <view class="notice">门店由你的上级或总部统一绑定。如需更换门店，请联系上级或总部处理。</view>
      </template>
      <template v-else>
        <view class="store-panel"><text class="store-heading">为下级绑定门店</text><view class="member-card"><text>{{ data.target.name }}</text><text v-if="data.target.phone">{{ data.target.phone }}</text><text v-if="data.binding.bound" class="store-meta">当前绑定：{{ data.binding.label }}</text><text v-else class="store-meta">当前未绑定门店</text></view></view>
        <text class="store-heading">选择服务门店</text><EmptyState v-if="!data.stores.length" text="当前暂无可绑定门店" />
        <button v-for="item in data.stores" :key="item.id" class="store-card" :class="{ selected: selectedStoreId === item.id }" :disabled="busy || !data.canBind" @click="selectedStoreId = item.id"><image class="store-cover" :class="{ photo: !!item.imageUrl }" :src="item.imageUrl || fallbackCover" :mode="item.imageUrl ? 'aspectFill' : 'aspectFit'" /><view class="store-copy"><view class="store-title-row"><text class="store-name">{{ item.name }}</text><text v-if="item.storeNo" class="store-no">{{ item.storeNo }}</text></view><text v-if="managerLabel(item)" class="store-meta">店长信息：{{ managerLabel(item) }}</text><text v-if="item.address" class="store-meta">{{ item.address }}</text></view></button>
        <view v-if="!data.canBind" class="notice">{{ data.reason || (data.operatorBound ? '你无权为该用户绑定门店' : '你本人尚未绑定门店，请先联系上级处理') }}</view>
        <template v-else><textarea v-model="reason" class="reason" maxlength="100" placeholder="绑定原因（选填）" :disabled="busy" /><button class="submit" :disabled="busy || !selectedStoreId" @click="submit">{{ busy ? '提交中…' : '确认绑定' }}</button></template>
      </template>
    </template>
  </view>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import { useAsyncPage } from '../composables/useAsyncPage'
import { bindDownlineStore, getCurrentStoreBinding, getDownlineStoreBindingOptions, storeBindingErrorMessage } from '../services/store-binding'
import FeaturePageState from './FeaturePageState.vue'
import EmptyState from './EmptyState.vue'

const props = defineProps({ pageQuery: { type: Object, default: null } })
const fallbackCover = '/static/common/icon-store.png'
const targetAccountId = computed(() => String(props.pageQuery?.targetAccountId || '').trim())
const selectedStoreId = ref(''), reason = ref(''), busy = ref(false)
const { data, status, error, load } = useAsyncPage(async () => {
  const value = targetAccountId.value ? await getDownlineStoreBindingOptions(targetAccountId.value) : await getCurrentStoreBinding()
  selectedStoreId.value = value.stores?.some(item => item.id === value.binding?.storeId) ? value.binding.storeId : ''
  reason.value = ''
  return value
}, false)
watch(targetAccountId, () => load(), { immediate: true })

function managerLabel(store) { return [store?.manager?.name, store?.manager?.phone].filter(Boolean).join(' / ') }
function dateLabel(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
async function submit() {
  if (busy.value || !selectedStoreId.value || !data.value?.canBind) return
  busy.value = true
  try {
    await bindDownlineStore({ targetAccountId: targetAccountId.value, storeId: selectedStoreId.value, reason: reason.value })
    uni.showToast({ title: '门店绑定成功', icon: 'success' })
    if (getCurrentPages().length > 1) uni.navigateBack()
    else uni.redirectTo({ url: '/pages/partner/team' })
  }
  catch (cause) { uni.showToast({ title: storeBindingErrorMessage(cause), icon: 'none' }) }
  finally { busy.value = false }
}
defineExpose({ refresh: load })
</script>
<style scoped>
.partner-store{padding:.9em;color:#fff}.store-panel{margin-bottom:1em}.store-heading{display:block;margin:0 0 .7em;font-size:.98em;font-weight:700}.store-card,.member-card{display:flex;align-items:center;gap:.65em;width:100%;margin:.65em 0 0;padding:.85em;box-sizing:border-box;border:0;border-radius:.75em;background:#353a59;color:#fff;text-align:left;font-size:inherit;line-height:inherit}.store-card::after,.submit::after{border:0}.store-card[disabled]{opacity:.55}.store-card.selected{box-shadow:inset 0 0 0 1px #4aa6ff;background:#394568}.store-cover{width:4.35em;height:4.35em;flex:none;border-radius:.45em;background:#444b68;padding:.75em;box-sizing:border-box}.store-cover.photo{padding:0;object-fit:cover}.store-copy{min-width:0;flex:1}.store-title-row{display:flex;align-items:center;flex-wrap:wrap;gap:.35em}.store-name{font-weight:600;line-height:1.45;overflow-wrap:anywhere}.store-no{padding:.12em .65em;border-radius:1em;background:#167df4;font-size:.65em}.store-meta{display:block;margin-top:.2em;color:#aebbd2;font-size:.78em;line-height:1.55;overflow-wrap:anywhere}.member-card{display:block}.member-card>text{display:block}.member-card>text+text{margin-top:.25em}.notice{margin:1em 0;padding:.85em;border-radius:.65em;background:#243d61;color:#9fcaff;font-size:.86em;line-height:1.6}.reason{width:100%;height:4.8em;margin:1em 0;padding:.7em;box-sizing:border-box;border-radius:.65em;background:#353a59;color:#fff;font-size:.9em}.submit{background:linear-gradient(90deg,#0ab4f0,#2868ff);color:#fff;border-radius:2em}
</style>
