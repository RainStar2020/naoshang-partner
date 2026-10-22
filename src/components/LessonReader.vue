<template><view class="shop-page"><BusinessPageHeader :title="data?.title||'课程详情'" fallback="/pages/member/index"/><view class="shop-body"><FeaturePageState :status="status" :error="error" @retry="load"/><template v-if="data"><view class="shop-title">{{data.title}}</view><video v-if="data.type==='video'&&data.videoUrl" :src="data.videoUrl" :poster="data.posterUrl" controls style="width:100%;height:55vw;max-height:70vh;margin:1em 0" @error="videoError='视频加载失败，请检查网络后重试'"/><text v-if="videoError" class="shop-error">{{videoError}}</text><view class="shop-card"><ManagedRichContent :content="data.content"/></view></template></view></view></template>
<script setup>
import {ref,watch} from 'vue'
import {useAuth} from '../composables/useAuth'
import {useAsyncPage} from '../composables/useAsyncPage'
import {getLesson} from '../services/lesson'
import BusinessPageHeader from './BusinessPageHeader.vue'
import FeaturePageState from './FeaturePageState.vue'
import ManagedRichContent from './ManagedRichContent.vue'
const props=defineProps({query:Object});useAuth();const videoError=ref(''),{data,status,error,load}=useAsyncPage(()=>getLesson(props.query),false);watch(()=>props.query,q=>{if(q)load()},{immediate:true})
</script><style>@import '../styles/commerce.css';</style>
