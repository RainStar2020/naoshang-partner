<template>
  <view class="shop-page column-page" @click="priceOpen = false">
    <view class="commerce-column">
      <BusinessPageHeader title="专栏详情" fallback="/pages/selection/index" />
      <FeaturePageState :status="status" :error="error" @retry="load" />
      <template v-if="data">
        <view class="column-cover">
          <image class="shop-cover" :src="data.product.coverUrl" mode="aspectFill" />
          <text v-if="data.coverBadge" class="cover-badge">{{ data.coverBadge }}</text>
          <text v-if="data.coverCount" class="cover-index">{{ data.coverIndex }}/{{ data.coverCount }}</text>
          <view v-if="priceOpen && detailTiers.length" class="detail-role-pop" role="tooltip" @click.stop>
            <view v-for="item in detailTiers" :key="item.label" class="detail-role-row" :class="{ current: item.current === true }">
              <text>{{ item.label }}</text>
              <text>{{ tierText(item) }}</text>
            </view>
          </view>
        </view>
        <view class="shop-body">
          <view class="shop-title">{{ data.product.title }}</view>
          <text class="column-summary">{{ data.product.summary }}</text>
          <ShopPrices :product="data.product" :expanded="priceOpen" :show-tooltip="false" @toggle="priceOpen = $event" />
          <view class="column-tabs">
            <button :class="{ selected: tab === 'detail' }" @click="tab = 'detail'">详情</button>
            <button :class="{ selected: tab === 'catalog' }" @click="tab = 'catalog'">目录</button>
          </view>
          <view v-if="tab === 'detail'" class="shop-card column-intro">
            <ManagedRichContent :content="data.product.content" />
          </view>
          <view v-else class="shop-card chapter-card">
            <button v-for="chapter in data.chapters" :key="chapter.id" class="chapter-row" @click="read(chapter)">
              <view class="chapter-copy">
                <text class="chapter-title">{{ chapter.title }}</text>
                <text class="chapter-meta">{{ chapterMeta(chapter) }}</text>
              </view>
              <image v-if="!data.unlocked" class="chapter-lock" src="/static/common/icon-lock.png" mode="aspectFit" />
            </button>
          </view>
        </view>
      </template>
    </view>
    <view v-if="data" class="shop-footer" :class="{ 'column-footer-single': data.unlocked }">
      <button v-if="!data.unlocked" class="shop-secondary" @click.stop="openActivate">立即激活</button>
      <button class="shop-primary" @click.stop="buy">购买激活码</button>
    </view>
    <view v-if="activateOpen" class="shop-mask activate-mask" @click="activateOpen = false">
      <view class="activate-dialog" role="dialog" aria-label="立即激活" @click.stop>
        <text class="activate-title">立即激活</text>
        <input v-model="activateCode" class="activate-input" placeholder="请输入激活码" maxlength="40" />
        <text v-if="actionError" class="shop-error">{{ actionError }}</text>
        <view class="activate-actions">
          <button class="shop-secondary" @click="activateOpen = false">取消</button>
          <button class="shop-primary" :disabled="saving" @click="submitActivate">确定</button>
        </view>
      </view>
    </view>
  </view>
</template>
<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useAuth } from '../../composables/useAuth'
import { useAsyncPage } from '../../composables/useAsyncPage'
import { getColumn, activateColumn, commerceRequestKey } from '../../services/commerce'
import { money } from '../../features/exclusive/format'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
import FeaturePageState from '../../components/FeaturePageState.vue'
import ManagedRichContent from '../../components/ManagedRichContent.vue'
import ShopPrices from '../../components/ShopPrices.vue'
useAuth()
let id = '', codeKey = '', lastCode = ''
const tab = ref('detail'), actionError = ref(''), priceOpen = ref(false), activateOpen = ref(false), activateCode = ref(''), saving = ref(false)
const { data, status, error, load } = useAsyncPage(() => getColumn(id), false)
const plainYuan = value => money(value).replace(/\.00$/, '')
const detailTiers = computed(() => {
  const product = data.value?.product
  if (!product || product.pricePresentation === 'standard-only') return []
  return product.rolePrices?.length ? product.rolePrices : (product.memberPrices || [])
})
function tierText(item) { return `${item.discountLabel ? item.discountLabel + '/' : ''}${plainYuan(item.amount)}` }
function chapterMeta(chapter) { return [chapter.typeLabel || '视频', chapter.progressLabel].filter(Boolean).join('  ') }
function buy() { uni.navigateTo({ url: `/pages/product/detail?id=${encodeURIComponent(id)}` }) }
function read(chapter) {
  if (!data.value.unlocked) { openActivate(); return }
  uni.navigateTo({ url: `/pages/learning/${chapter.type === 'video' ? 'video' : 'article'}?columnId=${encodeURIComponent(id)}&chapterId=${encodeURIComponent(chapter.id)}` })
}
function openActivate() {
  if (data.value?.unlocked || saving.value) return
  actionError.value = ''
  activateOpen.value = true
}
async function submitActivate() {
  if (saving.value || data.value?.unlocked) return
  saving.value = true
  actionError.value = ''
  try {
    if (lastCode !== activateCode.value) { lastCode = activateCode.value; codeKey = commerceRequestKey() }
    await activateColumn(id, activateCode.value, codeKey)
    activateOpen.value = false
    await load()
    uni.showToast({ title: '激活成功', icon: 'success' })
  } catch (reason) { actionError.value = reason.message }
  finally { saving.value = false }
}
onLoad(query => { id = query.id || '' })
onShow(load)
</script>
<style>@import '../../styles/commerce.css';</style>
<style scoped>
.column-page { background: #272c47; }
.commerce-column { max-width: 750px; margin: 0 auto; }
.column-cover { position: relative; }
.column-page .shop-cover { width: 100%; height: 62vw; max-height: 28em; display: block; background: #1c2238; }
.cover-badge, .cover-index { position: absolute; bottom: .7em; padding: .08em .55em; border-radius: .3em; background: rgba(12, 18, 40, .55); font-size: .78em; line-height: 1.5; }
.cover-badge { left: .7em; }
.cover-index { right: .7em; }
.detail-role-pop { position: absolute; right: .7em; bottom: .7em; width: max-content; min-width: 13em; max-width: calc(100% - 1.4em); padding: .35em; background: #0c2650; border: 1px solid #418cff; border-radius: .35em; z-index: 2; }
.detail-role-pop::after { content: ''; position: absolute; right: 1.4em; bottom: -.36em; width: .6em; height: .6em; background: #0c2650; border-right: 1px solid #418cff; border-bottom: 1px solid #418cff; transform: rotate(45deg); }
.detail-role-row { display: flex; align-items: center; justify-content: space-between; gap: .8em; padding: .48em .4em; color: rgba(255, 255, 255, .78); line-height: 1.35; white-space: nowrap; overflow-x: auto; }
.detail-role-row.current { background: #1b3b68; }
.detail-role-row text:last-child { color: #59b6ff; font-weight: 700; }
.column-page .shop-body { padding: 1em 1em 1.2em; }
.column-page .shop-title { font-size: 1.12em; }
.column-summary { display: block; margin: .35em 0 .9em; color: #b7c3dc; line-height: 1.65; }
.column-tabs { display: flex; gap: 1.5em; margin: 1.05em 0 .85em; }
.column-tabs button { margin: 0; padding: 0 0 .35em; background: none; color: #c5cadb; border-bottom: 2px solid transparent; border-radius: 0; line-height: 1.4; }
.column-tabs button.selected { color: #57adff; border-bottom-color: #57adff; }
.column-intro :deep(.managed-content) { color: #d5dced; font-size: 1em; line-height: 1.85; }
.chapter-card { padding: .2em 1em; }
.chapter-row { display: flex; align-items: center; gap: .7em; width: 100%; margin: 0; padding: .85em 0; background: none; text-align: left; border-radius: 0; }
.chapter-row + .chapter-row { border-top: 1px solid #454b6c; }
.chapter-copy { flex: 1; min-width: 0; }
.chapter-title { display: block; line-height: 1.45; overflow-wrap: anywhere; }
.chapter-meta { display: block; margin-top: .25em; color: #c5cadb; font-size: .86em; line-height: 1.45; }
.chapter-lock { width: 1.15em; height: 1.15em; flex-shrink: 0; filter: brightness(0) invert(1); opacity: .85; }
.column-page .shop-footer { width: min(750px, 100%); left: 50%; right: auto; transform: translateX(-50%); gap: .7em; background: #272c47; padding-left: 1.15em; padding-right: 1.15em; }
.column-page .shop-footer .shop-secondary, .column-page .shop-footer .shop-primary { flex: 1; }
.column-footer-single .shop-primary { width: 100%; }
.activate-mask { align-items: center; justify-content: center; }
.activate-dialog { width: min(20em, calc(100% - 2.4em)); padding: 1.2em 1.1em 1em; background: #353a59; border-radius: 1em; }
.activate-title { display: block; text-align: center; font-weight: 600; margin-bottom: .9em; }
.activate-input { width: 100%; margin: 0; padding: .65em .8em; border-radius: .55em; background: #272c47; color: #fff; font-size: 1em; }
.activate-actions { display: flex; gap: .7em; margin-top: 1em; }
.activate-actions button { flex: 1; }
</style>
