<template><AgencyDashboard ref="page"/></template>
<script setup>
import {ref} from 'vue'
import {onShow} from '@dcloudio/uni-app'
import {useAuth} from '../../composables/useAuth'
import {useAppTabBar} from '../../composables/useAppTabBar'
import AgencyDashboard from '../../components/AgencyDashboard.vue'
useAuth();useAppTabBar();const page=ref(null)
onShow(()=>page.value?.refresh())
</script>
