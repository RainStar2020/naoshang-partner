<template><view class="shop-page"><BusinessPageHeader :title="`申请${data?.label||'代理'}`" fallback="/pages/profile/index"/><view class="shop-body"><FeaturePageState :status="status" :error="error" @retry="load"/><template v-if="data"><view class="shop-card"><text>姓名</text><input v-model="draft.name" class="shop-field" placeholder="请输入姓名" maxlength="30"/><text>手机号</text><input v-model="draft.phone" class="shop-field" placeholder="请输入手机号" type="number" maxlength="11"/><text>门店地区</text><RegionPicker :label="draft.regionNames.join(' · ')" :codes="draft.regionCodes" @change="regionChanged"/><text>门店地址</text><textarea v-model="draft.address" class="shop-field" maxlength="200" placeholder="请输入详细地址"/><template v-if="data.agencyType==='STORE'"><text>门头照</text><image v-if="cover" :src="cover" mode="aspectFill" style="width:7em;height:7em;display:block"/><button class="shop-secondary" :disabled="uploading||busy" @click="upload">{{uploading?'上传中…':'上传门头照'}}</button></template></view><view class="shop-card"><view class="shop-row"><text>代理推广码</text><text>{{data.promotionId}}</text></view><view class="shop-row"><text>申请代理等级</text><text>{{data.label}}</text></view><view class="shop-row"><text>代理费用合计</text><text class="shop-price">¥{{money(data.payableAmount)}}</text></view><text v-if="actionError" class="shop-error">{{actionError}}</text><text v-if="submitted" class="shop-accent">申请已提交，等待审核</text><button v-else class="shop-primary" :disabled="busy||uploading" @click="submit">提交开通申请</button></view></template></view></view></template>
<script setup>
import {ref} from 'vue'
import {onLoad,onUnload} from '@dcloudio/uni-app'
import {config} from '../../config'
import {rememberAgencyReturn} from '../../services/login-return'
import {getSession,request} from '../../services/api'
import {getAgencyApplicationOptions,submitAgencyApplication} from '../../services/agency-application'
import {uploadProfileImage} from '../../services/profile'
import {useAuth} from '../../composables/useAuth'
import {useAsyncPage} from '../../composables/useAsyncPage'
import {commerceRequestKey} from '../../services/commerce'
import {money} from '../../features/exclusive/format'
import RegionPicker from '../../components/RegionPicker.vue'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
import FeaturePageState from '../../components/FeaturePageState.vue'
useAuth();let type='',promotionId='',active=true,key='',fingerprint='';const draft=ref({name:'',phone:'',address:'',regionNames:[],regionCodes:[],storefrontAssetId:''}),cover=ref(''),busy=ref(false),uploading=ref(false),submitted=ref(false),actionError=ref(''),{data,status,error,load}=useAsyncPage(()=>getAgencyApplicationOptions(type,promotionId),false)
function regionChanged(value){draft.value.regionNames=value.names;draft.value.regionCodes=value.codes}
async function upload(){uploading.value=true;try{const result=await new Promise((resolve,reject)=>uni.chooseImage({count:1,success:resolve,fail:reject})),file=result.tempFiles[0],asset=await uploadProfileImage({path:file.path,size:file.size},'storefront');if(active){cover.value=asset.previewUrl;draft.value.storefrontAssetId=asset.assetId}}catch(e){if(active)actionError.value=e.message||'上传失败'}finally{if(active)uploading.value=false}}
async function submit(){if(busy.value)return;busy.value=true;actionError.value='';try{const s=getSession(),value=JSON.stringify(draft.value);if(value!==fingerprint){fingerprint=value;key=commerceRequestKey()}await submitAgencyApplication(data.value,{...draft.value},key);if(active&&getSession()?.token===s.token)submitted.value=true}catch(e){if(active)actionError.value=e.message}finally{if(active)busy.value=false}}
onLoad(q=>{if(!getSession())rememberAgencyReturn(q);type=q.agencyType||'STORE';promotionId=q.promotionId||'';load()});onUnload(()=>{active=false})
</script><style>@import '../../styles/commerce.css';</style>
