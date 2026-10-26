<template><PartnerToolPage ref="page" title="选择服务门店" kind="bind-store" :query="query" /></template>
<script setup>
import PartnerToolPage from '../../components/PartnerToolPage.vue'
import { usePartnerToolPage } from '../../composables/usePartnerToolPage'
const { page, query } = usePartnerToolPage()
</script>
