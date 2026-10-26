<template>
 <view class="shop-page transfer-page">
  <BusinessPageHeader title="选择转入门店"/>
  <view class="shop-body">
   <FeaturePageState :status="status" :error="error" @retry="load"/>
   <template v-if="data">
    <view class="region-bar"><text>区域选择</text><view class="region-pill"><RegionPicker plain :label="regionLabel" :codes="regionCodes" @change="regionChanged"/></view></view>
    <button v-if="data.headquarters" class="store-card hq-card" @click="ask(data.headquarters)">
     <view><view class="store-name">{{data.headquarters.name}}</view><text>{{data.headquarters.description}}</text></view>
     <image src="/static/common/icon-chevron-right.png" mode="aspectFit"/>
    </button>
    <button v-for="store in data.stores" :key="store.id" class="store-card" @click="ask(store)">
     <image class="store-cover" :src="store.coverUrl || '/static/common/icon-store.png'" mode="aspectFill"/>
     <view class="store-copy">
      <view class="store-name">{{store.name}}<text v-if="store.number">{{store.number}}</text></view>
      <text>店长信息：{{store.managerName || '—'}}/{{store.phone || '—'}}</text>
      <text>{{store.address}}</text>
     </view>
     <image class="chevron" src="/static/common/icon-chevron-right.png" mode="aspectFit"/>
    </button>
    <EmptyState v-if="!data.stores.length" text="当前地区没有可服务门店"/>
    <text v-if="submitted" class="done">申请已提交，等待门店审核。转店不会立即更改归属。</text>
    <text v-if="actionError" class="dialog-error">{{actionError}}</text>
   </template>
  </view>
  <view v-if="pending" class="confirm-mask" @click="!busy && (pending=null)">
   <view class="confirm-dialog" role="dialog" aria-label="申请转店" @click.stop>
    <view>确定要申请转入该门店吗?</view>
    <view class="confirm-actions"><button :disabled="busy" @click="submit">确定</button><button :disabled="busy" @click="pending=null">取消</button></view>
   </view>
  </view>
 </view>
</template>
<script setup>
import {computed,ref,watch} from 'vue'
import {onLoad} from '@dcloudio/uni-app'
import {useAuth} from '../../composables/useAuth'
import {useAsyncPage} from '../../composables/useAsyncPage'
import {getTransferOptions,applyStoreTransfer} from '../../services/training'
import {commerceRequestKey} from '../../services/commerce'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
import RegionPicker from '../../components/RegionPicker.vue'
import FeaturePageState from '../../components/FeaturePageState.vue'
import EmptyState from '../../components/EmptyState.vue'
useAuth()
let contextId='',memberId='',key='',fingerprint=''
const regionNames=ref([]),regionCodes=ref([]),pending=ref(null),busy=ref(false),submitted=ref(false),actionError=ref('')
const regionLabel=computed(()=>regionNames.value.join('')||'请选择地区')
const {data,status,error,load}=useAsyncPage(()=>getTransferOptions(contextId,memberId,{regionCodes:regionCodes.value}),false)
let regionReady=false
function regionChanged(value){regionReady=true;regionNames.value=value.names;regionCodes.value=value.codes;load()}
watch(data,value=>{pending.value=null;if(regionReady||!value?.defaultRegion?.codes?.length)return;regionReady=true;regionNames.value=[...value.defaultRegion.names];regionCodes.value=[...value.defaultRegion.codes]})
function ask(store){if(submitted.value||busy.value)return;actionError.value='';pending.value=store}
async function submit(){if(busy.value||!pending.value)return;const target=pending.value;busy.value=true;actionError.value='';try{const draft={targetStoreId:target.id,reason:''};const value=JSON.stringify(draft);if(value!==fingerprint){fingerprint=value;key=commerceRequestKey()}await applyStoreTransfer(contextId,memberId,draft,key);pending.value=null;submitted.value=true}catch(reason){actionError.value=reason.message||'提交失败';pending.value=null}finally{busy.value=false}}
onLoad(query=>{contextId=query.contextId||'';memberId=query.memberId||'';load()})
</script>
<style>@import '../../styles/commerce.css';</style>
<style scoped>
.transfer-page{max-width:750px;margin:0 auto;font-size:clamp(14px,3.7vw,16px)}
.transfer-page button{margin:0;padding:0;background:none;color:inherit;line-height:inherit}
.transfer-page button::after{border:0}
.region-bar{display:flex;align-items:center;gap:.7em;margin-bottom:.8em}
.region-bar>text{flex:none;color:#d5dced}
.region-pill{min-width:0;flex:1;padding:.15em .8em;border-radius:2em;background:#464c6b}
.store-card{display:flex;align-items:center;gap:.7em;width:100%;margin:0 0 .7em;padding:.75em;border-radius:.75em;background:#353a59;text-align:left}
.hq-card{align-items:flex-start}
.hq-card>view{min-width:0;flex:1}
.store-cover{width:4.6em;height:4.2em;flex:none;border-radius:.35em;background:#2a314c}
.store-copy{min-width:0;flex:1}
.store-name{display:flex;align-items:center;gap:.4em;font-weight:700;line-height:1.4}
.store-name text{padding:0 .45em;border-radius:1em;background:linear-gradient(100deg,#00b7ff,#3157ff);font-size:.68em;font-weight:700;line-height:1.7}
.store-copy>text,.hq-card text{display:block;margin-top:.25em;color:#b7c0d8;font-size:.75em;line-height:1.45;overflow-wrap:anywhere}
.chevron,.store-card>image:last-child{width:1em;height:1em;flex:none;opacity:.8}
.done{display:block;margin-top:.4em;color:#8ec8ff;font-size:.85em}
.dialog-error{display:block;margin-top:.4em;color:#ffb4c4;font-size:.85em}
.confirm-mask{position:fixed;z-index:120;inset:0;display:flex;align-items:center;justify-content:center;padding:1.5em;background:rgba(0,0,0,.72);box-sizing:border-box}
.confirm-dialog{width:100%;max-width:20em;padding:1.5em 1.2em 1.1em;border-radius:1em;background:#343c62;text-align:center}
.confirm-dialog>view:first-child{font-size:1em;line-height:1.6}
.confirm-actions{display:grid;grid-template-columns:1fr 1fr;margin-top:1.2em}
.confirm-actions button{color:#57adff;font-size:1em;line-height:2}
</style>
