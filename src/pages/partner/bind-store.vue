<template><PartnerToolPage ref="page" :title="query.targetAccountId ? '为下级绑定门店' : '我的门店'" kind="bind-store" :query="query" /></template>
<script setup>
import PartnerToolPage from '../../components/PartnerToolPage.vue'
import { usePartnerToolPage } from '../../composables/usePartnerToolPage'
const { page, query } = usePartnerToolPage()
</script>
