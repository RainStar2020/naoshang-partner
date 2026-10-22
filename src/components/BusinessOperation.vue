<template><WholesaleOperation v-if="['quota-transfer','quota-purchase','upgrade','bind-store','withdraw'].includes(kind)" ref="page" :kind="kind" :page-query="pageQuery"/><BusinessGenericOperation v-else ref="page" :kind="kind" :page-query="pageQuery"/></template>
<script setup>
import {ref} from 'vue'
import WholesaleOperation from './WholesaleOperation.vue'
import BusinessGenericOperation from './BusinessGenericOperation.vue'
defineProps({kind:String,pageQuery:Object});const page=ref(null)
defineExpose({refresh:()=>page.value?.refresh()})
</script>
