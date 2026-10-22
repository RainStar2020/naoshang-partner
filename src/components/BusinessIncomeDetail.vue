<template><view class="account-page feature-page"><FeaturePageState :status="status" :error="error" @retry="load"/><template v-if="status==='ready'"><text class="feature-note">{{context.label}}</text><view class="business-record"><view class="business-record-title">{{data.title}}</view><view class="business-row"><text>收益金额</text><text class="business-amount">¥{{money(data.amount)}}</text></view><view class="business-row"><text>实付/基数金额</text><text>¥{{money(data.baseAmount)}}</text></view><view class="business-row"><text>个人提点</text><text>{{percent(data.rateBps)}}</text></view><view class="business-row"><text>受益人</text><text>{{data.beneficiaryName||'—'}}</text></view><view class="business-row"><text>分配状态</text><text>{{data.allocationStatus==='PENDING'?'待分配':data.allocationStatus==='ALLOCATED'?'已分配':'待确认'}}</text></view><view class="business-row"><text>结算状态</text><text>{{settlementLabel(data.settlementStatus)}}</text></view><view v-for="split in data.distribution||[]" :key="split.id||split.label" class="business-row"><text>{{split.label||split.beneficiaryName}}</text><text>¥{{money(split.amount)}}</text></view></view><button v-if="data.allowedActions?.includes('allocate')" class="primary" @click="allocate">{{data.allocationKind==='inspection'?'分配巡查提点':'分配销售提点'}}</button><text v-if="data.allocationStatus==='PENDING'" class="feature-note">待分配收益不能作为已可提现资金。</text></template></view></template>
<script setup>
import {ref,watch} from 'vue'
import {config} from '../config'
import {money,percent} from '../features/exclusive/format'
import {getBusinessContext,getBusinessIncomeDetail} from '../services/business'
import {useAsyncPage} from '../composables/useAsyncPage'
import FeaturePageState from './FeaturePageState.vue'
const props=defineProps({pageQuery:Object}),context=ref(null),isMock=config.useMock
const {data,status,error,load}=useAsyncPage(async()=>{if(!props.pageQuery?.id)throw new Error('缺少收益记录编号');const ctx=await getBusinessContext(null,props.pageQuery.contextId);context.value=ctx;return getBusinessIncomeDetail(ctx.id,props.pageQuery.id)},false)
watch(()=>props.pageQuery,query=>{if(query)load()},{immediate:true})
const settlementLabel=value=>({SETTLED:'已结算',PENDING_ALLOCATION:'待分配',PENDING_SETTLEMENT:'待结算'}[value]||'待确认')
function allocate(){uni.navigateTo({url:`/pages/income/allocation?contextId=${encodeURIComponent(context.value.id)}&entryId=${encodeURIComponent(data.value.id)}`})}
defineExpose({refresh:load})
</script>
<style>@import '../styles/account.css';@import '../styles/exclusive.css';@import '../styles/business.css';</style>
