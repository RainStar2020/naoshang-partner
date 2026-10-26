<template><PartnerToolPage ref="page" tool-id="promotion" :query="query" /></template>
<script setup>
import PartnerToolPage from '../../components/PartnerToolPage.vue'
import { usePartnerToolPage } from '../../composables/usePartnerToolPage'
const { page, query } = usePartnerToolPage()
</script>
