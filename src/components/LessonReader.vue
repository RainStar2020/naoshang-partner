<template>
  <view class="shop-page lesson-page" :class="{ 'lesson-video-page': isVideo, 'lesson-landscape': isVideo && landscape }">
    <BusinessPageHeader :title="headerTitle" fallback="/pages/member/index"/>
    <view v-if="isVideo && data.videoUrl" class="lesson-stage">
      <video :src="data.videoUrl" :poster="data.posterUrl" :initial-time="data.progress?.completed ? 0 : data.progress?.positionSeconds || 0" controls :show-progress="true" :show-fullscreen-btn="true" :show-play-btn="true" class="lesson-video" @timeupdate="timeUpdate" @pause="flush" @ended="ended" @error="videoError = '视频加载失败，请检查网络后重试'"/>
    </view>
    <view class="shop-body">
      <FeaturePageState :status="status" :error="error" @retry="load"/>
      <template v-if="data">
        <view class="shop-card lesson-heading">
          <view class="shop-title">{{data.title}}</view>
          <view v-if="tracksChild" class="lesson-meta">
            <text>{{data.type === 'video' ? '视频' : '图文'}}</text>
            <text v-if="progress?.lastStudiedAt">{{studyDate(progress.lastStudiedAt)}}学习</text>
            <text>{{progress?.lastStudiedAt ? `已学${progress.percent}%` : '暂无学习记录'}}</text>
          </view>
        </view>
        <text v-if="videoError" class="shop-error">{{videoError}}</text>
        <view v-if="!isVideo" class="shop-card"><ManagedRichContent :content="data.content"/></view>
        <text v-if="saveError" class="shop-error" role="alert">{{saveError}}</text>
        <button v-if="saveError" class="shop-link" @click="flush">重新保存进度</button>
      </template>
    </view>
  </view>
</template>
<script setup>
import {computed,ref,watch,onMounted,onBeforeUnmount} from 'vue'
import {getSession} from '../services/api'
import {useAuth} from '../composables/useAuth'
import {useAsyncPage} from '../composables/useAsyncPage'
import {getLesson} from '../services/lesson'
import {saveLearningProgress} from '../services/learning'
import BusinessPageHeader from './BusinessPageHeader.vue'
import FeaturePageState from './FeaturePageState.vue'
import ManagedRichContent from './ManagedRichContent.vue'
const props=defineProps({query:Object});useAuth()
const videoError=ref(''),saveError=ref(''),saving=ref(false),progress=ref(null),landscape=ref(false)
const tracksChild=computed(()=>Boolean(props.query?.columnId || (props.query?.contextId && props.query?.levelId)))
const studyDate=value=>String(value).slice(0,10).replaceAll('-','.')
let orientationMedia=null
function syncLandscape(){landscape.value=Boolean(orientationMedia?.matches)}
const {data,status,error,load}=useAsyncPage(()=>getLesson(props.query),false)
const isVideo=computed(()=>data.value?.type==='video')
const headerTitle=computed(()=>isVideo.value && landscape.value && data.value?.title ? data.value.title : '详情')
let pending=null,queued=null,lastPlayback=null,lastSavedAt=0,owner=null,activeQuery=null,flight=null
watch(()=>props.query,q=>{pending=null;queued=null;lastPlayback=null;lastSavedAt=0;videoError.value='';saveError.value='';progress.value=null;owner=getSession();activeQuery=q?{...q}:null;if(q)load()},{immediate:true})
watch(data,value=>{progress.value=value?.progress || null;if(value?.type==='article' && tracksChild.value){pending={completed:true};void flush()}})
function sameOwner(){const session=getSession();return session?.user?.id===owner?.user?.id && session?.token===owner?.token}
function timeUpdate(event){
  if(!tracksChild.value || status.value!=='ready' || !data.value || !sameOwner())return
  const {currentTime,duration}=event.detail || {}
  if(!Number.isFinite(currentTime)||!Number.isFinite(duration)||duration<=0)return
  lastPlayback={positionSeconds:currentTime,durationSeconds:duration};pending={...lastPlayback}
  if(Date.now()-lastSavedAt>=5000)void flush()
}
function ended(event){
  if(!tracksChild.value || !sameOwner())return
  const duration=event.detail?.duration || lastPlayback?.durationSeconds || progress.value?.durationSeconds
  if(!duration)return
  pending={positionSeconds:duration,durationSeconds:duration,ended:true};void flush()
}
async function flush(){
  if(!tracksChild.value || !sameOwner() || !pending)return
  queued={...pending};pending=null
  if(flight)return flight
  const query={...activeQuery},snapshot=owner
  saving.value=true
  flight=(async()=>{
    while(queued && sameOwner() && owner===snapshot){
      const update=queued;queued=null
      try{
        const result=await saveLearningProgress(query,update)
        if(owner!==snapshot || !sameOwner())return
        progress.value=result;saveError.value='';lastSavedAt=Date.now()
      }catch(reason){
        if(owner===snapshot && sameOwner()){pending=queued || update;queued=null;saveError.value=reason.message || '学习进度保存失败，请重试'}
        break
      }
    }
  })()
  try{await flight}finally{flight=null;saving.value=false}
}
onMounted(()=>{if(typeof window==='undefined'||!window.matchMedia)return;orientationMedia=window.matchMedia('(orientation: landscape) and (max-height: 500px)');syncLandscape();orientationMedia.addEventListener?.('change',syncLandscape)})
onBeforeUnmount(()=>{orientationMedia?.removeEventListener?.('change',syncLandscape);void flush()})
defineExpose({flush})
</script>
<style>@import '../styles/commerce.css';</style>
<style scoped>
.lesson-page{max-width:750px;margin:0 auto;padding-bottom:calc(32rpx + env(safe-area-inset-bottom))}
.lesson-video-page{padding-bottom:0}
.lesson-stage{background:#000}
.lesson-video{display:block;width:100%;height:56vw;max-height:70vh;margin:0;border-radius:0;background:#000}
.lesson-stage :deep(.uni-video-video){object-fit:cover!important}
.lesson-stage :deep(.uni-video-bar){display:flex!important}
.lesson-stage :deep(.uni-video-cover),.lesson-stage :deep(.uni-video-danmu-button),.lesson-stage :deep(.uni-video-danmu){display:none!important}
.lesson-heading{margin-bottom:1em}
.lesson-meta{display:flex;flex-wrap:wrap;gap:.35em 1em;margin-top:.45em;color:#a5afc6;font-size:.85em;line-height:1.6}
.lesson-landscape{max-width:none;min-height:100vh;min-height:100dvh;background:#000;padding:0}
.lesson-landscape :deep(.business-page-header){position:absolute;top:0;left:0;right:0;z-index:3;background:linear-gradient(rgba(0,0,0,.55),transparent)}
.lesson-landscape :deep(.business-page-header > text){white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lesson-landscape .shop-body{display:none}
.lesson-landscape .lesson-stage{position:fixed;inset:0;z-index:1}
.lesson-landscape .lesson-video{width:100%;height:100%;max-height:none}
</style>
