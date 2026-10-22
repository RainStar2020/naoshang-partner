<template><view class="business-page-shell feature-page"><BusinessPageHeader title="门店管理"/><BusinessStore ref="page" :page-query="query" /></view></template>
<script setup>
import {ref} from 'vue'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
import {onLoad,onShow} from '@dcloudio/uni-app'
import {useAuth} from '../../composables/useAuth'
import {useBusinessReturn} from '../../composables/useBusinessReturn'
import BusinessStore from '../../components/BusinessStore.vue'
useAuth();useBusinessReturn();const page=ref(null),query=ref(null)
onLoad(options=>{query.value=options});onShow(()=>{if(query.value)page.value?.refresh()})
</script>

<style>.business-page-shell{min-height:100vh;background:#272c47}.business-page-shell>.account-page{min-height:calc(100vh - 3.2em)}</style>
