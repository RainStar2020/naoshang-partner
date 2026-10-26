<template><PartnerToolPage ref="page" title="提现记录" kind="withdrawals" :query="query" /></template>
<script setup>
import PartnerToolPage from '../../components/PartnerToolPage.vue'
import { usePartnerToolPage } from '../../composables/usePartnerToolPage'
const { page, query } = usePartnerToolPage()
</script>
