<template><view class="shop-page"><BusinessPageHeader title="会员反馈"/><view class="shop-body"><FeaturePageState :status="status" :error="error" @retry="load"/><template v-if="data"><view v-for="item in data.items" :key="item.id" class="shop-card"><view class="shop-title">{{item.title}}</view><view class="shop-muted">健脑官：{{item.coachName}}</view><view class="shop-row"><text>{{businessDateLabel(item.createdAt)}}</text><button class="shop-link" @click="detail(item.id)">查看详情</button></view></view><view v-if="!data.items.length" class="shop-empty">暂无反馈</view></template></view><view v-if="status==='ready'&&data?.allowedActions.includes('write-feedback')" class="shop-footer"><button class="shop-primary" style="width:100%" @click="add">添加反馈</button></view></view></template>
<script setup>
import {onLoad,onShow} from '@dcloudio/uni-app'
import {useAuth} from '../../composables/useAuth'
import {useAsyncPage} from '../../composables/useAsyncPage'
import {getTrainingFeedback} from '../../services/training'
import {businessDateLabel} from '../../features/business/format'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
import FeaturePageState from '../../components/FeaturePageState.vue'
useAuth();let contextId='',memberId='',kind='training';const {data,status,error,load}=useAsyncPage(()=>getTrainingFeedback(contextId,memberId,kind),false),query=()=>`contextId=${encodeURIComponent(contextId)}&memberId=${encodeURIComponent(memberId)}&kind=${encodeURIComponent(kind)}`
function detail(id){uni.navigateTo({url:`/pages/feedback/detail?${query()}&id=${encodeURIComponent(id)}`})}
function add(){uni.navigateTo({url:`/pages/feedback/edit?${query()}`})}
onLoad(q=>{contextId=q.contextId||'';memberId=q.memberId||'';kind=q.kind||'training'});onShow(load)
</script><style>@import '../../styles/commerce.css';</style>
