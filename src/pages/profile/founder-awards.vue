<template><view class="account-page feature-page"><view class="report-month"><picker mode="date" fields="month" :value="month" @change="changeMonth"><text>{{month}} 创始奖</text><image src="/static/common/icon-chevron-right.png" mode="aspectFit"/></picker></view><FeaturePageState :status="status" :error="error" @retry="load"/><template v-if="status==='ready'"><view class="award-summary"><text>本月创始奖</text><view class="award-total">¥{{money(data.summary?.amount)}}</view><view class="award-metrics"><view><text>本人身份</text><view>{{data.summary?.identityLabel || '—'}}</view></view><view><text>本月VIP数量</text><view>{{data.summary?.vipCount ?? '—'}}</view></view><view><text>分红比例</text><view>{{percent(data.summary?.rateBps)}}</view></view></view></view><view class="report-table"><view class="table-row table-heading"><text>月份</text><text>VIP数量</text><text>分红比例</text><text>本月创始奖</text></view><view v-for="row in rows" :key="row.id" class="table-row"><text>{{row.month}}</text><text>{{row.vipCount ?? '—'}}</text><text>{{percent(row.rateBps)}}</text><text>¥{{money(row.amount)}}</text></view></view><EmptyState v-if="!rows.length" text="暂无创始奖记录"/><button v-if="hasMore" class="secondary" :disabled="loadingMore" @click="more">{{loadingMore?'加载中…':'加载更多'}}</button><text v-if="moreError" class="account-error">{{moreError}}</text></template></view></template>
<script setup>
import { ref, watch } from 'vue'
import { onUnload } from '@dcloudio/uni-app'
import { config } from '../../config'
import { useAuth } from '../../composables/useAuth'
import { useAsyncPage } from '../../composables/useAsyncPage'
import { getFounderAwards } from '../../services/exclusive'
import { money,percent } from '../../features/exclusive/format'
import FeaturePageState from '../../components/FeaturePageState.vue'
import EmptyState from '../../components/EmptyState.vue'
useAuth()
const isMock=config.useMock, now=new Date(),month=ref(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`), rows=ref([]),hasMore=ref(false),loadingMore=ref(false),moreError=ref('')
let cursor=null,epoch=0
const {data,status,error,load}=useAsyncPage(()=>getFounderAwards(month.value))
watch(data,result=>{if(result){rows.value=result.items;hasMore.value=result.hasMore;cursor=result.nextCursor}})
watch(status,value=>{if(value==='loading'){++epoch;loadingMore.value=false;moreError.value=''}})
function changeMonth(event){month.value=event.detail.value;load()}
async function more(){if(loadingMore.value||!hasMore.value)return;loadingMore.value=true;const current=epoch;try{const result=await getFounderAwards(month.value,cursor);if(current===epoch){rows.value=[...new Map([...rows.value,...result.items].map(item=>[item.id,item])).values()];cursor=result.nextCursor;hasMore.value=result.hasMore}}catch(reason){if(current===epoch)moreError.value=reason.message}finally{if(current===epoch)loadingMore.value=false}}
onUnload(()=>{++epoch})
</script>
<style>@import '../../styles/account.css';@import '../../styles/exclusive.css';</style>
<style scoped>.report-month{margin:-24rpx -24rpx 24rpx;padding:24rpx;background:#414866;text-align:center;font-size:calc(var(--feature-font,14px)*1.07143)}.report-month picker>view{display:flex;justify-content:center;align-items:center;gap:18rpx}.report-month image{width:24rpx;height:24rpx;margin-left:20rpx;vertical-align:middle}.award-summary{background:#343a5b;border-radius:24rpx;padding:38rpx 24rpx;text-align:center;color:#a1aec8;font-size:calc(var(--feature-font,14px)*0.96429)}.award-total{font-size:calc(var(--feature-font,14px)*1.42857);font-weight:600;color:#d0e9ff;margin:12rpx 0 32rpx}.award-metrics{display:flex;justify-content:space-around;gap:10rpx;background:#454c6d;border-radius:14rpx;padding:24rpx 10rpx;font-size:calc(var(--feature-font,14px)*0.92857)}.award-metrics>view{flex:1;min-width:0}.award-metrics>view>view{font-size:calc(var(--feature-font,14px)*1.00000);color:#d0e9ff;font-weight:600;margin-top:12rpx;overflow-wrap:anywhere}.report-table{margin-top:28rpx}.table-row{display:grid;grid-template-columns:1.25fr 1fr 1fr 1.25fr;padding:24rpx 10rpx;text-align:center;background:#343a5b;font-size:calc(var(--feature-font,14px)*0.92857);gap:8rpx}.table-row>text{overflow-wrap:anywhere}.table-row:nth-child(even){background:#454c6d}.table-row.table-heading{background:#062750;border:2rpx solid #009aff;color:#d0e9ff}</style>
