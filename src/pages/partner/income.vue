<template><PartnerToolPage ref="page" title="合伙人管理收益" tool-id="income" :query="query" /></template>
<script setup>
import PartnerToolPage from '../../components/PartnerToolPage.vue'
import { usePartnerToolPage } from '../../composables/usePartnerToolPage'
const { page, query } = usePartnerToolPage()
</script>
