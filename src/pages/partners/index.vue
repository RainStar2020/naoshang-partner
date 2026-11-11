<template><BusinessDashboard ref="page" initial-module="wholesale"/></template>
<script setup>
import {ref} from 'vue'
import {onTabItemTap} from '@dcloudio/uni-app'
import {useAuth} from '../../composables/useAuth'
import {useAppTabBar} from '../../composables/useAppTabBar'
import {useFreshOnShow} from '../../composables/useFreshOnShow'
import BusinessDashboard from '../../components/BusinessDashboard.vue'
useAuth();useAppTabBar();const page=ref(null)
useFreshOnShow(() => opts => page.value?.refresh?.(opts))
// Tab tap should land on wholesale home; keep current module when returning from subpages.
onTabItemTap(()=>page.value?.enterWholesale?.())
</script>
