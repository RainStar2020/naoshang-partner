<template>
  <view class="promo-article-page">
    <view v-if="status === 'loading'" class="page-state">正在加载图文…</view>
    <view v-else-if="status === 'error'" class="page-state" role="alert">
      <text>{{ error }}</text>
    </view>
    <template v-else-if="share">
      <view class="article-sheet">
        <view class="article-title">{{ share.title }}</view>
        <image v-if="share.coverUrl" class="article-cover" :src="share.coverUrl" mode="widthFix" />
        <view v-if="articleHtml" class="article-html"><rich-text :nodes="articleHtml" /></view>
        <view v-else-if="share.content?.nodes?.length" class="article-rich"><ManagedRichContent :content="share.content" /></view>
        <text v-else-if="share.summary" class="article-summary">{{ share.summary }}</text>
        <view v-if="showEndQr" class="article-qr-slot">
          <image class="article-qr-image" :src="share.qrImageUrl" mode="aspectFit" />
        </view>
      </view>
    </template>
  </view>
</template>
<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import ManagedRichContent from '../../../components/ManagedRichContent.vue'
import { getPublicPromoShare, shouldRenderArticleEndQr } from '../../../services/materials'

const status = ref('loading'), error = ref(''), share = ref(null)
const articleHtml = computed(() => share.value?.content?.format === 'html' && share.value?.content?.html ? share.value.content.html : '')
const showEndQr = computed(() => shouldRenderArticleEndQr(share.value))

function readShareId(options = {}) {
  const fromOptions = String(options.shareId || '').trim()
  if (fromOptions) return fromOptions
  // #ifdef H5
  try {
    const hash = window.location.hash || ''
    const query = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : window.location.search.replace(/^\?/, '')
    return String(new URLSearchParams(query).get('shareId') || '').trim()
  } catch {
    return ''
  }
  // #endif
  return ''
}

onLoad(async options => {
  const shareId = readShareId(options)
  status.value = 'loading'
  error.value = ''
  share.value = null
  if (!shareId) {
    status.value = 'error'
    error.value = '缺少分享编号'
    return
  }
  try {
    const result = await getPublicPromoShare(shareId)
    if (result.type !== 'article') {
      status.value = 'error'
      error.value = '该分享不是图文内容页'
      return
    }
    share.value = result
    if (result.title) uni.setNavigationBarTitle({ title: result.title })
    status.value = 'ready'
  } catch (reason) {
    status.value = 'error'
    error.value = reason.message || '该分享不存在或内容已下线'
  }
})
</script>
<style scoped>
.promo-article-page{min-height:100vh;max-width:750px;margin:auto;background:#272c47;color:#e4ebfa;padding:24rpx 24rpx calc(48rpx + env(safe-area-inset-bottom))}
.page-state{display:flex;flex-direction:column;gap:24rpx;padding:80rpx 24rpx;color:#a3b1cb;text-align:center;line-height:1.7}
.article-sheet{margin:0 .2em;padding:1em .9em 1.2em;border-radius:1.1em;background:#343a5b}
.article-title{font-size:36rpx;font-weight:600;line-height:1.6;margin:0 0 24rpx;overflow-wrap:anywhere}
.article-cover{display:block;width:100%;border-radius:.45em;margin-bottom:.8em}
.article-summary,.article-html{display:block;margin:0 0 1em;color:#d5dced;font-size:.92em;line-height:1.7}
.article-rich{background:transparent;padding:0;min-height:0;margin-bottom:1em}
.article-qr-slot{display:flex;justify-content:center;margin:1.2em 0 0}
.article-qr-image{width:5.2em;height:5.2em;border-radius:.35em;background:#fff}
</style>
