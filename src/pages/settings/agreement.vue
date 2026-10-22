<template><view class="account-page"><view v-if="loading" class="account-state">正在加载…</view><view v-else-if="error" class="account-state"><text>{{ error }}</text><button class="secondary" @click="load">重试</button></view><view v-else class="account-card agreement-body"><ManagedRichContent v-if="content?.nodes.length" :content="content" /><text v-else class="account-note">内容暂未发布</text></view></view></template>
<script setup>
import { ref } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { getAgreement } from '../../services/profile'
import ManagedRichContent from '../../components/ManagedRichContent.vue'
const loading = ref(true), error = ref(''), content = ref(null)
let type = '', epoch = 0
async function load() { const current = ++epoch; loading.value = true; error.value = ''; try { const result = await getAgreement(type); if(current === epoch) { content.value = result.content; uni.setNavigationBarTitle({ title: result.title }) } } catch(reason) { if(current === epoch) error.value = reason.message || '内容加载失败' } finally { if(current === epoch) loading.value = false } }
onLoad(options => { type = options.type; load() }); onUnload(() => { ++epoch })
</script>
<style>@import '../../styles/account.css';</style>
<style scoped>.agreement-body{padding:30rpx;min-height:200rpx}</style>
