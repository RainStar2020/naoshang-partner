<template><view class="account-page feature-page"><FeaturePageState :status="status" :error="error" @retry="load"/><template v-if="status==='ready'"><text class="feature-note">{{context.label}}</text><EmptyState v-if="!items.length" text="暂无提现记录"/><view v-for="item in items" :key="item.id" class="business-record"><view class="business-row"><text class="business-record-title">{{item.title||'提现申请'}}</text><text>{{statusLabel(item.status)}}</text></view><view class="business-row"><text>申请金额</text><text>¥{{money(item.amount)}}</text></view><view class="business-row"><text>手续费</text><text>¥{{money(item.fee)}}</text></view><view class="business-row"><text>预计到账</text><text>¥{{money(item.netAmount)}}</text></view><text class="business-caption">{{businessDateLabel(item.createdAt)}}</text><text v-if="item.rejectionReason" class="business-operation-error">拒绝原因：{{item.rejectionReason}}</text></view><button v-if="hasMore" class="secondary" :disabled="loadingMore" @click="more">{{loadingMore?'加载中…':'加载更多'}}</button><text v-if="moreError" class="business-operation-error">{{moreError}}</text></template></view></template>
<script setup>
import {ref,watch,onUnmounted} from 'vue'
import {config} from '../config'
import {money} from '../features/exclusive/format'
import {businessDateLabel} from '../features/business/format'
import {getBusinessContext,getBusinessWithdrawals} from '../services/business'
import {useAsyncPage} from '../composables/useAsyncPage'
import FeaturePageState from './FeaturePageState.vue'
import EmptyState from './EmptyState.vue'
const props=defineProps({pageQuery:Object}),context=ref(null),items=ref([]),hasMore=ref(false),loadingMore=ref(false),moreError=ref(''),isMock=config.useMock;let cursor=null,epoch=0
const {data,status,error,load}=useAsyncPage(async()=>{const ctx=await getBusinessContext(null,props.pageQuery?.contextId);context.value=ctx;return getBusinessWithdrawals(ctx.id)},false)
watch(()=>props.pageQuery,query=>{if(query)load()},{immediate:true});watch(status,value=>{if(value==='loading'){++epoch;loadingMore.value=false;moreError.value=''}});watch(data,result=>{if(result){items.value=result.items;hasMore.value=result.hasMore;cursor=result.nextCursor}})
const statusLabel=value=>({PENDING_REVIEW:'待审核',PROCESSING:'处理中',SUCCEEDED:'已打款',REJECTED:'已拒绝'}[value]||'状态待确认')
async function more(){if(loadingMore.value||!hasMore.value)return;const current=epoch;loadingMore.value=true;try{const result=await getBusinessWithdrawals(context.value.id,cursor);if(current===epoch){items.value=[...new Map([...items.value,...result.items].map(item=>[item.id,item])).values()];cursor=result.nextCursor;hasMore.value=result.hasMore}}catch(reason){if(current===epoch)moreError.value=reason.message}finally{if(current===epoch)loadingMore.value=false}}
onUnmounted(()=>{++epoch});defineExpose({refresh:load})
</script>
<style>@import '../styles/account.css';@import '../styles/exclusive.css';@import '../styles/business.css';</style>
