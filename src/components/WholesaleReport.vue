<template>
 <view class="wholesale-ui" :class="{'wh-overlay':overlay,'wh-promotion-overlay':overlay && toolId==='promotion'}" @click.self="overlay && emit('close')">
  <view :class="overlay ? ['wh-dialog',`wh-dialog-${toolId}`] : 'wh-body'">
   <view v-if="overlay" class="wh-dialog-head">{{titles[toolId]}}<button role="button" class="wh-close" aria-label="关闭弹窗" @click="emit('close')"><image src="/static/common/icon-close.png" mode="aspectFit"/></button></view>
   <FeaturePageState :status="status" :error="error" @retry="load"/>
   <template v-if="status==='ready' && report">
    <template v-if="toolId==='superior'">
     <template v-if="report.superior"><view class="wh-person wh-card"><view class="wh-avatar">{{report.superior.name?.slice(0,1)}}</view><view><view>{{report.superior.name}} <text class="wh-tag">{{report.superior.levelLabel || '合伙人'}}</text></view><view class="wh-muted">联系方式：{{report.superior.phone || '—'}} <button v-if="report.superior.phone" class="wh-link" @click="copy(report.superior.phone)">复制</button></view></view></view></template>
     <template v-else><view class="wh-section-heading wh-center">绑定邀请人</view><input v-model="inviteCode" class="wh-input" placeholder="请输入邀请码" :disabled="binding" :maxlength="32"/><text v-if="bindError" class="wh-error">{{bindError}}</text><view class="wh-confirm"><button class="wh-link" :disabled="binding || !inviteCode.trim()" @click="bind">{{binding?'绑定中…':'确定'}}</button><button class="wh-link" @click="overlay ? emit('close') : back()">取消</button></view></template>
    </template>
    <template v-else-if="toolId==='share'">
     <view class="wh-share-card"><view class="wh-share-head"><text>分享码</text><button class="wh-invite-code" @click="copy(report.inviteCode)">{{report.inviteCode}} <image src="/static/common/icon-copy.png" mode="aspectFit"/></button></view><view class="wh-share-body"><image v-if="report.qrUrl" :src="report.qrUrl" mode="aspectFit" class="wh-share-qr"/><BusinessQrCode v-else-if="isMock && report.localPayload" ref="qr" :value="report.localPayload" :show-save="false" :poster-title="report.inviteCode"/><EmptyState v-else text="暂无分享码"/><text>扫码或注册填写分享码即可成功绑定</text></view></view>
     <button v-if="report.qrUrl || report.localPayload" class="wh-primary wh-pill wh-share-save" @click="saveShare">保存图片</button><button v-if="overlay" role="button" class="wh-share-close" aria-label="关闭分享码" @click="emit('close')"><image src="/static/common/icon-close-circle.png" mode="aspectFit"/></button>
    </template>
    <template v-else-if="toolId==='promotion' && report.promotion">
     <view class="wh-upgrade-compare"><view><text>升级前</text><view>{{report.promotion.beforeName}}</view><text>{{report.promotion.beforeQuota}}项会员权益</text></view><view><text>升级后</text><view>{{report.promotion.afterName}}</view><text>{{report.promotion.afterQuota}}项会员权益</text></view></view>
     <view class="wh-tabs wh-gold-tabs"><button :class="{active:promotionTab==='difference'}" @click="promotionTab='difference'">补差价直接晋升</button><button :class="{active:promotionTab==='task'}" @click="promotionTab='task'">推广达标免费晋升</button></view>
     <template v-if="promotionTab==='difference'"><view class="wh-promotion-note">您当前是{{report.promotion.beforeName}}，可通过补差价升级，{{report.promotion.afterName}}标准价¥{{money(report.promotion.standardAmount)}}，需补差价¥{{money(report.promotion.differenceAmount)}}</view><view class="wh-price-lines"><view><text>已缴纳合伙人费用</text><text>¥{{money(report.promotion.paidAmount)}}</text></view><view><text>目标等级标准价</text><text>¥{{money(report.promotion.standardAmount)}}</text></view><view><text>升级需补差价</text><text>¥{{money(report.promotion.differenceAmount)}}</text></view></view></template>
     <template v-else><view class="wh-promotion-note">{{report.promotion.taskDescription}}，任务将于{{date(report.promotion.validUntil).slice(0,10)}}截止</view><view class="wh-promotion-progress"><view>VIP推广进度<view>{{report.promotion.progress}}/{{report.promotion.target}}</view></view><view>任务状态<view>{{report.promotion.statusLabel}}</view></view></view></template>
    </template>
    <template v-else-if="toolId==='team'">
     <view v-for="person in items" :key="person.id" class="wh-card wh-team-card">
      <view class="wh-row"><view class="wh-person"><image v-if="person.avatarUrl" :src="person.avatarUrl" class="wh-avatar" mode="aspectFill"/><view v-else class="wh-avatar">{{person.name?.slice(0,1)}}</view><view>{{person.name}}</view></view><text class="wh-muted">{{date(person.joinedAt).slice(0,10)}}加入</text></view>
      <view class="wh-team-tags"><text class="wh-tag">{{person.levelLabel}}</text><text>ID　{{person.displayId}}</text><text>手机号　{{person.phone || '—'}}</text></view>
      <view v-if="person.storeId" class="wh-team-store">门店　{{person.storeName}}</view>
      <view v-if="person.performance?.length" class="wh-stats-grid"><view class="wh-row wh-muted"><text>业绩统计</text><text>剩余<text class="wh-blue">{{person.quotaRemaining}}个</text>VIP名额</text></view><view class="wh-metrics"><view v-for="metric in person.performance" :key="metric.label"><text>{{metric.label}}</text><view>{{format(metric.value,metric.kind)}}</view></view></view></view>
      <view class="wh-row wh-team-actions"><button v-if="!person.storeId && can('bind-store')" class="wh-primary wh-pill" @click="operation('bind-store',person.id)">绑定门店</button><template v-else><button v-if="person.performance?.length && can('quota-transfer')" class="wh-pill wh-outline" @click="operation('quota-transfer',person.id)">划拨名额</button><button v-if="can('upgrade')" class="wh-primary wh-pill" @click="operation('upgrade',person.id)">设置等级</button></template></view>
     </view>
    </template>
    <template v-else-if="toolId==='quota-ledger'">
     <view class="wh-card wh-stock-summary"><view class="wh-split"><view><text>剩余标准VIP</text><view>{{report.standardRemaining ?? '—'}}个</view></view><view><text>剩余活动VIP</text><view>{{report.activityRemaining ?? '—'}}个</view></view></view><view class="wh-row wh-stock-buttons"><button class="wh-secondary wh-pill" @click="open('quota-batches')">活动VIP明细</button><button v-if="can('quota-purchase')" class="wh-primary wh-pill" @click="operation('quota-purchase')">立即购买</button></view></view>
     <view v-for="item in items" :key="item.id" class="wh-card wh-row"><view><view>{{item.title}}</view><text class="wh-muted">时间：{{date(item.createdAt)}}</text></view><text class="wh-blue wh-title">+{{item.quantity}}</text></view>
    </template>
    <template v-else-if="toolId==='quota-batches'"><view v-for="item in items" :key="item.id" class="wh-card"><view>{{item.title}}</view><text class="wh-muted">{{date(item.grantedAt)}}充值 / {{date(item.expiresAt).slice(0,10)}}到期</text><view class="wh-split wh-three"><view><text>有效期</text>{{item.validityLabel || '—'}}</view><view><text>已使用</text>{{item.used ?? '—'}}个</view><view><text>当前剩余</text>{{item.remaining ?? '—'}}个</view></view><view v-if="item.reserved" class="wh-muted">待支付预留：{{item.reserved}}个</view></view></template>
    <template v-else-if="toolId==='quota-transfers'"><view v-for="item in items" :key="item.id" class="wh-card"><view class="wh-row"><text>{{item.title}}</text><text class="wh-blue wh-title">{{item.quantity}}</text></view><text class="wh-muted">时间：{{date(item.createdAt)}}　下级ID：{{item.targetDisplayId || '—'}}</text><view class="wh-muted">下级等级：{{item.targetLevel || '—'}}　{{item.targetName}}</view></view></template>
    <template v-else-if="toolId==='experience'">
     <view class="wh-experience-summary wh-muted">累计业务推广{{report.promotionExperience ?? '—'}}经验值、购买产品{{report.productExperience ?? '—'}}经验值</view><view class="wh-tabs"><button :class="{active:filter!=='products'}" @click="changeFilter('promotion')">业务推广</button><button :class="{active:filter==='products'}" @click="changeFilter('products')">购买产品</button></view>
     <view v-for="item in items" :key="item.id" class="wh-card"><view class="wh-row"><view><text class="wh-muted">{{item.name}}<text v-if="item.phone">/{{item.phone}}</text></text><view>{{item.title}}</view><text class="wh-muted">{{date(item.createdAt)}}</text></view><view class="wh-center"><view>+{{item.amount}}</view><text class="wh-tag">经验值</text></view></view><view v-if="item.initialLevel" class="wh-split"><view><text>初始身份</text>{{item.initialLevel}}</view><view><text>消耗VIP名额</text>{{item.quotaUsed}}个</view></view></view>
    </template>
    <template v-else-if="toolId==='global-awards'">
     <view class="wh-global-summary"><picker mode="date" fields="month" :value="month" @change="changeMonth"><view class="wh-center">{{month}}全球奖 <image class="wh-month-arrow" src="/static/common/icon-chevron-right.png" mode="aspectFit"/></view></picker><view class="wh-muted wh-center">{{report.eligibilityLabel}}</view><view class="wh-metrics"><view v-for="metric in report.metrics" :key="metric.label"><text>{{metric.label}}</text><view>{{format(metric.value,metric.kind)}}</view></view></view><view class="wh-split wh-summary-four"><view v-for="metric in report.summary || []" :key="metric.label"><text>{{metric.label}}</text><view>{{format(metric.value,metric.kind)}}</view></view></view></view><scroll-view scroll-x class="wh-table-scroll"><view class="wh-table"><view class="wh-tr head"><text v-for="column in report.columns" :key="column.key" class="wh-td">{{column.label}}</text></view><view v-for="item in items" :key="item.id" class="wh-tr"><text v-for="column in report.columns" :key="column.key" class="wh-td">{{format(item[column.key],column.kind)}}</text></view></view></scroll-view>
    </template>
    <template v-else-if="toolId==='income'">
     <view class="wh-income-top"><view class="wh-row"><view><text class="wh-muted">可提现金额</text><view class="wh-title">¥{{money(report.available)}}</view></view><view class="wh-row"><button v-if="canWallet('read')" class="wh-secondary wh-pill" @click="wallet('withdrawals')">提现记录</button><button v-if="canWallet('withdraw')" class="wh-primary wh-pill" @click="wallet('withdraw-apply')">申请提现</button></view></view><view class="wh-stats-grid wh-metrics"><view v-for="metric in report.metrics" :key="metric.label"><text>{{metric.label}}</text><view>{{format(metric.value,metric.kind)}}</view></view></view></view><view class="wh-section-heading">收益明细</view>
     <view v-for="item in items" :key="item.id" class="wh-card"><view class="wh-row"><view><text class="wh-muted">{{item.sourceName}}</text><view>{{item.title}}</view><text class="wh-muted">{{date(item.createdAt)}}</text></view><view class="wh-center"><view>{{item.amount>0?'+':''}}{{money(item.amount)}}</view><text class="wh-tag">{{item.channel || '收益'}}</text></view></view><view v-if="item.details?.length" class="wh-split"><view v-for="detail in item.details" :key="detail.label"><text>{{detail.label}}</text><view>{{format(detail.value,detail.kind)}}</view></view></view><button class="wh-link" @click="incomeDetail(item.id)">查看详情</button></view>
    </template>
    <EmptyState v-if="!items.length && !['promotion','superior','share','global-awards'].includes(toolId)" text="暂无记录"/>
    <button v-if="hasMore" class="wh-secondary wh-pill" :disabled="loadingMore" @click="more">{{loadingMore?'加载中…':'加载更多'}}</button><text v-if="moreError" class="wh-error">{{moreError}}</text>
   </template>
  </view>
 </view>
</template>
<script setup>
import {ref,watch,onUnmounted} from 'vue'
import {config} from '../config'
import {businessPreview} from '../features/business/catalog'
import {money,percent} from '../features/exclusive/format'
import {businessDateLabel as date} from '../features/business/format'
import {getBusinessContext,getBusinessReport,bindBusinessSuperior} from '../services/business'
import {useAsyncPage} from '../composables/useAsyncPage'
import BusinessQrCode from './BusinessQrCode.vue'
import FeaturePageState from './FeaturePageState.vue'
import EmptyState from './EmptyState.vue'
const props=defineProps({toolId:String,pageQuery:Object,overlay:Boolean}),emit=defineEmits(['close'])
const context=ref(null),items=ref([]),hasMore=ref(false),loadingMore=ref(false),moreError=ref(''),filter=ref('promotion'),promotionTab=ref('difference'),inviteCode=ref(''),binding=ref(false),bindError=ref(''),qr=ref(null),isMock=config.useMock
const titles={superior:'上级信息',promotion:'升级合伙人',share:'分享码'},month=ref(new Date().toISOString().slice(0,7));let cursor=null,epoch=0
const {data:report,status,error,load}=useAsyncPage(async()=>{const ctx=await getBusinessContext('wholesale',props.pageQuery?.contextId);context.value=ctx;return getBusinessReport('wholesale',props.toolId,ctx.id,{month:month.value,filter:filter.value})},false)
watch(()=>props.pageQuery,q=>{if(q)load()},{immediate:true})
watch(status,s=>{if(s==='loading'){++epoch;loadingMore.value=false;moreError.value=''}})
watch(report,value=>{if(value){items.value=value.items;cursor=value.nextCursor;hasMore.value=value.hasMore}})
const format=(value,kind)=>value==null?'—':kind==='money'?money(value):kind==='percent'?percent(value):value
const can=id=>businessPreview(config)||context.value?.capabilities?.includes(`wholesale:${id}`)
const canWallet=id=>businessPreview(config)||context.value?.capabilities?.includes(`wallet:${id}`)
function open(id,targetAccountId){uni.navigateTo({url:`/pages/partner/${id}?contextId=${encodeURIComponent(context.value.id)}${targetAccountId?`&targetAccountId=${encodeURIComponent(targetAccountId)}`:''}`})}
function operation(id,target){open(id,target)}
function wallet(page){uni.navigateTo({url:`/pages/wallet/${page}?contextId=${encodeURIComponent(context.value.id)}`})}
function incomeDetail(id){uni.navigateTo({url:`/pages/income/detail?contextId=${encodeURIComponent(context.value.id)}&id=${encodeURIComponent(id)}`})}
function copy(value){if(value)uni.setClipboardData({data:value})}
function back(){if(getCurrentPages().length>1)uni.navigateBack();else uni.switchTab({url:'/pages/partners/index'})}
function changeFilter(value){if(filter.value!==value){filter.value=value;load()}}
function changeMonth(e){month.value=e.detail.value;load()}
async function bind(){if(binding.value)return;binding.value=true;bindError.value='';try{await bindBusinessSuperior(context.value.id,inviteCode.value.trim());await load()}catch(e){bindError.value=e.message}finally{binding.value=false}}
async function saveShare(){
 if(isMock && report.value.localPayload){qr.value?.save();return}
 try{const url=report.value.posterUrl || report.value.qrUrl;if(!url)return;const response=await new Promise((resolve,reject)=>uni.downloadFile({url,success:resolve,fail:reject}));if(response.statusCode!==200)throw new Error('图片下载失败')
 // #ifdef H5
 const anchor=document.createElement('a');anchor.href=response.tempFilePath;anchor.download='share-code.png';anchor.click()
 // #endif
 // #ifndef H5
 await new Promise((resolve,reject)=>uni.saveImageToPhotosAlbum({filePath:response.tempFilePath,success:resolve,fail:reject}))
 // #endif
 }catch(e){uni.showToast({title:e.message || '保存失败，请检查相册权限',icon:'none'})}
}
async function more(){if(loadingMore.value||!hasMore.value)return;const current=epoch;loadingMore.value=true;moreError.value='';try{const next=await getBusinessReport('wholesale',props.toolId,context.value.id,{cursor,month:month.value,filter:filter.value});if(current===epoch){items.value=[...new Map([...items.value,...next.items].map(x=>[x.id,x])).values()];cursor=next.nextCursor;hasMore.value=next.hasMore}}catch(e){if(current===epoch)moreError.value=e.message}finally{if(current===epoch)loadingMore.value=false}}
onUnmounted(()=>{++epoch});defineExpose({refresh:load})
</script>
<style>@import '../styles/wholesale.css';</style>
<style scoped>
.wh-center{text-align:center}.wh-month-arrow{width:1em;height:1em;transform:rotate(90deg);vertical-align:middle}.wh-share-close{background:none;line-height:1;margin:1em auto 0;padding:0;width:2em}.wh-share-close image{width:2em;height:2em}.wh-team-tags{display:flex;align-items:center;flex-wrap:wrap;gap:.4em;margin:.6em 0;font-size:.82em}.wh-team-tags>text:not(.wh-tag),.wh-team-store{background:#464c6b;border-radius:2em;padding:0 .6em;color:#c3c8dc;font-size:.8em}.wh-team-store{margin:.5em 0}.wh-team-actions{justify-content:flex-end;margin-top:1em}.wh-outline{background:#09264c;border:1rpx solid #55adff;color:#55adff}.wh-team-card .wh-avatar{width:2.5em;height:2.5em}.wh-three{grid-template-columns:repeat(3,minmax(0,1fr))}.wh-stock-summary .wh-split{margin:0;background:none}.wh-stock-summary .wh-split>view>view{font-size:1.3em}.wh-stock-buttons{justify-content:center;margin-top:.7em}.wh-experience-summary{background:#414662;padding:.5em;margin:-.9em -.9em .75em;text-align:center}.wh-summary-four{grid-template-columns:repeat(4,minmax(0,1fr));margin:.5em}.wh-global-summary{margin:0 -.75em 1em;background:#353a59;padding:.8em .5em}.wh-global-summary .wh-center{margin-bottom:.5em}.wh-income-top{margin:-.75em -.75em .8em;background:#353a59;padding:1em .75em}.wh-income-top .wh-pill{font-size:.75em!important}.wh-share-card{border-radius:1.1em;background:linear-gradient(#9bb7ff,#fff 50%);overflow:hidden;color:#fff}.wh-share-head{display:flex;justify-content:space-between;align-items:center;gap:.5em;background:linear-gradient(110deg,#7476fc,#3a95ff);padding:1.5em 1em;font-size:1.1em;font-weight:600}.wh-invite-code{display:flex;align-items:center;gap:.25em;background:white;color:#6a8fef;font-size:.7em;padding:.2em .7em;margin:0;border-radius:3em;line-height:1.6}.wh-invite-code image{width:1em;height:1em}.wh-share-body{padding:1.3em 1em 2em;border-radius:1em;border-top:1rpx solid #fff;text-align:center}.wh-share-body>text{color:#909090;font-size:.8em}.wh-share-body :deep(.qr-wrap){margin:.5em auto 1em;max-width:13em}.wh-share-qr{width:13em;height:13em;max-width:100%;display:block;margin:auto}.wh-share-save{display:block;margin:1.3em auto 0!important;width:55%}.wh-dialog-share{padding:0;background:transparent;overflow:visible;max-width:22em}.wh-dialog-share>.wh-dialog-head{display:none}.wh-dialog-share::after{content:none}.wh-promotion-overlay{align-items:flex-end;padding:0}.wh-dialog-promotion{background:linear-gradient(#27201d,#1c1a18);border-radius:1.5em 1.5em 0 0;max-width:750px;padding:1.2em 1.5em calc(1.5em + env(safe-area-inset-bottom));color:#f0d6b9}.wh-upgrade-compare{display:grid;grid-template-columns:1fr 1.1fr;align-items:center;margin:1.2em 0 .8em}.wh-upgrade-compare>view{border-radius:1em;background:linear-gradient(110deg,#ffedd4,#ffbd8c);color:#a8543c;text-align:center;padding:.5em .3em;font-size:.85em}.wh-upgrade-compare>view>view{font-size:1.3em;font-weight:600;margin:1em 0}.wh-upgrade-compare>view:last-child{border:1rpx solid #eccba9;background:#26211d;color:#f4cda6;min-height:8em;box-shadow:-.2em 0 .8em #eab59455}.wh-gold-tabs button{font-size:.75em}.wh-gold-tabs.wh-gold-tabs button.active{color:#5c371b;background:linear-gradient(100deg,#ffe6c2,#edb789);box-shadow:none!important;background:linear-gradient(100deg,#ffe6c2,#edb789)!important;color:#5c371b!important}.wh-promotion-note{border:1rpx solid #c8ae96;border-radius:.5em;padding:.7em;font-size:.82em;line-height:1.7;margin:1em 0}.wh-price-lines{background:#59534e;border-radius:.4em;padding:.4em .8em;font-size:.85em}.wh-price-lines>view{display:flex;justify-content:space-between;gap:1em;padding:.6em 0;border-bottom:1rpx solid #aaa4}.wh-price-lines>view:last-child{border:0}.wh-promotion-progress{display:flex;justify-content:space-around;text-align:center;font-size:.85em}.wh-promotion-progress>view>view{font-size:1.7em;font-weight:600;margin:.4em}.wh-dialog-superior>.wh-dialog-head{display:none}
</style>
