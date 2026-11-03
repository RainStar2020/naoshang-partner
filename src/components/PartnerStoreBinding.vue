<template>
  <view class="partner-store account-page">
    <FeaturePageState :status="status" :error="error" @retry="load" />
    <template v-if="status === 'ready' && data">
      <view v-if="data.boundStore" class="store-block">
        <text class="store-heading">当前已绑定门店</text>
        <view class="store-card static">
          <image
            class="store-cover"
            :class="{ placeholder: !data.boundStore.imageUrl }"
            :src="coverOf(data.boundStore)"
            :mode="data.boundStore.imageUrl ? 'aspectFill' : 'aspectFit'"
          />
          <view class="store-copy">
            <view class="store-title-row">
              <text class="store-name">{{ data.boundStore.name }}</text>
              <text v-if="data.boundStore.storeNo" class="store-no">{{ data.boundStore.storeNo }}</text>
            </view>
            <text v-if="managerLabel(data.boundStore)" class="store-meta">店长信息：{{ managerLabel(data.boundStore) }}</text>
            <text class="store-meta">{{ data.boundStore.address || '' }}</text>
          </view>
        </view>
      </view>

      <view class="store-list-wrap">
        <text class="store-heading">{{ data.boundStore ? '更换绑定门店' : '选择服务门店' }}</text>
        <EmptyState v-if="!data.headquarters && !data.stores.length" text="当前暂无可绑定门店" />

        <button
          v-if="data.headquarters"
          class="store-card"
          :disabled="busy || !canBind"
          @click="confirm(data.headquarters)"
        >
          <view class="store-copy hq-copy">
            <view class="store-title-row">
              <text class="store-name">{{ data.headquarters.name || '总部服务' }}</text>
            </view>
            <text class="store-meta">{{ data.headquarters.note || '当前门店由总部统一服务' }}</text>
          </view>
          <image class="store-chevron" src="/static/common/icon-chevron-right.png" mode="aspectFit" />
        </button>

        <button
          v-for="item in data.stores"
          :key="item.id"
          class="store-card"
          :class="{ current: data.boundStore?.id === item.id }"
          :disabled="busy || !canBind"
          @click="confirm(item)"
        >
          <image
            class="store-cover"
            :class="{ placeholder: !item.imageUrl }"
            :src="coverOf(item)"
            :mode="item.imageUrl ? 'aspectFill' : 'aspectFit'"
          />
          <view class="store-copy">
            <view class="store-title-row">
              <text class="store-name">{{ item.name }}</text>
              <text v-if="item.storeNo" class="store-no">{{ item.storeNo }}</text>
            </view>
            <text v-if="managerLabel(item)" class="store-meta">店长信息：{{ managerLabel(item) }}</text>
            <text class="store-meta">{{ item.address || '' }}</text>
          </view>
          <image class="store-chevron" src="/static/common/icon-chevron-right.png" mode="aspectFit" />
        </button>
      </view>

      <view v-if="selected" class="store-mask" @click="!busy && (selected = null)">
        <view class="store-dialog" @click.stop>
          <text>确定要绑定该门店吗？</text>
          <text>{{ selected.name }}</text>
          <view>
            <button :disabled="busy" @click="selected = null">取消</button>
            <button :disabled="busy" @click="submit">{{ busy ? '提交中…' : '确定' }}</button>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>
<script setup>
import { computed, ref } from 'vue'
import { useAsyncPage } from '../composables/useAsyncPage'
import { getPartnerStoreBindingOptions, bindPartnerStore } from '../services/partner-wallet'
import FeaturePageState from './FeaturePageState.vue'
import EmptyState from './EmptyState.vue'

const fallbackCover = '/static/common/icon-store.png'
const { data, status, error, load } = useAsyncPage(getPartnerStoreBindingOptions)
const selected = ref(null)
const busy = ref(false)
const canBind = computed(() => data.value?.allowedActions?.includes('bind'))

function coverOf(store) {
  return store?.imageUrl || fallbackCover
}

function managerLabel(store) {
  const manager = store?.manager
  if (!manager) return ''
  if (typeof manager === 'string') return manager
  const name = manager.name || ''
  const phone = manager.phone || ''
  if (!name && !phone) return ''
  return phone ? `${name} / ${phone}` : name
}

function confirm(store) {
  if (!canBind.value || busy.value) return
  selected.value = store
}

async function submit() {
  if (!selected.value || busy.value) return
  busy.value = true
  try {
    await bindPartnerStore(
      selected.value.id,
      `partner-store-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    )
    selected.value = null
    uni.showToast({ title: '门店绑定成功', icon: 'success' })
    await load()
  } catch (reason) {
    uni.showToast({ title: reason.message || '绑定失败，请稍后重试', icon: 'none' })
  } finally {
    busy.value = false
  }
}

defineExpose({ refresh: load })
</script>
<style scoped>
.partner-store {
  padding: 0.9em;
  color: #fff;
}
.store-block,
.store-list-wrap {
  margin-bottom: 0.85em;
}
.store-heading {
  display: block;
  margin-bottom: 0.75em;
  font-weight: 700;
  font-size: 0.98em;
}
.store-card {
  display: flex;
  align-items: center;
  gap: 0.65em;
  width: 100%;
  margin: 0.7em 0 0;
  padding: 0.85em;
  box-sizing: border-box;
  border-radius: 0.75em;
  background: #353a59;
  color: #fff;
  text-align: left;
  font-size: inherit;
  line-height: inherit;
}
.store-card::after {
  border: 0;
}
.store-card.static {
  margin-top: 0;
}
.store-card[disabled] {
  opacity: 0.55;
}
.store-card.current .store-name {
  color: #57adff;
}
.store-cover {
  width: 4.4em;
  height: 4.4em;
  border-radius: 0.45em;
  background: #444b68;
  flex: none;
  object-fit: cover;
}
.store-cover.placeholder {
  padding: 0.85em;
  box-sizing: border-box;
}
.store-copy {
  min-width: 0;
  flex: 1;
}
.hq-copy {
  padding: 0.15em 0;
}
.store-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35em;
}
.store-name {
  color: #fff;
  font-size: 0.96em;
  font-weight: 600;
  line-height: 1.45;
  overflow-wrap: anywhere;
}
.store-no {
  flex: none;
  max-width: 7em;
  padding: 0.12em 0.7em;
  border-radius: 1em;
  background: linear-gradient(90deg, #00b8ee, #0c8dff);
  color: #fff;
  font-size: 0.62em;
  font-weight: 700;
  line-height: 1.55;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.store-meta {
  display: block;
  margin-top: 0.2em;
  color: #aebbd2;
  font-size: 0.78em;
  line-height: 1.55;
  overflow-wrap: anywhere;
}
.store-chevron {
  width: 1em;
  height: 1em;
  flex: none;
}
.store-mask {
  position: fixed;
  z-index: 200;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5em;
  background: rgba(0, 0, 0, 0.5);
}
.store-dialog {
  width: 100%;
  max-width: 19em;
  padding: 1.4em;
  border-radius: 0.8em;
  background: #2a3150;
}
.store-dialog > text {
  display: block;
  text-align: center;
}
.store-dialog > text + text {
  margin-top: 0.8em;
  color: #aebbd2;
  font-size: 0.88em;
}
.store-dialog > view {
  display: flex;
  gap: 0.6em;
  margin-top: 1.2em;
}
.store-dialog button {
  flex: 1;
  margin: 0;
  background: #454c6b;
  color: #fff;
}
.store-dialog button::after {
  border: 0;
}
.store-dialog button:last-child {
  background: #2f7bff;
}
</style>
