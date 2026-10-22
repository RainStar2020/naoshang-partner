<template>
  <picker mode="multiSelector" :range="ranges" :value="indices" @columnchange="columnChange" @change="confirm" @cancel="restoreSelection">
    <view class="region-input" :class="{ plain }"><image v-if="!plain" class="region-icon" src="/static/common/icon-location.png" mode="aspectFit" /><text :class="{ placeholder: !label }">{{ label || '请选择所在地区' }}</text><image class="region-chevron" src="/static/common/icon-chevron-right.png" mode="aspectFit" /></view>
  </picker>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import areas from 'china-area-data'
const props = defineProps({ label: { type: String, default: '' }, codes: { type: Array, default: () => [] }, plain: Boolean })
const emit = defineEmits(['change'])
const indices = ref([0, 0, 0])
const entries = code => Object.entries(areas[code] || {}).map(([code, name]) => ({ code, name }))
const provinces = entries('86')
const cities = computed(() => entries(provinces[indices.value[0]]?.code))
const districts = computed(() => entries(cities.value[indices.value[1]]?.code))
const ranges = computed(() => [provinces, cities.value, districts.value].map(list => list.map(item => item.name)))
function restoreSelection() {
  const first = Math.max(0, provinces.findIndex(item => item.code === props.codes[0]))
  const cityList = entries(provinces[first]?.code), second = Math.max(0, cityList.findIndex(item => item.code === props.codes[1]))
  const districtList = entries(cityList[second]?.code), third = Math.max(0, districtList.findIndex(item => item.code === props.codes[2]))
  indices.value = [first, second, third]
}
watch(() => props.codes, restoreSelection, { immediate: true, deep: true })
function columnChange({ detail }) {
  const next = [...indices.value]; next[detail.column] = detail.value
  for (let i = detail.column + 1; i < 3; i++) next[i] = 0
  indices.value = next
}
function confirm({ detail }) {
  indices.value = detail.value
  const selected = [provinces[indices.value[0]], cities.value[indices.value[1]], districts.value[indices.value[2]]]
  if (selected.every(Boolean)) emit('change', { names: selected.map(item => item.name), codes: selected.map(item => item.code) })
}
</script>
<style scoped>
.region-input { height: var(--auth-input-height, 104rpx); border-radius: 26rpx; padding: 0 24rpx; display: flex; align-items: center; gap: 16rpx; font-size: 28rpx; background: linear-gradient(90deg, #aabbe22e, #aabbe21f 45%, #aabbe200); }
.region-icon { width: 48rpx; height: 48rpx; flex-shrink: 0; }
.region-input>text:nth-child(2) { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.placeholder { color: #8291b9; }
.region-arrow { color: #99b1d5; }
.region-chevron{width:26rpx;height:26rpx;flex-shrink:0}.region-input.plain{padding:0;background:none;border-radius:0}.region-input.plain>text{flex:1;text-align:right}
</style>
