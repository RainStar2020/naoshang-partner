<template><WholesaleReport v-if="module === 'wholesale'" ref="page" :tool-id="toolId" :page-query="pageQuery" :overlay="['share','promotion','superior'].includes(toolId)" @close="close"/><BusinessGenericReport v-else ref="page" :module="module" :tool-id="toolId" :page-query="pageQuery"/></template>
<script setup>
import {ref} from 'vue'
import WholesaleReport from './WholesaleReport.vue'
import BusinessGenericReport from './BusinessGenericReport.vue'
defineProps({module:String,toolId:String,pageQuery:Object})
const page=ref(null)
function close(){if(getCurrentPages().length>1)uni.navigateBack();else uni.switchTab({url:'/pages/partners/index'})}
defineExpose({refresh:()=>page.value?.refresh()})
</script>
