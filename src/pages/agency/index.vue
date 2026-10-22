<template><BusinessDashboard ref="page" initial-module="agency"/></template>
<script setup>
import {ref} from 'vue'
import {onShow} from '@dcloudio/uni-app'
import {useAuth} from '../../composables/useAuth'
import {useAppTabBar} from '../../composables/useAppTabBar'
import BusinessDashboard from '../../components/BusinessDashboard.vue'
useAuth();useAppTabBar();const page=ref(null)
onShow(()=>page.value?.refresh())
</script>
