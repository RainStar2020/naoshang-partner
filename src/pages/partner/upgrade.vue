<template><PartnerToolPage ref="page" title="合伙人升级" kind="upgrade" :query="query" /></template>
<script setup>
import PartnerToolPage from '../../components/PartnerToolPage.vue'
import { usePartnerToolPage } from '../../composables/usePartnerToolPage'
const { page, query } = usePartnerToolPage()
</script>
