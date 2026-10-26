<template>
  <view class="feedback-page">
    <view class="feedback-frame">
      <BusinessPageHeader title="详情" fallback="/pages/profile/index" />
      <view class="feedback-body">
        <FeaturePageState :status="status" :error="error" @retry="load" />
        <template v-if="status === 'ready'">
          <view class="feedback-card summary-card">
            <view class="summary-title">{{ data.title }}</view>
            <view class="summary-meta">
              <text>健脑官：{{ data.coachName || '—' }}</text>
              <text>{{ businessDateLabel(data.createdAt) }}</text>
            </view>
          </view>
          <view class="feedback-card content-card">
            <template v-if="data.blocks?.length">
              <template v-for="(block, index) in data.blocks" :key="block.assetId || index">
                <view v-if="block.type === 'text'" class="content-text">{{ block.text }}</view>
                <image v-else-if="block.type === 'image'" class="content-image" :src="block.src" mode="widthFix" />
                <view v-else-if="block.type === 'file'" class="file-row" @click="openFile(block)">
                  <image src="/static/media/icon-pdf.png" mode="aspectFit" />
                  <text class="file-name">{{ block.name }}</text>
                  <text v-if="block.sizeLabel" class="file-size">{{ block.sizeLabel }}</text>
                </view>
                <view v-else-if="block.type === 'video'" class="video-block">
                  <video v-if="block.previewUrl" :src="block.previewUrl" :poster="block.posterUrl" controls />
                  <view v-else class="video-poster" @click="missingMedia('视频暂不可播放')">
                    <image class="poster" :src="block.posterUrl" mode="aspectFill" />
                    <image class="play" src="/static/media/icon-play-solid.png" mode="aspectFit" />
                  </view>
                </view>
              </template>
            </template>
            <template v-else>
              <ManagedRichContent :content="data.content" />
              <image v-for="src in data.images || []" :key="src" class="content-image" :src="src" mode="widthFix" />
              <view v-for="item in data.attachments || []" :key="item.assetId">
                <video v-if="item.kind === 'video' && item.previewUrl" :src="item.previewUrl" :poster="item.posterUrl" controls />
                <view v-else-if="item.kind === 'video'" class="video-poster" @click="missingMedia('视频暂不可播放')">
                  <image class="poster" :src="item.posterUrl || '/static/product/product-cover.png'" mode="aspectFill" />
                  <image class="play" src="/static/media/icon-play-solid.png" mode="aspectFit" />
                </view>
                <view v-else class="file-row" @click="openFile(item)">
                  <image src="/static/media/icon-pdf.png" mode="aspectFit" />
                  <text class="file-name">{{ item.name }}</text>
                  <text v-if="item.sizeLabel" class="file-size">{{ item.sizeLabel }}</text>
                </view>
              </view>
            </template>
          </view>
        </template>
      </view>
    </view>
  </view>
</template>
<script setup>
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
import { businessDateLabel } from '../../features/business/format'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { useAuth } from '../../composables/useAuth'
import { useAsyncPage } from '../../composables/useAsyncPage'
import { getTrainingFeedbackDetail } from '../../services/training'
import FeaturePageState from '../../components/FeaturePageState.vue'
import ManagedRichContent from '../../components/ManagedRichContent.vue'
import { getSession } from '../../services/api'
useAuth()
let active = true, id = '', memberId = '', contextId = ''
const { data, status, error, load } = useAsyncPage(() => { if (!id || !memberId) throw new Error('缺少反馈编号或会员编号'); return getTrainingFeedbackDetail(memberId, id, contextId) }, false)
function readRouteId(value) { let text = value || ''; for (let i = 0; i < 2 && text.includes('%'); i++) { try { const next = decodeURIComponent(text); if (next === text) break; text = next } catch { break } } return text }
function missingMedia(title) { uni.showToast({ title, icon: 'none' }) }
function openFile(item) { if (item.previewUrl) openAttachment(item); else missingMedia('文件暂不可预览') }
function openAttachment(item) {
  // #ifdef H5
  window.open(item.previewUrl, '_blank', 'noopener,noreferrer')
  // #endif
  // #ifndef H5
  const session = getSession()
  const open = path => { if (active && getSession()?.token === session?.token && getSession()?.user?.id === session?.user?.id) uni.openDocument({ filePath: path, fileType: 'pdf', showMenu: true, fail: () => uni.showToast({ title: '文件打开失败，请重试', icon: 'none' }) }) }
  if (/^https:\/\//.test(item.previewUrl)) uni.downloadFile({ url: item.previewUrl, success: result => { if (result.statusCode === 200) open(result.tempFilePath); else if (active) uni.showToast({ title: '文件下载失败', icon: 'none' }) }, fail: () => { if (active) uni.showToast({ title: '文件下载失败，请重试', icon: 'none' }) } })
  else open(item.previewUrl)
  // #endif
}
onLoad(options => { contextId = readRouteId(options.contextId); id = readRouteId(options.id); memberId = readRouteId(options.memberId); load() })
onUnload(() => { active = false })
</script>
<style scoped>
.feedback-page { min-height: 100vh; background: #272c47; color: #fff; font-size: clamp(14px, 3.73vw, 16px); }
.feedback-frame { max-width: 750px; margin: 0 auto; }
.feedback-body { padding: .85em 1em calc(1.4em + env(safe-area-inset-bottom)); }
.feedback-card { margin-bottom: .85em; padding: 1em .95em; border-radius: .85em; background: #353a59; }
.summary-title { font-weight: 700; line-height: 1.5; }
.summary-meta { display: flex; justify-content: space-between; gap: .8em; margin-top: .7em; color: #9aa3bd; font-size: .86em; }
.summary-meta text:last-child { flex: none; }
.content-text { margin-bottom: .7em; color: #e7edf8; line-height: 1.7; overflow-wrap: anywhere; }
.content-image, .video-block video, .video-poster { width: 100%; margin: .35em 0 .8em; border-radius: .55em; overflow: hidden; background: #2a314c; }
.video-block video { height: 12em; }
.file-row { display: flex; align-items: center; gap: .55em; margin: .45em 0; padding: .55em .7em; border-radius: .45em; background: #4a516c; }
.file-row image { width: 1.7em; height: 1.7em; flex-shrink: 0; }
.file-name { min-width: 0; overflow-wrap: anywhere; }
.file-size { flex: none; margin-left: auto; color: #9aa3bd; font-size: .86em; }
.video-poster { position: relative; height: 12em; }
.video-poster .poster { width: 100%; height: 100%; }
.video-poster .play { position: absolute; left: 50%; top: 50%; width: 2.6em; height: 2.6em; transform: translate(-50%, -50%); }
</style>
