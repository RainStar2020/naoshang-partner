<template>
  <picker mode="multiSelector" :range="ranges" :value="indices" @columnchange="columnChange" @change="confirm" @cancel="restoreSelection">
    <view class="region-input" :class="{ plain }"><image v-if="!plain" class="region-icon" src="/static/common/icon-location.png" mode="aspectFit" /><text :class="{ placeholder: !displayLabel }">{{ displayLabel || '请选择所在地区' }}</text><image class="region-chevron" src="/static/common/icon-chevron-right.png" mode="aspectFit" /></view>
  </picker>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import areas from 'china-area-data'
import { resolveRegionNames } from '../features/region'
const props = defineProps({
  label: { type: String, default: '' },
  codes: { type: Array, default: () => [] },
  plain: Boolean,
  // 1 = province; 2 = province/city; 3 = province/city/district
  levels: { type: Number, default: 3 },
  // Prepend an "全部" row that clears the selection
  allowAll: Boolean,
})
const emit = defineEmits(['change'])
const ALL = { code: '', name: '全部' }
const depth = computed(() => {
  const levels = Number(props.levels)
  if (levels === 1) return 1
  if (levels === 2) return 2
  return 3
})
const indices = ref([0, 0, 0])
const entries = code => Object.entries(areas[code] || {}).map(([code, name]) => ({ code, name }))
const provinces = entries('86')
const provinceOptions = computed(() => (props.allowAll ? [ALL, ...provinces] : provinces))
const cities = computed(() => {
  const province = provinceOptions.value[indices.value[0]]
  if (!province?.code) return props.allowAll ? [ALL] : []
  return entries(province.code)
})
const districts = computed(() => {
  const city = cities.value[indices.value[1]]
  if (!city?.code) return props.allowAll ? [ALL] : []
  return entries(city.code)
})
const ranges = computed(() => {
  const columns = [provinceOptions.value]
  if (depth.value > 1) columns.push(cities.value)
  if (depth.value > 2) columns.push(districts.value)
  return columns.map(list => list.map(item => item.name))
})
const displayLabel = computed(() => {
  if (props.label) return props.label
  if (props.allowAll && !props.codes?.length) return '全部'
  const names = resolveRegionNames(props.codes).slice(0, depth.value)
  return names.length ? names.join(' · ') : ''
})
function restoreSelection() {
  if (props.allowAll && !props.codes?.length) {
    indices.value = Array.from({ length: depth.value }, () => 0)
    return
  }
  const offset = props.allowAll ? 1 : 0
  const firstRaw = provinces.findIndex(item => item.code === props.codes[0])
  const first = firstRaw < 0 ? 0 : firstRaw + offset
  if (depth.value === 1) {
    indices.value = [first]
    return
  }
  const province = provinceOptions.value[first]
  const cityList = province?.code ? entries(province.code) : []
  const second = Math.max(0, cityList.findIndex(item => item.code === props.codes[1]))
  if (depth.value === 2) {
    indices.value = [first, second]
    return
  }
  const city = cityList[second]
  const districtList = city?.code ? entries(city.code) : []
  const third = Math.max(0, districtList.findIndex(item => item.code === props.codes[2]))
  indices.value = [first, second, third]
}
watch(() => props.codes, restoreSelection, { immediate: true, deep: true })
watch([depth, () => props.allowAll], restoreSelection)
function columnChange({ detail }) {
  const next = [...indices.value]; next[detail.column] = detail.value
  for (let i = detail.column + 1; i < depth.value; i++) next[i] = 0
  indices.value = next.slice(0, depth.value)
}
function confirm({ detail }) {
  indices.value = detail.value.slice(0, depth.value)
  const selected = [provinceOptions.value[indices.value[0]]]
  if (depth.value > 1) selected.push(cities.value[indices.value[1]])
  if (depth.value > 2) selected.push(districts.value[indices.value[2]])
  if (props.allowAll && selected.some(item => !item?.code)) {
    emit('change', { names: [], codes: [] })
    return
  }
  if (selected.every(Boolean)) emit('change', { names: selected.map(item => item.name), codes: selected.map(item => item.code) })
}
</script>
<style scoped>
.region-input { height: var(--auth-input-height, 104rpx); border-radius: 32rpx; padding: 0 24rpx; display: flex; align-items: center; gap: 16rpx; font-size: 30rpx; background: linear-gradient(90deg, rgba(176, 196, 236, .24) 0%, rgba(176, 196, 236, .12) 42%, rgba(176, 196, 236, .04) 72%, rgba(176, 196, 236, 0) 100%); }
.region-icon { width: 48rpx; height: 48rpx; flex-shrink: 0; }
.region-input>text:nth-child(2) { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.placeholder { color: #8291b9; }
.region-arrow { color: #99b1d5; }
.region-chevron{width:26rpx;height:26rpx;flex-shrink:0}.region-input.plain{padding:0;background:none;border-radius:0}.region-input.plain>text{flex:1;text-align:right}
</style>
