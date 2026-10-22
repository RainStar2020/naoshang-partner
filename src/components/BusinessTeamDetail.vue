<template><view class="account-page feature-page"><FeaturePageState :status="status" :error="error" @retry="load"/><template v-if="status==='ready'"><text class="feature-note">{{context.label}}</text><view class="business-record"><view class="business-record-title">{{data.node.name}}</view><text class="business-caption">{{data.node.scopeLabel}}</text><view class="business-row"><text>门店数量</text><text>{{data.node.storeCount ?? '—'}}</text></view><view class="business-row"><text>合店老板</text><text>{{data.node.ownerCount ?? '—'}}</text></view><view class="business-metrics"><view v-for="metric in data.node.performance||[]" :key="metric.label" class="business-metric"><text>{{metric.label}}</text><view>{{metric.kind==='money'?`¥${money(metric.value)}`:metric.value}}</view></view></view></view><view class="business-record-title">下级团队</view><view v-for="child in data.children.items" :key="child.id" class="business-record"><view class="business-record-title">{{child.name}}</view><text class="business-caption">{{child.scopeLabel}}</text><button class="business-link" @click="open(child.id)">查看详情</button></view><EmptyState v-if="!data.children.items.length" text="当前节点暂无下级团队"/><button v-if="data.children.hasMore" class="secondary" :disabled="loadingMore" @click="more">{{loadingMore?'加载中…':'加载更多'}}</button><text v-if="moreError" class="business-operation-error">{{moreError}}</text></template></view></template>
<script setup>
import {ref,watch,onUnmounted} from 'vue'
import {config} from '../config'
import {money} from '../features/exclusive/format'
import {getBusinessContext,getBusinessTeamNode,getBusinessReport} from '../services/business'
import {useAsyncPage} from '../composables/useAsyncPage'
import FeaturePageState from './FeaturePageState.vue'
import EmptyState from './EmptyState.vue'
const props=defineProps({pageQuery:Object}),context=ref(null),isMock=config.useMock,loadingMore=ref(false),moreError=ref('');let active=true
const {data,status,error,load}=useAsyncPage(async()=>{if(!props.pageQuery?.nodeId)throw new Error('缺少团队节点编号');const ctx=await getBusinessContext('agency',props.pageQuery.contextId);context.value=ctx;const node=await getBusinessTeamNode(ctx.id,props.pageQuery.nodeId);const children=await getBusinessReport('agency','team',ctx.id,{parentNodeId:node.id});return {node,children}},false)
watch(()=>props.pageQuery,query=>{if(query)load()},{immediate:true})
function open(id){uni.navigateTo({url:`/pages/agency/team-detail?contextId=${encodeURIComponent(context.value.id)}&nodeId=${encodeURIComponent(id)}`})}
async function more(){if(loadingMore.value||!data.value?.children.hasMore)return;loadingMore.value=true;moreError.value='';try{const result=await getBusinessReport('agency','team',context.value.id,{parentNodeId:data.value.node.id,cursor:data.value.children.nextCursor});if(active){data.value.children={...result,items:[...new Map([...data.value.children.items,...result.items].map(item=>[item.id,item])).values()]}}}catch(reason){if(active)moreError.value=reason.message}finally{if(active)loadingMore.value=false}}
onUnmounted(()=>{active=false});defineExpose({refresh:load})
</script>
<style>@import '../styles/account.css';@import '../styles/exclusive.css';@import '../styles/business.css';</style>
