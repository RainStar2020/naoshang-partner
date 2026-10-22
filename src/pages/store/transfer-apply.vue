<template><view class="shop-page"><BusinessPageHeader title="申请转店"/><view class="shop-body"><FeaturePageState :status="status" :error="error" @retry="load"/><template v-if="data"><view class="shop-card"><view class="shop-title">当前门店</view><text>{{data.currentStore.name}}</text></view><view class="shop-card"><input v-model="keyword" class="shop-field" placeholder="输入门店名称或地址"/><RegionPicker :label="regionNames.join(' · ')" :codes="regionCodes" @change="regionChanged"/><view class="shop-options"><button :disabled="busy" @click="load">筛选门店</button><button :disabled="busy" @click="resetFilter">清除筛选</button></view><text v-if="!data.stores.length" class="shop-muted">暂无符合条件的门店</text><picker :disabled="busy" :range="data.stores" range-key="name" @change="targetStoreId=data.stores[$event.detail.value]?.id"><view class="shop-row"><text>转入门店</text><text>{{data.stores.find(x=>x.id===targetStoreId)?.name||'请选择'}}</text></view></picker><textarea v-model="reason" :disabled="busy" class="shop-field" placeholder="请填写转店原因" maxlength="200"/><text v-if="actionError" class="shop-error">{{actionError}}</text><text v-if="submitted" class="shop-accent">申请已提交，等待门店审核</text><button v-else class="shop-primary" :disabled="busy" @click="submit">提交申请</button></view></template></view></view></template>
<script setup>
import {ref,watch} from 'vue'
import {onLoad} from '@dcloudio/uni-app'
import {useAuth} from '../../composables/useAuth'
import {useAsyncPage} from '../../composables/useAsyncPage'
import {getTransferOptions,applyStoreTransfer} from '../../services/training'
import {commerceRequestKey} from '../../services/commerce'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
import RegionPicker from '../../components/RegionPicker.vue'
import FeaturePageState from '../../components/FeaturePageState.vue'
useAuth();let contextId='',memberId='',key='',fingerprint='';const keyword=ref(''),regionNames=ref([]),regionCodes=ref([]),targetStoreId=ref(''),reason=ref(''),busy=ref(false),submitted=ref(false),actionError=ref(''),{data,status,error,load}=useAsyncPage(()=>getTransferOptions(contextId,memberId,{keyword:keyword.value.trim(),regionCodes:regionCodes.value}),false)
function regionChanged(value){regionNames.value=value.names;regionCodes.value=value.codes}
function resetFilter(){keyword.value='';regionNames.value=[];regionCodes.value=[];load()}
watch(data,value=>{if(value&&!value.stores.some(x=>x.id===targetStoreId.value))targetStoreId.value=''})
async function submit(){if(busy.value)return;const target=data.value?.stores.find(x=>x.id===targetStoreId.value);if(!target){actionError.value='请选择转入门店';return}const confirmed=await new Promise(resolve=>uni.showModal({title:'申请转店',content:`确定申请转入${target.name}吗？`,success:r=>resolve(r.confirm),fail:()=>resolve(false)}));if(!confirmed||busy.value)return;busy.value=true;try{const draft={targetStoreId:targetStoreId.value,reason:reason.value},value=JSON.stringify(draft);if(value!==fingerprint){fingerprint=value;key=commerceRequestKey()}await applyStoreTransfer(contextId,memberId,draft,key);submitted.value=true}catch(e){actionError.value=e.message}finally{busy.value=false}}
onLoad(q=>{contextId=q.contextId||'';memberId=q.memberId||'';load()})
</script><style>@import '../../styles/commerce.css';</style>
