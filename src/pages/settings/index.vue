<template>
  <view class="settings-page">
    <view class="settings-frame">
      <BusinessPageHeader title="系统设置" fallback="/pages/profile/index" />
      <view class="settings-body">
        <view class="settings-card">
          <button v-for="item in entries" :key="item.label" @click="open(item.path)"><text>{{ item.label }}</text><image src="/static/common/icon-chevron-right.png" mode="aspectFit" /></button>
        </view>
      </view>
    </view>
    <view class="settings-footer"><button @click="confirming = true">退出登录</button></view>
    <view v-if="confirming" class="settings-mask" @click="confirming = false">
      <view class="logout-dialog" role="dialog" aria-label="退出登录" @click.stop>
        <text class="dialog-title">退出登录</text>
        <text class="dialog-copy">您确定要退出登录吗</text>
        <view class="dialog-actions">
          <button class="dialog-ok" @click="logout()">确定</button>
          <button @click="confirming = false">取消</button>
        </view>
      </view>
    </view>
  </view>
</template>
<script setup>
import { ref } from 'vue'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
import { useAuth } from '../../composables/useAuth'
import { logout } from '../../services/api'
useAuth()
const confirming = ref(false)
const entries = [
  { label: '个人信息', path: '/pages/settings/profile' },
  { label: '修改密码', path: '/pages/settings/change-password' },
  { label: '用户协议', path: '/pages/settings/agreement?type=user' },
  { label: '隐私政策', path: '/pages/settings/agreement?type=privacy' }
]
const open = path => uni.navigateTo({ url: path })
</script>
<style scoped>
.settings-page, .settings-frame, .settings-body, .settings-card, .logout-dialog { display: flex; flex-direction: column; }
.settings-page { min-height: 100vh; background: #272c47; color: #f3f6ff; font-size: clamp(14px, 3.73vw, 16px); }
.settings-frame { width: min(750px, 100%); min-height: 100vh; margin: 0 auto; }
.settings-body { padding: 1em .85em 7em; }
.settings-card { border-radius: .85em; background: #343a5b; overflow: hidden; }
.settings-card button { width: 100%; min-height: 3.5em; margin: 0; padding: 0 1em; border: 0; border-radius: 0; background: transparent; color: #f3f6ff; font-size: .95em; display: flex; align-items: center; justify-content: space-between; }
.settings-card button + button { border-top: 1px solid rgba(103, 112, 141, .28); }
.settings-card image { width: .85em; height: .85em; }
.settings-footer { position: fixed; left: 50%; bottom: 0; z-index: 5; width: min(750px, 100%); transform: translateX(-50%); padding: .8em 1.4em calc(.8em + env(safe-area-inset-bottom)); background: #272c47; box-sizing: border-box; }
.settings-footer button { width: 100%; height: 2.8em; border: 0; border-radius: 999px; background: #3a4264; color: #9aa3bd; font-size: .95em; }
.settings-mask { position: fixed; inset: 0; z-index: 30; display: flex; align-items: center; justify-content: center; padding: 1.5em; background: rgba(7, 10, 24, .62); box-sizing: border-box; }
.logout-dialog { width: min(18em, 100%); padding: 1.35em 1.1em 1.05em; border-radius: .85em; background: #343a5b; text-align: center; }
.dialog-title { display: block; font-size: 1.05em; font-weight: 700; }
.dialog-copy { display: block; margin-top: .7em; color: #c5cbe0; font-size: .9em; }
.dialog-actions { display: flex; gap: .7em; margin-top: 1.2em; }
.dialog-actions button { flex: 1; height: 2.4em; margin: 0; border: 0; border-radius: 999px; background: #4a516c; color: #fff; font-size: .9em; }
.dialog-ok { background: #2f78ff !important; }
</style>
