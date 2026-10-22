<template><view class="shop-page"><BusinessPageHeader title="专栏详情" fallback="/pages/selection/index"/><FeaturePageState :status="status" :error="error" @retry="load"/><template v-if="data"><image class="shop-cover" :src="data.product.coverUrl" mode="aspectFill"/><view class="shop-body"><view class="shop-title">{{data.product.title}}</view><ShopPrices :product="data.product"/><view class="shop-tabs"><button :class="{selected:tab==='detail'}" @click="tab='detail'">详情</button><button :class="{selected:tab==='catalog'}" @click="tab='catalog'">目录</button></view><ManagedRichContent v-if="tab==='detail'" :content="data.product.content"/><template v-else><button v-for="chapter in data.chapters" :key="chapter.id" class="shop-card shop-beneficiary" @click="read(chapter)"><view class="shop-row"><text>{{chapter.title}}</text><text class="shop-accent">{{data.unlocked?'查看':'未激活'}}</text></view></button></template><text v-if="actionError" class="shop-error">{{actionError}}</text></view><view class="shop-footer"><button class="shop-secondary" @click="activate">{{data.unlocked?'已激活':'激活专栏'}}</button><button class="shop-primary" @click="buy">立即购买</button></view></template></view></template>
<script setup>
import {ref} from 'vue'
import {onLoad,onShow} from '@dcloudio/uni-app'
import {useAuth} from '../../composables/useAuth'
import {useAsyncPage} from '../../composables/useAsyncPage'
import {getColumn,activateColumn,commerceRequestKey} from '../../services/commerce'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
import FeaturePageState from '../../components/FeaturePageState.vue'
import ManagedRichContent from '../../components/ManagedRichContent.vue'
import ShopPrices from '../../components/ShopPrices.vue'
useAuth();let id='',saving=false,codeKey='',lastCode='';const tab=ref('detail'),actionError=ref(''),{data,status,error,load}=useAsyncPage(()=>getColumn(id),false)
function buy(){uni.navigateTo({url:`/pages/product/detail?id=${encodeURIComponent(id)}`})}
function read(chapter){if(!data.value.unlocked){activate();return}uni.navigateTo({url:`/pages/learning/article?columnId=${encodeURIComponent(id)}&chapterId=${encodeURIComponent(chapter.id)}`})}
function activate(){if(data.value.unlocked||saving)return;uni.showModal({title:'激活专栏',editable:true,placeholderText:'请输入激活码',success:async result=>{if(!result.confirm||saving)return;saving=true;try{if(lastCode!==result.content){lastCode=result.content;codeKey=commerceRequestKey()}await activateColumn(id,result.content,codeKey);await load();uni.showToast({title:'激活成功',icon:'success'})}catch(e){actionError.value=e.message}finally{saving=false}}})}
onLoad(q=>{id=q.id||''});onShow(load)
</script><style>@import '../../styles/commerce.css';</style>
