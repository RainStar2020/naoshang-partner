<template><view class="shop-page"><BusinessPageHeader title="商品详情" fallback="/pages/selection/index"/><FeaturePageState :status="status" :error="error" @retry="load"/><template v-if="data"><image class="shop-cover" :src="data.coverUrl" mode="aspectFill"/><view class="shop-body"><view class="shop-title">{{data.title}}</view><text class="shop-muted">{{data.summary}}</text><ShopPrices :product="data"/><view class="shop-card"><view class="shop-title">详情介绍</view><ManagedRichContent :content="data.content"/></view></view><view class="shop-footer"><button class="shop-primary" style="width:100%" @click="showSpecs=true">立即购买</button></view><view v-if="showSpecs" class="shop-mask" @click.self="showSpecs=false"><view class="shop-sheet"><view class="shop-sheet-heading"><text class="shop-title">选择规格</text><button class="shop-close" aria-label="关闭规格" @click="showSpecs=false"><image src="/static/common/icon-close.png"/></button></view><view class="shop-product-line"><image :src="data.coverUrl" mode="aspectFill"/><view><text class="shop-price">¥{{money(sku?.amount)}}</text><view class="shop-muted">库存 {{sku?.stock||0}} 件</view><text>{{sku?.label}}</text></view></view><view class="shop-options"><button v-for="item in data.skus" :key="item.id" :class="{selected:skuId===item.id}" @click="choose(item)">{{item.label}}</button></view><view class="shop-row"><text>购买数量</text><view class="shop-quantity"><button :disabled="quantity<=1" @click="quantity--">−</button><text>{{quantity}}</text><button :disabled="quantity>=Math.min(sku?.stock||0,99)" @click="quantity++">+</button></view></view><button class="shop-primary" :disabled="!sku||!sku.stock" @click="checkout">确定</button></view></view></template></view></template>
<script setup>
import {ref,computed} from 'vue'
import {onLoad,onShow} from '@dcloudio/uni-app'
import {useAuth} from '../../composables/useAuth'
import {useAsyncPage} from '../../composables/useAsyncPage'
import {getProduct} from '../../services/commerce'
import {money} from '../../features/exclusive/format'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
import FeaturePageState from '../../components/FeaturePageState.vue'
import ManagedRichContent from '../../components/ManagedRichContent.vue'
import ShopPrices from '../../components/ShopPrices.vue'
useAuth();let id='';const showSpecs=ref(false),skuId=ref(''),quantity=ref(1),{data,status,error,load}=useAsyncPage(async()=>{const p=await getProduct(id);skuId.value=p.skus[0]?.id||'';return p},false),sku=computed(()=>data.value?.skus.find(x=>x.id===skuId.value))
function choose(item){skuId.value=item.id;quantity.value=1}
function checkout(){uni.navigateTo({url:`/pages/order/confirm?productId=${encodeURIComponent(id)}&skuId=${encodeURIComponent(skuId.value)}&quantity=${quantity.value}`})}
onLoad(q=>{id=q.id||''});onShow(()=>{const page=getCurrentPages().slice(-1)[0];id=id||page?.options?.id||page?.$page?.options?.id||'';showSpecs.value=false;quantity.value=1;load()})
</script><style>@import '../../styles/commerce.css';</style>
