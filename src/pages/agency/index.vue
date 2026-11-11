<template><AgencyDashboard ref="page"/></template>
<script setup>
import {ref} from 'vue'
import {useAuth} from '../../composables/useAuth'
import {useAppTabBar} from '../../composables/useAppTabBar'
import {useFreshOnShow} from '../../composables/useFreshOnShow'
import AgencyDashboard from '../../components/AgencyDashboard.vue'
useAuth();useAppTabBar();const page=ref(null)
useFreshOnShow(() => opts => page.value?.refresh?.(opts))
</script>
