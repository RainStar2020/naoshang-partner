<template><view class="wholesale-ui wh-body"><FeaturePageState :status="status" :error="error" @retry="load"/><template v-if="status==='ready'"><EmptyState v-if="!items.length" text="暂无提现记录"/><view v-for="item in items" :key="item.id" class="wh-card withdrawal-card"><view class="wh-row"><view><view class="wh-blue withdrawal-amount">¥{{money(item.amount)}}</view><text>{{item.accountType==='COMPANY'?'公司账户':'个人账户'}}/{{item.accountName || '—'}}</text></view><text class="wh-badge-status" :class="`status-${item.status}`">{{statusLabel(item.status)}}</text></view><view class="wh-datum"><view><text class="wh-muted">申请时间</text><text>{{businessDateLabel(item.createdAt)}}</text></view><view><text class="wh-muted">银行信息</text><text>{{item.bankName || '—'}}/{{item.maskedBankNumber || '—'}}</text></view><view v-if="item.reviewedAt"><text class="wh-muted">审核时间</text><text>{{businessDateLabel(item.reviewedAt)}}</text></view><view v-if="canPreview(item.voucherUrl)"><text class="wh-muted">打款凭证</text><button class="wh-link" @click="preview(item.voucherUrl)">立即查看</button></view></view><text v-if="item.rejectionReason" class="wh-error">{{item.rejectionReason}}</text></view><button v-if="hasMore" class="wh-secondary wh-pill" :disabled="loadingMore" @click="more">{{loadingMore?'加载中…':'加载更多'}}</button><text v-if="moreError" class="wh-error">{{moreError}}</text></template></view></template>
<script setup>
import {ref,watch,onUnmounted} from 'vue'
import {isMediaUrl} from '../features/content/rich-content'
import {money} from '../features/exclusive/format'
import {businessDateLabel} from '../features/business/format'
import {getBusinessContext,getBusinessWithdrawals} from '../services/business'
import {useAsyncPage} from '../composables/useAsyncPage'
import FeaturePageState from './FeaturePageState.vue'
import EmptyState from './EmptyState.vue'
const props=defineProps({pageQuery:Object}),context=ref(null),items=ref([]),hasMore=ref(false),loadingMore=ref(false),moreError=ref('');let cursor=null,epoch=0
const {data,status,error,load}=useAsyncPage(async()=>{const ctx=await getBusinessContext(null,props.pageQuery?.contextId);context.value=ctx;return getBusinessWithdrawals(ctx.id)},false)
watch(()=>props.pageQuery,query=>{if(query)load()},{immediate:true});watch(status,value=>{if(value==='loading'){++epoch;loadingMore.value=false;moreError.value=''}});watch(data,result=>{if(result){items.value=result.items;hasMore.value=result.hasMore;cursor=result.nextCursor}})
const statusLabel=value=>({PENDING_REVIEW:'待审核',PROCESSING:'处理中',SUCCEEDED:'已完成',REJECTED:'未通过'}[value]||'状态待确认')
function canPreview(url){return isMediaUrl(url)||(typeof url==='string'&&url.startsWith('/static/'))}
function preview(url){uni.previewImage({urls:[url]})}
async function more(){if(loadingMore.value||!hasMore.value)return;const current=epoch;loadingMore.value=true;try{const result=await getBusinessWithdrawals(context.value.id,cursor);if(current===epoch){items.value=[...new Map([...items.value,...result.items].map(item=>[item.id,item])).values()];cursor=result.nextCursor;hasMore.value=result.hasMore}}catch(reason){if(current===epoch)moreError.value=reason.message}finally{if(current===epoch)loadingMore.value=false}}
onUnmounted(()=>{++epoch});defineExpose({refresh:load})
</script>
<style>@import '../styles/account.css';@import '../styles/exclusive.css';@import '../styles/business.css';</style>
<style>@import '../styles/wholesale.css';</style>
<style scoped>.withdrawal-card{position:relative;padding:1em .8em;font-size:.85em}.withdrawal-card .wh-badge-status{border-radius:2em;align-self:flex-start}.withdrawal-amount{font-size:1.35em;line-height:1.5}.withdrawal-card .wh-datum{margin-top:1.4em;font-size:.95em}.status-PENDING_REVIEW{color:#b7c7e4;background:#3c4668}.status-SUCCEEDED{color:#97ca89;background:#24382c}.status-REJECTED{color:#e7a0b4;background:#4a3040}</style>
