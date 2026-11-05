<template><QuotaTransfers ref="page" :query="query" /></template>
<script setup>
import QuotaTransfers from '../../components/QuotaTransfers.vue'
import { usePartnerToolPage } from '../../composables/usePartnerToolPage'
const { page, query } = usePartnerToolPage()
</script>
