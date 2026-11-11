<template><BusinessDashboard ref="page" initial-module="costore"/></template>
<script setup>
import {ref} from 'vue'
import {useAuth} from '../../composables/useAuth'
import {useAppTabBar} from '../../composables/useAppTabBar'
import {useFreshOnShow} from '../../composables/useFreshOnShow'
import BusinessDashboard from '../../components/BusinessDashboard.vue'
useAuth();useAppTabBar();const page=ref(null)
useFreshOnShow(() => opts => page.value?.refresh?.(opts))
</script>
