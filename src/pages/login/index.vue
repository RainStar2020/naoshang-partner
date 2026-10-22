<template>
  <AuthLayout>
    <template #brand>
      <image class="brand-logo" src="/static/logo.png" mode="aspectFit" />
    </template>
      <view class="login-form">
        <GradientInput v-model="phone" icon="/static/login/icon-phone.png" type="number" :maxlength="11" placeholder="请输入手机号" />
        <view class="password-field">
          <GradientInput v-model="password" icon="/static/login/icon-password.png" :password="true" :maxlength="32" placeholder="请输入密码" @confirm="!loading && submit()">
            <template #suffix><text class="forgot" @click="uni.navigateTo({ url: '/pages/forgot-password/index' })">忘记密码</text></template>
          </GradientInput>
        </view>
        <view class="agreement">
          <view class="check" :class="{ checked: agreed }" role="checkbox" :aria-checked="agreed" aria-label="同意用户协议和隐私政策" @click="agreed = !agreed">
            <image v-if="agreed" src="/static/login/icon-checked.png" mode="aspectFit" />
          </view>
          <view>请阅读并同意 <text @click="showPolicy('用户协议')">《用户协议》</text> 和 <text @click="showPolicy('隐私政策')">《隐私政策》</text></view>
        </view>
        <button class="primary login-button" :loading="loading" :disabled="loading" @click="submit">登录</button>
        <button class="secondary register-button" @click="openRegister">新用户注册</button>
      </view>
    <template #footer>
      <view class="third-party">
        <view class="divider"><view /><text>使用第三方账号登录</text><view /></view>
        <view class="wechat-login" @click="wechatLogin">
          <image src="/static/common/icon-weixin.png" mode="aspectFit" />
          <text>微信</text>
        </view>
      </view>
    </template>
  </AuthLayout>
</template>
<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import GradientInput from '../../components/GradientInput.vue'
import AuthLayout from '../../components/AuthLayout.vue'
import {consumeLoginReturn} from '../../services/login-return'
import { login } from '../../services/api'
import { captureInvitation } from '../../services/invitation'
import { beginWechat, finishWechatCallback } from '../../services/auth'
const phone = ref(''), password = ref(''), agreed = ref(false), loading = ref(false)
const toast = title => uni.showToast({ title, icon: 'none' })
const authorizing = ref(false)
function openRegister() { uni.navigateTo({ url: '/pages/register/index' }) }
async function wechatLogin() {
  if (authorizing.value) return
  authorizing.value = true
  try { if (await beginWechat()) uni.navigateTo({ url: '/pages/register/index?source=wechat' }) } catch(e) { toast(e.message || '微信授权失败，请重试') } finally { authorizing.value = false }
}
onLoad(async options => {
  captureInvitation(options)
  try { if (await finishWechatCallback()) uni.navigateTo({ url: '/pages/register/index?source=wechat' }) } catch(e) { toast(e.message || '微信授权失败，请重试') }
})
function showPolicy(title) { uni.showModal({ title: title, content: '协议内容暂未提供。', showCancel: false }) }
async function submit() {
  if (!/^1\d{10}$/.test(phone.value)) return toast('请输入正确的手机号')
  if (password.value.length < 6) return toast('请输入至少 6 位密码')
  if (!agreed.value) return toast('请先阅读并同意协议')
  loading.value = true
  try { await login({ phone: phone.value, password: password.value }); const target=consumeLoginReturn();if(target)uni.redirectTo({url:target,fail:()=>uni.switchTab({url:'/pages/member/index'})});else uni.switchTab({ url: '/pages/member/index' }) } catch (e) { toast(e.message || '登录失败，请重试') } finally { loading.value = false }
}
</script>
<style scoped>
.brand-logo { display: block; width: 160rpx; height: 204rpx; max-height: 17vh; margin: 0 auto; }
.password-field { margin-top: clamp(16rpx, 2.4vh, 40rpx); }
.forgot { display: block; padding: 14rpx 0 14rpx 8rpx; color: #c5d4ed; font-size: 28rpx; line-height: 40rpx; }
.agreement { display: flex; align-items: center; justify-content: center; gap: 10rpx; margin: clamp(20rpx, 2.5vh, 44rpx) 0; font-size: 23rpx; line-height: 28rpx; color: #9cafcf; }
.agreement text { color: #1764ff; }
.check { display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 28rpx; height: 28rpx; border: 1rpx solid #819bc8; border-radius: 8rpx; }
.check.checked { border-color: transparent; }
.check image { width: 28rpx; height: 28rpx; flex-shrink: 0; }
.login-button { height: 88rpx; line-height: 88rpx; background: linear-gradient(100deg, #0340ff, #009bff); box-shadow: none; }
.register-button { height: 88rpx; margin-top: clamp(16rpx, 2vh, 32rpx); background: rgba(151, 165, 205, .32); color: #cbd5ec; font-size: 30rpx; line-height: 88rpx; }
.third-party { text-align: center; width: 100%; }
.divider { display: flex; align-items: center; gap: 24rpx; padding: 0 16rpx; color: #687ba9; font-size: 23rpx; line-height: 28rpx; }
.divider view { flex: 1; height: 1rpx; background: linear-gradient(90deg, transparent, #526da3); }
.divider view:last-child { background: linear-gradient(90deg, #526da3, transparent); }
.wechat-login { display: flex; flex-direction: column; align-items: center; width: 140rpx; margin: clamp(16rpx, 2vh, 36rpx) auto 0; color: #c2d0eb; font-size: 25rpx; line-height: 36rpx; }
.wechat-login image { width: 72rpx; height: 72rpx; margin-bottom: 10rpx; }
</style>
