<template>
  <view class="feedback-page">
    <view class="feedback-frame">
      <BusinessPageHeader title="意见反馈" fallback="/pages/profile/index" />
      <view v-if="loading" class="feedback-state">正在加载…</view>
      <view v-else-if="loadError" class="feedback-state"><text>{{ loadError }}</text><button @click="load">重试</button></view>
      <view v-else class="feedback-body">
        <view class="feedback-card">
          <view class="feedback-heading"><text>反馈内容</text><text>{{ length }}/500</text></view>
          <textarea class="feedback-text" :value="content" :maxlength="-1" :disabled="submitting" placeholder="请描述您遇到的问题～" @input="setContent" />
          <view class="feedback-images">
            <view v-for="(image, index) in images" :key="image.assetId" class="feedback-image">
              <image :src="image.previewUrl" mode="aspectFill" @click="preview(index)" />
              <button :disabled="busy" :aria-label="`移除图片${index + 1}`" @click="remove(index)"><image src="/static/common/icon-close-circle.png" mode="aspectFit" /></button>
            </view>
            <button v-if="images.length < maxImages" class="upload-image" :disabled="busy" @click="chooseImages"><image class="upload-icon" src="/static/common/icon-image.png" mode="aspectFit" /><text>{{ uploading ? '处理中…' : '上传' }}</text></button>
          </view>
        </view>
        <text v-if="error" class="feedback-error">{{ error }}</text>
        <button class="submit-feedback" :disabled="busy || !content.trim()" @click="submit">{{ submitting ? '提交中…' : '确认提交' }}</button>
      </view>
    </view>
  </view>
</template>
<script setup>
import { ref, computed } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { config } from '../../config'
import { useAuth } from '../../composables/useAuth'
import { getSupportConfig, uploadProfileImage, submitSupportFeedback } from '../../services/profile'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
useAuth()
const isMock = config.useMock, content = ref(''), images = ref([]), maxImages = ref(0), loading = ref(true), loadError = ref(''), error = ref(''), uploading = ref(false), submitting = ref(false)
const length = computed(() => Array.from(content.value).length), busy = computed(() => uploading.value || submitting.value)
let epoch = 0, attemptKey = ''
async function load() { const current = ++epoch; loading.value = true; loadError.value = ''; try { const result = await getSupportConfig(); if (current !== epoch) return; const limit = result.feedback?.maxImages; if (!Number.isInteger(limit) || limit < 0 || limit > 9) throw new Error('反馈图片配置暂不可用'); maxImages.value = limit } catch (reason) { if (current === epoch) loadError.value = reason.message } finally { if (current === epoch) loading.value = false } }
function setContent(event) { content.value = Array.from(event.detail.value).slice(0, 500).join(''); attemptKey = '' }
function remove(index) { if (busy.value) return; images.value.splice(index, 1); attemptKey = '' }
function preview(index) { uni.previewImage({ urls: images.value.map(item => item.previewUrl), current: index }) }
async function chooseImages() { if (busy.value) return; const current = epoch; uploading.value = true; error.value = ''; try { const selected = await new Promise(resolve => uni.chooseImage({ count: maxImages.value - images.value.length, sourceType: ['album'], success: resolve, fail: () => resolve(null) })); if (!selected || current !== epoch) return; for (let i = 0; i < selected.tempFilePaths.length && images.value.length < maxImages.value; i++) { const result = await uploadProfileImage({ path: selected.tempFilePaths[i], size: selected.tempFiles[i].size }, 'feedback'); if (current !== epoch) return; images.value.push(result); attemptKey = '' } } catch (reason) { if (current === epoch) error.value = reason.message || '图片上传失败' } finally { if (current === epoch) uploading.value = false } }
async function submit() { if (busy.value || !content.value.trim()) return; const current = epoch; submitting.value = true; error.value = ''; if (!attemptKey) attemptKey = `feedback-${Date.now()}-${Math.random().toString(36).slice(2)}`; try { const result = await submitSupportFeedback({ content: content.value, imageAssetIds: images.value.map(item => item.assetId), idempotencyKey: attemptKey }); if (current !== epoch) return; content.value = ''; images.value = []; attemptKey = ''; uni.showModal({ title: '提交成功', content: result.mockOnly ? '感谢您的反馈。' : '感谢您的反馈，我们会尽快处理。', showCancel: false }) } catch (reason) { if (current === epoch) error.value = reason.message || '提交失败，请重试' } finally { if (current === epoch) submitting.value = false } }
onLoad(load); onUnload(() => { ++epoch })
</script>
<style scoped>
.feedback-page, .feedback-frame, .feedback-body, .feedback-card, .feedback-state { display: flex; flex-direction: column; }
.feedback-page { min-height: 100vh; background: #272c47; color: #f3f6ff; font-size: clamp(14px, 3.73vw, 16px); }
.feedback-frame { width: min(750px, 100%); min-height: 100vh; margin: 0 auto; }
.feedback-state { padding: 2em 1em; text-align: center; color: #b7bdd2; }
.feedback-state button { margin-top: .8em; border: 0; border-radius: 999px; background: #4a516c; color: #fff; }
.feedback-body { padding: 1em .85em 2em; }
.feedback-card { padding: 1em .9em 1.1em; border-radius: .85em; background: #343a5b; }
.feedback-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: .8em; }
.feedback-heading > text:first-child { border-bottom: 2px solid #3aa0ff; font-size: 1em; font-weight: 600; line-height: 1.4; }
.feedback-heading > text:last-child { color: #97a5bf; font-size: .78em; }
.feedback-text { width: 100%; height: 9em; color: #e8effc; font-size: .9em; line-height: 1.8; }
.feedback-images { display: flex; flex-wrap: wrap; gap: .7em; margin-top: .8em; }
.feedback-image, .upload-image { position: relative; width: 4.6em; height: 4.6em; border-radius: .55em; }
.feedback-image > image { width: 100%; height: 100%; border-radius: .55em; }
.feedback-image button { position: absolute; top: -.35em; right: -.35em; margin: 0; padding: 0; background: none; line-height: 1; }
.feedback-image button image { width: 1.2em; height: 1.2em; }
.upload-image { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .3em; margin: 0; padding: 0; background: #464f70; color: #9ba9c4; font-size: .75em; line-height: 1.4; }
.upload-icon { width: 1.6em; height: 1.6em; }
.feedback-error { display: block; margin-top: .7em; color: #ffabbc; font-size: .82em; }
.submit-feedback { width: calc(100% - 2.4em); height: 2.8em; margin: 1.4em 1.2em 0; border: 0; border-radius: 999px; background: linear-gradient(100deg, #003eff, #009cff); color: #fff; font-size: .95em; }
.submit-feedback[disabled] { background: #3a4264; color: #9aa3bd; }
</style>
