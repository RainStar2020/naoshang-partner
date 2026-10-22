<template><view class="shop-price-grid"><view><text class="shop-muted">标准价</text><text class="shop-accent">{{money(product.standardAmount)}}</text></view><view><text class="shop-muted">活动价</text><text class="shop-accent">{{money(product.activityAmount)}}</text></view><button @click.stop="show"><text class="shop-muted">会员价</text><text class="shop-accent">查看详情</text></button></view></template>
<script setup>
import {money} from '../features/exclusive/format'
const props=defineProps({product:Object})
function show(){uni.showModal({title:'会员价格',content:props.product.memberPrices.map(x=>`${x.label}　¥${money(x.amount)}`).join('\n'),showCancel:false})}
</script>
