<template>
  <AuthLayout>
    <template #brand>
      <image class="brand-logo" src="/static/logo.png" mode="aspectFit" />
    </template>
      <view class="login-form">
        <GradientInput v-model="phone" icon="/static/login/icon-phone.png" :type="coachLogin ? 'text' : 'number'" :maxlength="coachLogin ? 32 : 11" :placeholder="coachLogin ? '请输入健脑官登录账号' : '请输入手机号'" />
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
        <button v-if="!coachLogin" class="secondary register-button" @click="openRegister">新用户注册</button>
      </view>
    <template #footer>
      <view v-if="!coachLogin" class="third-party">
        <view class="divider"><view /><text>使用第三方账号登录</text><view /></view>
        <view class="wechat-login" @click="wechatLogin">
          <image src="/static/common/icon-weixin.png" mode="aspectFit" />
          <text>微信</text>
        </view>
      </view>
      <button class="channel-switch" @click="switchChannel">{{ coachLogin ? '返回家长登录' : '健脑官登录' }}</button>
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
import { accountHome, isCoachAccount } from '../../services/account-channel'
import { captureInvitation } from '../../services/invitation'
import { beginWechat, finishWechatCallback } from '../../services/auth'
const coachLogin=ref(false)
function switchChannel(){coachLogin.value=!coachLogin.value;phone.value='';password.value=''}
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
  if (coachLogin.value ? !/^[a-zA-Z0-9_-]{4,32}$/.test(phone.value) : !/^1\d{10}$/.test(phone.value)) return toast(coachLogin.value ? '请输入4—32位登录账号' : '请输入正确的手机号')
  if (password.value.length < 6) return toast('请输入至少 6 位密码')
  if (!agreed.value) return toast('请先阅读并同意协议')
  loading.value = true
  try {
    const session = await login({ ...(coachLogin.value ? { loginAccount: phone.value } : { phone: phone.value }), password: password.value, channel: coachLogin.value ? 'coach' : 'parent' })
    const target = consumeLoginReturn()
    if (isCoachAccount(session)) uni.reLaunch({ url: accountHome(session) })
    else if (target) uni.redirectTo({ url: target, fail: () => uni.switchTab({ url: accountHome(session) }) })
    else uni.switchTab({ url: accountHome(session) })
  } catch (e) { toast(e.message || '登录失败，请重试') } finally { loading.value = false }
}
</script>
<style scoped>
.channel-switch { width: auto; margin: 8rpx auto 0; padding: 8rpx 12rpx; background: none; color: #8ea6cc; font-size: 24rpx; line-height: 1.6; }
.brand-logo { display: block; width: 236rpx; height: 300rpx; max-height: 24vh; margin: 0 auto; }
.password-field { margin-top: clamp(18rpx, 2vh, 32rpx); }
.forgot { display: block; padding-left: 12rpx; color: #e8eef8; font-size: 26rpx; line-height: 40rpx; }
.agreement { display: flex; align-items: center; justify-content: center; gap: 12rpx; margin: clamp(24rpx, 2.6vh, 40rpx) 0 clamp(28rpx, 3vh, 48rpx); font-size: 24rpx; line-height: 36rpx; color: #9eb0ce; }
.agreement text { color: #f3f7ff; }
.check { display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 32rpx; height: 32rpx; border: 2rpx solid #8eabda; border-radius: 8rpx; }
.check.checked { border-color: transparent; }
.check image { width: 32rpx; height: 32rpx; flex-shrink: 0; }
.login-button, .register-button { display: block; width: 100%; height: 92rpx; margin-left: 0; margin-right: 0; padding: 0; border: none; font-size: 32rpx; font-weight: 500; line-height: 92rpx; }
.login-button { background: linear-gradient(100deg, #064bff, #00a6ff); box-shadow: none; }
.register-button { margin-top: 28rpx; background: rgba(148, 164, 204, .28); color: #e7eef8; }
.third-party { text-align: center; width: 100%; }
.divider { display: flex; align-items: center; gap: 24rpx; padding: 0 8rpx; color: #6d82ae; font-size: 24rpx; line-height: 34rpx; }
.divider view { flex: 1; height: 1rpx; background: linear-gradient(90deg, transparent, #526da3); }
.divider view:last-child { background: linear-gradient(90deg, #526da3, transparent); }
.wechat-login { display: flex; flex-direction: column; align-items: center; width: 140rpx; margin: 28rpx auto 0; color: #d5e2f6; font-size: 24rpx; line-height: 34rpx; }
.wechat-login image { width: 84rpx; height: 84rpx; margin-bottom: 12rpx; }
</style>
