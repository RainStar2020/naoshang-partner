<template><view class="shop-page"><BusinessPageHeader title="脑商健脑官"/><view class="shop-body"><FeaturePageState :status="status" :error="error" @retry="load"/><template v-if="data"><view class="shop-row"><view><view class="shop-title">欢迎你，{{data.name}}</view><text class="shop-muted">脑商门店健脑官端</text></view><button class="shop-link" @click="storeInfo">门店信息</button></view><view class="shop-options"><button @click="password">修改密码</button><button @click="leave">登出</button></view><view class="shop-title">门店会员</view><view v-for="member in data.members" :key="member.id" class="shop-card"><view class="shop-title">{{member.name}}</view><text class="shop-muted">用户ID：{{member.displayId}}　{{member.gradeLabel}}</text><view class="shop-row"><button v-if="data.allowedActions.includes('manage-members')" class="shop-primary" @click="detail(member.id)">查看会员</button><button v-if="data.allowedActions.includes('read-orders')" class="shop-primary" @click="orders(member.id)">查看订单</button></view></view></template></view></view></template>
<script setup>
import {onLoad,onShow} from '@dcloudio/uni-app'
import {useAuth} from '../../composables/useAuth'
import {useAsyncPage} from '../../composables/useAsyncPage'
import {getBusinessContexts} from '../../services/business'
import {getCoachWorkspace} from '../../services/training'
import {logout} from '../../services/api'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
import FeaturePageState from '../../components/FeaturePageState.vue'
useAuth();let contextId='';const {data,status,error,load}=useAsyncPage(async()=>{if(!contextId){const contexts=await getBusinessContexts();contextId=contexts.find(x=>x.module==='agency'&&x.agencyType==='STORE')?.id;if(!contextId)throw new Error('当前账号没有健脑官工作台权限')}return getCoachWorkspace(contextId)},false)
function detail(id){uni.navigateTo({url:`/pages/members/detail?contextId=${encodeURIComponent(contextId)}&memberId=${encodeURIComponent(id)}`})}
function orders(id){uni.navigateTo({url:`/pages/order/list?memberId=${encodeURIComponent(id)}&contextId=${encodeURIComponent(contextId)}`})}
function password(){uni.navigateTo({url:'/pages/settings/change-password'})}
function leave(){uni.showModal({title:'退出登录',content:'您确定要退出登录吗？',success:r=>{if(r.confirm)logout()}})}
function storeInfo(){uni.showModal({title:data.value.store.name,content:data.value.store.address,showCancel:false})}
onLoad(q=>{contextId=q.contextId||''});onShow(load)
</script><style>@import '../../styles/commerce.css';</style>
