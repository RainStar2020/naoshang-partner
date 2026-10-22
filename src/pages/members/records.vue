<template><view class="account-page feature-page"><FeaturePageState :status="status" :error="error" @retry="load"/><template v-if="status==='ready'"><EmptyState v-if="!items.length" :text="kind==='orders'?'该会员暂无订单':'该会员暂无反馈'"/><view v-for="item in items" :key="item.id" class="record-card" @click="kind==='orders'&&orderDetail(item.id)"><view class="record-title">{{kind==='orders'?(item.title||item.orderNo):item.title}}</view><template v-if="kind==='orders'"><text>{{item.statusLabel||'状态待确认'}}</text><view class="record-amount">订单金额：¥{{money(item.payableAmount)}}</view></template><template v-else><text>健脑官：{{item.coachName||'—'}}</text><view class="record-foot"><text>{{item.createdAtLabel||item.createdAt||'—'}}</text><button class="account-link" @click="detail(item.id)">查看详情</button></view></template></view><button v-if="hasMore" class="secondary" :disabled="loadingMore" @click="more">{{loadingMore?'加载中…':'加载更多'}}</button><text v-if="moreError" class="account-error">{{moreError}}</text></template></view></template>
<script setup>
import {ref,watch} from 'vue'
import {onLoad,onShow,onUnload} from '@dcloudio/uni-app'
import {useAuth} from '../../composables/useAuth'
import {useAsyncPage} from '../../composables/useAsyncPage'
import {getMemberRecords} from '../../services/members'
import {money} from '../../features/exclusive/format'
import FeaturePageState from '../../components/FeaturePageState.vue'
import EmptyState from '../../components/EmptyState.vue'
useAuth();const memberId=ref(''),kind=ref(''),items=ref([]),hasMore=ref(false),loadingMore=ref(false),moreError=ref('');let cursor=null,epoch=0
const {data,status,error,load}=useAsyncPage(()=>{if(!memberId.value)throw new Error('缺少会员编号');return getMemberRecords(memberId.value,kind.value)},false)
onLoad(options=>{memberId.value=options.memberId||'';kind.value=options.kind||'';uni.setNavigationBarTitle({title:kind.value==='orders'?'会员订单':{training:'陪练反馈','self-study':'智习反馈',camp:'集训反馈'}[kind.value]||'会员记录'})});onShow(load)
watch(status,value=>{if(value==='loading'){++epoch;loadingMore.value=false;moreError.value=''}})
watch(data,result=>{if(result){items.value=result.items;hasMore.value=result.hasMore;cursor=result.nextCursor}})
function orderDetail(id){uni.navigateTo({url:`/pages/order/detail?id=${encodeURIComponent(id)}`})}
function detail(id){uni.navigateTo({url:`/pages/feedback/detail?memberId=${encodeURIComponent(memberId.value)}&id=${encodeURIComponent(id)}`})}
async function more(){if(loadingMore.value||!hasMore.value)return;const current=epoch;loadingMore.value=true;try{const result=await getMemberRecords(memberId.value,kind.value,cursor);if(current===epoch){items.value=[...new Map([...items.value,...result.items].map(item=>[item.id,item])).values()];cursor=result.nextCursor;hasMore.value=result.hasMore}}catch(reason){if(current===epoch)moreError.value=reason.message}finally{if(current===epoch)loadingMore.value=false}}
onUnload(()=>{++epoch})
</script>
<style>@import '../../styles/account.css';@import '../../styles/exclusive.css';</style>
<style scoped>.record-card{background:#343a5b;border-radius:24rpx;padding:28rpx;margin-bottom:24rpx;font-size:calc(var(--feature-font,14px)*0.92857);color:#9eafcb;line-height:1.8}.record-title{font-size:calc(var(--feature-font,14px)*1.07143);color:#fff;margin-bottom:22rpx;overflow-wrap:anywhere}.record-foot{display:flex;justify-content:space-between;gap:20rpx;align-items:center;margin-top:12rpx}.record-amount{text-align:right;color:#ff4c79;margin-top:24rpx}</style>
