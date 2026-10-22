<template><view class="account-page"><view class="account-card"><button v-for="item in entries" :key="item.label" class="setting-row" @click="open(item.path)"><text>{{ item.label }}</text><image class="account-chevron" src="/static/common/icon-chevron-right.png" mode="aspectFit" /></button></view><view class="account-bottom"><button class="secondary" @click="confirmLogout">退出登录</button></view></view></template>
<script setup>
import { useAuth } from '../../composables/useAuth'
import { logout } from '../../services/api'
useAuth()
const entries = [{ label: '个人信息', path: '/pages/settings/profile' }, { label: '修改密码', path: '/pages/settings/change-password' }, { label: '用户协议', path: '/pages/settings/agreement?type=user' }, { label: '隐私政策', path: '/pages/settings/agreement?type=privacy' }]
function open(path) { uni.navigateTo({ url: path }) }
function confirmLogout() { uni.showModal({ title: '退出登录', content: '您确定要退出登录吗', confirmText: '确定', cancelText: '取消', success: result => { if(result.confirm) logout() } }) }
</script>
<style>@import '../../styles/account.css';</style>
<style scoped>.setting-row{display:flex;align-items:center;justify-content:space-between;gap:20rpx;width:100%;padding:30rpx 0;margin:0;background:none;color:#fff;border-radius:0;border-bottom:1rpx solid #67708d55;font-size:29rpx;line-height:1.8;text-align:left}.setting-row:last-child{border-bottom:0}</style>
