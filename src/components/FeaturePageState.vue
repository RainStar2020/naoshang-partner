<template><view v-if="status !== 'ready'" class="account-state"><text>{{status === 'loading' ? '正在加载…' : error}}</text><button v-if="status === 'error'" class="secondary" @click="$emit('retry')">重试</button><text v-if="status === 'forbidden'">请切换具有该功能权限的身份后重试</text></view></template>
<script setup>defineProps({status:String,error:String});defineEmits(['retry'])</script>
