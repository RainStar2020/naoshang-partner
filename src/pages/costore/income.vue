<template><view class="business-page-shell feature-page"><BusinessPageHeader title="合店收益"/><BusinessReport ref="page" :page-query="query" module="costore" tool-id="income"/></view></template>
<script setup>
import {ref} from 'vue'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
import {onLoad} from '@dcloudio/uni-app'
import {useAuth} from '../../composables/useAuth'
import {useBusinessReturn} from '../../composables/useBusinessReturn'
import {useFreshOnShow} from '../../composables/useFreshOnShow'
import BusinessReport from '../../components/BusinessReport.vue'
useAuth();useBusinessReturn();const page=ref(null),query=ref(null)
onLoad(options=>{query.value=options})
useFreshOnShow(()=>{if(!query.value)return null;return opts=>page.value?.refresh?.(opts)})
</script>

<style>.business-page-shell{min-height:100vh;background:#272c47}.business-page-shell>.account-page{min-height:calc(100vh - 3.2em)}</style>
