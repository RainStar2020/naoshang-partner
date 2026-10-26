<template><view class="content-page"><text class="eyebrow">CURATED FOR GROWTH</text><view class="page-title">为成长，认真甄选</view><view class="page-desc">发现适合孩子的每一种可能</view><view class="selection-banner"><text>✧</text><view><view class="card-title">好奇心，是成长的起点</view><view class="page-desc">脑商成长精选 · DEMO</view></view></view><view class="section-title">成长精选 <text class="tag">演示内容</text></view><view v-for="(item,index) in items" :key="item.title" class="list-card" @click="demoNotice(item.title)"><view class="product-cover" :class="{ purple: index === 1 }"><text>{{ index === 0 ? '∞' : '◎' }}</text><view>{{ item.type }}</view></view><view class="card-title">{{ item.title }}</view><view class="page-desc">{{ item.desc }}</view><view class="product-foot"><text>课程信息待完善</text><text>查看详情 →</text></view></view><AppTabBar active="selection" /></view></template>
<script setup>
import { ref } from 'vue'
import AppTabBar from '../../components/AppTabBar.vue'
import { useAppTabBar } from '../../composables/useAppTabBar'
import { onShow } from '@dcloudio/uni-app'
import { getProducts } from '../../services/api'
import { useAuth, demoNotice } from '../../composables/useAuth'
useAuth(); useAppTabBar(); const items = ref([])
onShow(async () => { try { items.value = await getProducts() } catch(e) { uni.showToast({title:e.message || '加载失败',icon:'none'}) } })
</script>

