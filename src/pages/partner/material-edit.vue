<template>
  <view class="material-detail-page" :class="detail ? `kind-${detail.type}` : ''">
    <view v-if="status === 'loading'" class="editor-state">正在加载素材…</view>
    <view v-else-if="status === 'error'" class="editor-state"><text>{{ error }}</text><button class="secondary" @click="load">重新加载</button></view>
    <template v-else-if="detail">
      <view class="material-heading">{{ detail.title }}</view>
      <image v-if="detail.type === 'image' && detail.mediaUrl" class="poster-preview" :src="detail.mediaUrl" mode="widthFix" />
      <view v-if="detail.type === 'video'" class="video-stage"><video v-if="detail.mediaUrl" class="video-preview" :src="detail.mediaUrl" :poster="detail.posterUrl" controls object-fit="cover" /><button class="qr-float" @click="qrOpen = true"><image src="/static/partner/icon-qrcode.png" mode="aspectFit" /><text>二维码</text></button></view>
      <view v-if="detail.type === 'article'" class="article-sheet"><image v-if="detail.mediaUrl" class="article-cover" :src="detail.mediaUrl" mode="aspectFill" /><text class="article-copy">这就是关于某个板块的功能这里是某个板块功能的图文介绍页面的事情了，大家有什么想法呢，欢迎在评论区告诉小编一起讨论哦！</text><image v-if="detail.mediaUrl" class="article-cover" :src="detail.mediaUrl" mode="aspectFill" /><text class="article-copy">这就是关于某个板块的功能这里是某个板块功能的图文介绍页面的事情了，大家有什么想法呢，欢迎在评论区告诉小编一起讨论哦！</text><button class="article-qr" aria-label="二维码" @click="qrOpen = true"></button></view>
      <view v-else-if="detail.content.nodes.length" class="material-rich-body"><ManagedRichContent :content="detail.content" /></view>
      <view v-if="jobStatus" class="job-status" role="status">{{ jobStatus }}</view><text v-if="operationError" class="operation-error" role="alert">{{ operationError }}</text>
      <view class="editor-footer"><button v-if="canUpload" class="secondary" :disabled="busy" @click="chooseQr">{{ uploading ? '上传中…' : '上传二维码' }}</button><button v-if="canRender" class="primary" :disabled="busy || !qrAssetId" @click="generate">{{ generating ? '正在生成…' : '生成素材' }}</button><button v-if="canDownload && resultImage" class="primary" :disabled="busy" @click="saveImage">保存图片</button><button v-if="canCopy && resultLink" class="secondary" :disabled="busy" @click="copyLink">复制链接</button></view>
    </template>
    <view v-if="qrOpen" class="qr-mask" @click="qrOpen = false"><view class="qr-dialog" @click.stop role="dialog" aria-modal="true" aria-label="二维码预览"><image v-if="qrPreview" class="qr-image" :src="qrPreview" mode="aspectFit" /><BusinessQrCode v-else :value="detail?.shareUrl || detail?.id" :show-save="false" /></view></view>
  </view>
</template>
<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { getSession } from '../../services/api'
import { useAuth } from '../../composables/useAuth'
import { getMaterial, renderMaterial, getMaterialJob, uploadMaterialQr, materialTypes } from '../../services/materials'
import ManagedRichContent from '../../components/ManagedRichContent.vue'
import BusinessQrCode from '../../components/BusinessQrCode.vue'
useAuth()
const detail = ref(null), status = ref('loading'), error = ref(''), uploading = ref(false), generating = ref(false), saving = ref(false)
const operationError = ref(''), jobStatus = ref(''), qrAssetId = ref(''), qrPreview = ref(''), qrOpen = ref(false), resultImage = ref(''), resultLink = ref('')
const busy = computed(() => uploading.value || generating.value || saving.value)
const canUpload = computed(() => detail.value?.allowedOperations.includes('upload-qr'))
const canRender = computed(() => detail.value?.allowedOperations.includes('render'))
const canDownload = computed(() => detail.value?.allowedOperations.includes('download') && detail.value?.type === 'image')
const canCopy = computed(() => detail.value?.allowedOperations.includes('copy-link'))
let id = '', epoch = 0, timer = null, active = true, jobId = '', attempts = 0, attemptKey = '', polling = false
onLoad(options => { id = options.id || '' })
async function load() {
  if (!getSession()) return
  const current = ++epoch; status.value = 'loading'; error.value = ''; detail.value = null
  try {
    const result = await getMaterial(id)
    if (current !== epoch) return
    detail.value = result; resultLink.value = result.shareUrl; resultImage.value = result.type === 'image' ? result.mediaUrl : ''; status.value = 'ready'
    uni.setNavigationBarTitle({ title: `${materialTypes.find(item => item.id === result.type).label}编辑` })
  } catch(reason) { if (current === epoch) { status.value = 'error'; error.value = reason.message || '素材加载失败' } }
}
async function chooseQr() {
  if (busy.value || !canUpload.value) return
  operationError.value = ''
  const current = epoch
  uploading.value = true
  try {
    const selected = await new Promise(resolve => uni.chooseImage({ count: 1, sourceType: ['album'], success: resolve, fail: () => resolve(null) }))
    if (!selected || current !== epoch) return
    const file = selected.tempFiles[0]
    const result = await uploadMaterialQr({ path: selected.tempFilePaths[0], size: file.size })
    if (current !== epoch) return
    qrAssetId.value = result.assetId; qrPreview.value = selected.tempFilePaths[0]; attemptKey = ''; jobId = ''; resultImage.value = ''; resultLink.value = ''; jobStatus.value = ''
  } catch(reason) { if(current === epoch) operationError.value = reason.message || '二维码上传失败' }
  finally { if (current === epoch) uploading.value = false }
}
async function generate() {
  if (busy.value || !canRender.value || !qrAssetId.value) return
  const current = epoch; generating.value = true; operationError.value = ''; jobStatus.value = '正在提交生成任务…'
  if (!attemptKey) attemptKey = `material-${Date.now()}-${Math.random().toString(36).slice(2)}`
  try {
    if (!jobId) { const job = await renderMaterial(id, { qrAssetId: qrAssetId.value, idempotencyKey: attemptKey }); if(current !== epoch) return; jobId = job.jobId }
    attempts = 0; await poll()
  } catch(reason) { if(current === epoch) { operationError.value = reason.message || '生成失败，请重试'; jobStatus.value = ''; generating.value = false } }
}
async function poll() {
  const current = epoch
  if (!active || !jobId || polling) return
  clearTimeout(timer); timer = null; polling = true
  try {
    const job = await getMaterialJob(jobId)
    if (current !== epoch || !active) return
    if(job.status === 'succeeded') {
      resultImage.value = job.downloadUrl; resultLink.value = job.shareUrl; generating.value = false; jobStatus.value = '生成完成'; attemptKey = ''; jobId = ''; return
    }
    if(job.status === 'failed') { generating.value = false; jobStatus.value = ''; operationError.value = job.message || '生成失败，请重试'; jobId = ''; attemptKey = ''; return }
    jobStatus.value = job.status === 'queued' ? '正在等待生成…' : '正在生成素材…'
    if(++attempts >= 40) { generating.value = false; operationError.value = '素材仍在生成，点击生成素材可继续查询'; return }
  } catch(reason) { if(current === epoch) { generating.value = false; operationError.value = reason.message || '查询失败，请重试' } }
  finally {
    polling = false
    if (current === epoch && active && jobId && generating.value && attempts < 40) timer = setTimeout(poll, 1500)
  }
}
function copyLink() { if(canCopy.value && resultLink.value) uni.setClipboardData({ data: resultLink.value, fail: () => { operationError.value = '复制失败，请重试' } }) }
async function saveImage() {
  if (busy.value || !canDownload.value || !resultImage.value) return
  saving.value = true; operationError.value = ''
  try {
    // #ifdef H5
    if (resultImage.value.startsWith('/')) { const anchor = document.createElement('a'); anchor.href = resultImage.value; anchor.download = `material-${id}.png`; anchor.click(); return }
    // #endif
    const response = await new Promise((resolve,reject) => uni.downloadFile({ url: resultImage.value, success: resolve, fail: reject }))
    if(response.statusCode !== 200) throw new Error('图片下载失败')
    // #ifdef H5
    const anchor = document.createElement('a'); anchor.href = response.tempFilePath; anchor.download = `material-${id}.png`; anchor.click()
    // #endif
    // #ifndef H5
    await new Promise((resolve,reject) => uni.saveImageToPhotosAlbum({ filePath: response.tempFilePath, success: resolve, fail: reject }))
    // #endif
  } catch(reason) { operationError.value = reason.message || '保存失败，请检查相册权限后重试' }
  finally { saving.value = false }
}
onShow(() => { active = true; if (jobId && generating.value) poll(); else if (!detail.value) load() })
onHide(() => { active = false; clearTimeout(timer) })
onUnload(() => { active = false; ++epoch; clearTimeout(timer) })
</script>
<style scoped>
.material-detail-page{min-height:100vh;max-width:750px;margin:auto;background:#272c47;color:#e4ebfa;padding:24rpx 24rpx calc(190rpx + env(safe-area-inset-bottom))}.editor-state{display:flex;flex-direction:column;gap:24rpx;padding:80rpx 24rpx;color:#a3b1cb;text-align:center}.editor-state button{padding:0 30rpx;margin:auto}.material-heading{font-size:30rpx;line-height:1.7;margin:0 4rpx 24rpx;overflow-wrap:anywhere}.poster-preview{width:100%;display:block;border-radius:20rpx}.video-preview{width:100%;height:900rpx;max-height:65vh;background:#10162b}.material-rich-body{background:#343a5b;border-radius:24rpx;padding:28rpx;min-height:380rpx}.qr-preview-button{display:flex;align-items:center;gap:16rpx;padding:18rpx 0;background:none;color:#b8dafd;margin:20rpx 0;font-size:24rpx;line-height:1.5}.qr-preview-button image{width:64rpx;height:64rpx}.job-status{text-align:center;font-size:24rpx;color:#71d5ff;margin:24rpx 0}.operation-error{display:block;color:#ffa2b6;font-size:24rpx;line-height:1.7;margin:24rpx 0}.editor-footer{position:fixed;bottom:0;left:0;right:0;z-index:10;padding:20rpx 24rpx calc(24rpx + env(safe-area-inset-bottom));background:#272c47;display:flex;gap:20rpx;flex-wrap:wrap;justify-content:center}.editor-footer button{flex:1;min-width:240rpx;max-width:600rpx;font-size:28rpx;margin:0;padding:0 20rpx;line-height:80rpx}.qr-mask{position:fixed;inset:0;z-index:100;background:#000b;display:flex;align-items:center;justify-content:center;padding:60rpx}.qr-dialog{position:relative;width:100%;max-width:560rpx;background:#fff;border-radius:28rpx;padding:48rpx}.qr-close{position:absolute;right:8rpx;top:8rpx;background:none;line-height:1;margin:0;padding:0}.qr-close image{width:44rpx;height:44rpx}.qr-image{width:100%;height:420rpx}
</style>

<style scoped>
.material-heading{display:none}
.editor-footer button.primary,.editor-footer button.secondary{background:#444a68;color:#eef0fc;border-radius:3em;line-height:2.6;font-size:1em}
.material-detail-page{font-size:clamp(14px,3.7vw,16px)}
.kind-video{padding:0 0 calc(5.6em + env(safe-area-inset-bottom))}
.video-stage{position:relative;height:calc(100vh - 44px - 5.6em)}
.kind-video .video-preview{width:100%;height:100%;max-height:none;background:#10162b}
.kind-video :deep(.uni-video-video){object-fit:cover !important}
.qr-float{position:absolute;right:1em;bottom:1.2em;display:flex;flex-direction:column;align-items:center;gap:.15em;width:3.4em;margin:0;padding:.35em 0;border-radius:50%;background:#5d647c;color:#eef3ff;font-size:.75em;line-height:1.2}
.qr-float image{width:1.6em;height:1.6em}
.article-sheet{margin:0 .2em;padding:1em .9em 1.2em;border-radius:1.1em;background:#343a5b}
.article-cover{display:block;width:100%;height:9.5em;border-radius:.45em;margin-bottom:.8em}
.article-copy{display:block;margin:0 0 1em;color:#d5dced;font-size:.92em;line-height:1.7;text-align:center}
.article-qr{display:block;width:5.2em;height:5.2em;margin:.2em auto 0;padding:0;border-radius:.35em;background:#fff}
.qr-dialog{display:flex;align-items:center;justify-content:center;background:#fff;border-radius:1.1em;padding:1.1em}
.qr-dialog :deep(.qr-wrap){width:14em;max-width:100%;margin:0}.qr-dialog :deep(.qr-code){width:14em;height:14em}
.qr-image{width:14em;height:14em;max-height:60vh}
</style>
