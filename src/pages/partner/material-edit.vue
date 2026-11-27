<template>
  <view class="material-detail-page" :class="detail ? `kind-${detail.type}` : ''">
    <view v-if="status === 'loading'" class="editor-state">正在加载素材…</view>
    <view v-else-if="status === 'error'" class="editor-state"><text>{{ error }}</text><button class="secondary" @click="load">重新加载</button></view>
    <template v-else-if="detail">
      <view class="material-heading">{{ detail.title }}</view>
      <image v-if="detail.type === 'image' && detail.mediaUrl" class="poster-preview" :src="detail.mediaUrl" mode="widthFix" />
      <view v-if="detail.type === 'video'" class="video-stage"><video v-if="detail.mediaUrl" class="video-preview" :src="detail.mediaUrl" :poster="detail.posterUrl" controls object-fit="cover" /><button v-if="qrPreview || detail.shareUrl" class="qr-float" @click="qrOpen = true"><image src="/static/partner/icon-qrcode.png" mode="aspectFit" /><text>二维码</text></button></view>
      <view v-if="detail.type === 'article'" class="article-sheet">
        <image v-if="detail.mediaUrl" class="article-cover" :src="detail.mediaUrl" mode="aspectFill" />
        <view v-if="articleHtml" class="article-html"><rich-text :nodes="articleHtml" /></view>
        <view v-else-if="detail.content?.nodes?.length" class="article-rich"><ManagedRichContent :content="detail.content" /></view>
        <text v-if="detail.summary && !articleHtml && !detail.content?.nodes?.length" class="article-copy">{{ detail.summary }}</text>
        <view v-if="qrPreview && (detail.qrSlotAtEnd || canUpload)" class="article-qr-slot" @click="qrOpen = true"><image class="article-qr-image" :src="qrPreview" mode="aspectFit" /></view>
        <button v-else-if="canUpload" class="article-qr" aria-label="二维码" @click="qrOpen = true"></button>
      </view>
      <view v-if="shareHint" class="share-hint">{{ shareHint }}</view>
      <view v-if="contentShareUrl" class="share-url" role="status">内容页链接：{{ contentShareUrl }}</view>
      <view v-if="inviteLink" class="share-url invite-url" role="status">邀请注册链接：{{ inviteLink }}</view>
      <view v-if="composeHint" class="compose-hint" role="status">{{ composeHint }}</view>
      <view v-if="jobStatus" class="job-status" role="status">{{ jobStatus }}</view>
      <text v-if="operationError" class="operation-error" role="alert">{{ operationError }}</text>
      <view class="editor-footer">
        <button v-if="canUpload" class="secondary" :disabled="busy" @click="chooseQr">{{ uploading ? '上传中…' : (qrAssetId ? '重新上传二维码' : '上传二维码') }}</button>
        <button v-if="canSavePoster" class="primary" :disabled="busy || !qrAssetId" @click="savePoster">{{ saveButtonLabel }}</button>
        <button v-if="canCreateShare" class="primary" :disabled="busy || !qrAssetId || !!contentShareBlocker" @click="generateContentShare">{{ creatingShare ? '正在生成内容页…' : '生成内容页分享' }}</button>
        <button v-if="canCopyContent" class="secondary" :disabled="busy || !contentShareUrl" @click="copyContentLink">复制内容页链接</button>
        <button v-if="canCopyInvite" class="secondary" :disabled="busy || !inviteLink" @click="copyInviteLink">复制邀请注册链接</button>
      </view>
    </template>
    <view v-if="qrOpen" class="qr-mask" @click="qrOpen = false"><view class="qr-dialog" @click.stop role="dialog" aria-modal="true" aria-label="二维码预览"><image v-if="qrPreview" class="qr-image" :src="qrPreview" mode="aspectFit" /><text v-else class="qr-empty">请先上传自己的二维码</text></view></view>
  </view>
</template>
<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { getSession } from '../../services/api'
import { useAuth } from '../../composables/useAuth'
import { getMaterial, renderMaterial, getMaterialJob, uploadMaterialQr, materialTypes, describeComposeBlocker, describeContentShareBlocker, describeContentShareError, createContentShare, getCurrentContentShare, isNotFoundError, copyLinkTarget, keepInviteUrl } from '../../services/materials'
import { discardAsset } from '../../services/asset-upload'
import ManagedRichContent from '../../components/ManagedRichContent.vue'
useAuth()
const detail = ref(null), status = ref('loading'), error = ref(''), uploading = ref(false), generating = ref(false), saving = ref(false), creatingShare = ref(false)
const operationError = ref(''), jobStatus = ref(''), qrAssetId = ref(''), qrPreview = ref(''), qrOpen = ref(false), resultImage = ref('')
const busy = computed(() => uploading.value || generating.value || saving.value || creatingShare.value)
const canUpload = computed(() => detail.value?.allowedOperations.includes('upload-qr'))
const canSavePoster = computed(() => detail.value?.type === 'image' && detail.value?.allowedOperations.includes('render') && detail.value?.allowedOperations.includes('download'))
const canCreateShare = computed(() => detail.value && detail.value.type !== 'image' && (detail.value.allowedOperations.includes('create-content-share') || canUpload.value))
const contentShareUrl = computed(() => copyLinkTarget(detail.value))
const inviteLink = computed(() => keepInviteUrl(detail.value?.inviteUrl))
const canCopyContent = computed(() => !!contentShareUrl.value)
const canCopyInvite = computed(() => !!inviteLink.value)
const articleHtml = computed(() => detail.value?.content?.format === 'html' && detail.value?.content?.html ? detail.value.content.html : '')
const composeHint = computed(() => detail.value?.type === 'image' ? describeComposeBlocker(detail.value) : '')
const contentShareBlocker = computed(() => detail.value && detail.value.type !== 'image' ? describeContentShareBlocker(detail.value) : '')
const shareHint = computed(() => {
  if (!detail.value || detail.value.type === 'image') return ''
  if (contentShareBlocker.value) return contentShareBlocker.value
  if (contentShareUrl.value) return '内容页链接给未登录用户查看图文或视频；邀请注册链接只用于注册，不要把邀请页当成内容页分享。'
  if (canUpload.value || canCreateShare.value) return '请先上传自己的二维码并生成内容页分享。没有内容页时不能用邀请注册页代替。'
  return ''
})
const saveButtonLabel = computed(() => {
  if (saving.value) return '正在保存…'
  if (generating.value) return '正在生成…'
  return '保存素材'
})
let id = '', epoch = 0, timer = null, active = true, jobId = '', attempts = 0, attemptKey = '', contentAttemptKey = '', polling = false
onLoad(options => { id = options.id || '' })
async function load() {
  if (!getSession()) return
  const current = ++epoch; status.value = 'loading'; error.value = ''; detail.value = null
  try {
    const result = await getMaterial(id)
    if (current !== epoch) return
    detail.value = result; resultImage.value = ''; jobStatus.value = ''; operationError.value = ''; status.value = 'ready'
    const typeLabel = materialTypes.find(item => item.id === result.type)?.label || '素材'
    uni.setNavigationBarTitle({ title: `${typeLabel}编辑` })
    if (result.type !== 'image') await backfillContentShare(current)
  } catch(reason) { if (current === epoch) { status.value = 'error'; error.value = reason.message || '素材加载失败' } }
}
async function backfillContentShare(current = epoch) {
  if (!id || !detail.value || detail.value.type === 'image') return
  try {
    const currentShare = await getCurrentContentShare(id)
    if (current !== epoch || !detail.value) return
    detail.value = { ...detail.value, shareUrl: currentShare.shareUrl, contentShareId: currentShare.shareId, qrImageUrl: currentShare.qrImageUrl || detail.value.qrImageUrl }
    if (currentShare.qrImageUrl) qrPreview.value = qrPreview.value || currentShare.qrImageUrl
  } catch (reason) {
    if (current !== epoch) return
    if (!isNotFoundError(reason)) operationError.value = reason.message || '查询内容页分享失败'
  }
}
async function chooseQr() {
  if (busy.value || !canUpload.value) return
  operationError.value = ''
  const current = epoch
  uploading.value = true
  try {
    const selected = await new Promise(resolve => uni.chooseImage({ count: 1, sourceType: ['album'], success: resolve, fail: () => resolve(null) }))
    if (!selected || current !== epoch) return
    const file = selected.tempFiles[0] || {}
    const result = await uploadMaterialQr({ path: file.path || selected.tempFilePaths[0], size: file.size, name: file.name || '', type: file.type || file.mimeType || '' })
    if (current !== epoch) return
    const previous = qrAssetId.value; qrAssetId.value = result.assetId; qrPreview.value = selected.tempFilePaths[0]; attemptKey = ''; jobId = ''; resultImage.value = ''; jobStatus.value = ''; contentAttemptKey = ''; if (previous && previous !== result.assetId) discardAsset(previous)
    if (detail.value && detail.value.type !== 'image') await generateContentShare()
  } catch(reason) { if(current === epoch) operationError.value = reason.message || '二维码上传失败' }
  finally { if (current === epoch) uploading.value = false }
}
async function savePoster() {
  if (busy.value || !canSavePoster.value || !qrAssetId.value) return
  const blocker = describeComposeBlocker(detail.value)
  if (blocker) { operationError.value = blocker; jobStatus.value = ''; return }
  operationError.value = ''
  if (resultImage.value) {
    await saveImage()
    return
  }
  await generateAndSave()
}
async function generateAndSave() {
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
      if (!job.downloadUrl) { generating.value = false; jobStatus.value = ''; operationError.value = '生成结果缺少可下载的图片，无法保存到相册'; jobId = ''; return }
      resultImage.value = job.downloadUrl; generating.value = false; jobStatus.value = '正在保存到相册…'; attemptKey = ''; jobId = ''
      await saveImage()
      return
    }
    if(job.status === 'failed') { generating.value = false; jobStatus.value = ''; operationError.value = job.message || '生成失败，请重试'; jobId = ''; attemptKey = ''; return }
    jobStatus.value = job.status === 'queued' ? '正在等待生成…' : '正在生成素材…'
    if(++attempts >= 40) { generating.value = false; operationError.value = '素材仍在生成，点击保存素材可继续查询'; return }
  } catch(reason) { if(current === epoch) { generating.value = false; jobStatus.value = ''; operationError.value = reason.message || '查询失败，请重试' } }
  finally {
    polling = false
    if (current === epoch && active && jobId && generating.value && attempts < 40) timer = setTimeout(poll, 1500)
  }
}
async function generateContentShare() {
  if (busy.value && !uploading.value) return
  if (!canCreateShare.value || !qrAssetId.value || !detail.value || detail.value.type === 'image') return
  const blocker = describeContentShareBlocker(detail.value)
  if (blocker) { operationError.value = blocker; return }
  const current = epoch
  creatingShare.value = true
  operationError.value = ''
  jobStatus.value = '正在生成内容页分享…'
  if (!contentAttemptKey) contentAttemptKey = `content-share-${Date.now()}-${Math.random().toString(36).slice(2)}`
  try {
    const result = await createContentShare(id, { qrAssetId: qrAssetId.value, idempotencyKey: contentAttemptKey })
    if (current !== epoch || !detail.value) return
    detail.value = { ...detail.value, shareUrl: result.shareUrl, contentShareId: result.shareId, qrImageUrl: result.qrImageUrl || detail.value.qrImageUrl }
    jobStatus.value = '已生成内容页分享'
  } catch (reason) {
    if (current === epoch) { jobStatus.value = ''; operationError.value = describeContentShareError(reason) }
  } finally {
    if (current === epoch) creatingShare.value = false
  }
}
function copyText(value, failMessage) {
  if (!value) return
  uni.setClipboardData({ data: value, fail: () => { operationError.value = failMessage } })
}
function copyContentLink() {
  const url = contentShareUrl.value
  if (!url) { operationError.value = '请先上传二维码并生成内容页分享，不能用邀请注册页代替'; return }
  copyText(url, '复制内容页链接失败，请重试')
}
function copyInviteLink() {
  const url = inviteLink.value
  if (!url) { operationError.value = '暂无邀请注册链接'; return }
  copyText(url, '复制邀请注册链接失败，请重试')
}
async function saveImage() {
  if (!resultImage.value) { operationError.value = '生成结果缺少可下载的图片，无法保存到相册'; jobStatus.value = ''; return }
  saving.value = true; operationError.value = ''; jobStatus.value = jobStatus.value || '正在保存到相册…'
  try {
    // #ifdef H5
    if (resultImage.value.startsWith('/')) { const anchor = document.createElement('a'); anchor.href = resultImage.value; anchor.download = `material-${id}.png`; anchor.click(); jobStatus.value = '已保存到相册'; return }
    // #endif
    const response = await new Promise((resolve,reject) => uni.downloadFile({ url: resultImage.value, success: resolve, fail: reject }))
    if(response.statusCode !== 200) throw new Error('图片下载失败')
    // #ifdef H5
    const anchor = document.createElement('a'); anchor.href = response.tempFilePath; anchor.download = `material-${id}.png`; anchor.click()
    // #endif
    // #ifndef H5
    await new Promise((resolve,reject) => uni.saveImageToPhotosAlbum({ filePath: response.tempFilePath, success: resolve, fail: reject }))
    // #endif
    jobStatus.value = '已保存到相册'
  } catch(reason) { jobStatus.value = ''; operationError.value = reason.message || '保存失败，请检查相册权限后重试' }
  finally { saving.value = false }
}
onShow(() => { active = true; if (jobId && generating.value) poll(); else if (!detail.value) load() })
onHide(() => { active = false; clearTimeout(timer) })
onUnload(() => { active = false; ++epoch; clearTimeout(timer) })
</script>
<style scoped>
.material-detail-page{min-height:100vh;max-width:750px;margin:auto;background:#272c47;color:#e4ebfa;padding:24rpx 24rpx calc(190rpx + env(safe-area-inset-bottom))}.editor-state{display:flex;flex-direction:column;gap:24rpx;padding:80rpx 24rpx;color:#a3b1cb;text-align:center}.editor-state button{padding:0 30rpx;margin:auto}.material-heading{font-size:30rpx;line-height:1.7;margin:0 4rpx 24rpx;overflow-wrap:anywhere}.poster-preview{width:100%;display:block;border-radius:20rpx}.video-preview{width:100%;height:900rpx;max-height:65vh;background:#10162b}.material-rich-body,.article-rich{background:#343a5b;border-radius:24rpx;padding:28rpx;min-height:380rpx}.job-status{text-align:center;font-size:24rpx;color:#71d5ff;margin:24rpx 0}.share-hint,.compose-hint,.share-url{display:block;text-align:center;font-size:24rpx;line-height:1.7;color:#a3b1cb;margin:24rpx 0 0;overflow-wrap:anywhere}.share-url{color:#9fd6ff}.qr-empty{color:#5c6788;font-size:24rpx}.compose-hint{color:#ffd39a}.operation-error{display:block;color:#ffa2b6;font-size:24rpx;line-height:1.7;margin:24rpx 0}.editor-footer{position:fixed;bottom:0;left:0;right:0;z-index:10;padding:20rpx 24rpx calc(24rpx + env(safe-area-inset-bottom));background:#272c47;display:flex;gap:20rpx;flex-wrap:wrap;justify-content:center}.editor-footer button{flex:1;min-width:240rpx;max-width:600rpx;font-size:28rpx;margin:0;padding:0 20rpx;line-height:80rpx}.qr-mask{position:fixed;inset:0;z-index:100;background:#000b;display:flex;align-items:center;justify-content:center;padding:60rpx}.qr-dialog{position:relative;width:100%;max-width:560rpx;background:#fff;border-radius:28rpx;padding:48rpx}.qr-image{width:100%;height:420rpx}
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
.article-copy,.article-html{display:block;margin:0 0 1em;color:#d5dced;font-size:.92em;line-height:1.7;text-align:center}
.article-rich{background:transparent;padding:0;min-height:0;margin-bottom:1em}
.article-qr{display:block;width:5.2em;height:5.2em;margin:.2em auto 0;padding:0;border-radius:.35em;background:#fff}
.article-qr-slot{display:flex;justify-content:center;margin:.8em 0 0}
.article-qr-image{width:5.2em;height:5.2em;border-radius:.35em;background:#fff}
.qr-dialog{display:flex;align-items:center;justify-content:center;background:#fff;border-radius:1.1em;padding:1.1em}
.qr-dialog :deep(.qr-wrap){width:14em;max-width:100%;margin:0}.qr-dialog :deep(.qr-code){width:14em;height:14em}
.qr-image{width:14em;height:14em;max-height:60vh}
</style>
