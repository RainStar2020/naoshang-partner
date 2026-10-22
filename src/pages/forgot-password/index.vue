<template>
  <AuthLayout title="忘记密码">
    <view class="auth-screen">
      <view class="auth-heading"><view class="auth-title">{{ step === 1 ? '验证账号' : '设置密码' }}</view><view class="auth-description">{{ step === 1 ? '填写手机号验证码确定为本人操作' : '您已通过身份验证，请设置您的新密码' }}</view></view>
      <view v-if="step === 1" class="auth-fields">
        <GradientInput v-model="phone" icon="/static/login/icon-phone.png" type="number" :maxlength="11" placeholder="请输入手机号" />
        <GradientInput v-model="code" icon="/static/common/icon-verification-code.png" type="number" :maxlength="6" placeholder="请输入验证码"><template #suffix><button class="sms-button" :disabled="sending || remaining > 0" @click="send">{{ remaining ? `${remaining}s` : sending ? '发送中' : '获取' }}</button></template></GradientInput>
      </view>
      <view v-else class="auth-fields">
        <GradientInput v-model="password" icon="/static/login/icon-password.png" :password="true" :maxlength="32" placeholder="请输入密码" />
        <GradientInput v-model="confirmation" icon="/static/login/icon-password.png" :password="true" :maxlength="32" placeholder="再输入一次密码" />
        <view class="auth-text-button" @click="step = 1; code = ''; password = ''; confirmation = ''">返回重新验证</view>
      </view>
      <view v-if="config.useMock" class="auth-demo-note">验证码：123456</view>
      <view class="auth-action"><button class="primary" :loading="loading" :disabled="loading" @click="submit">{{ step === 1 ? '下一步' : '确认修改' }}</button></view>
    </view>
  </AuthLayout>
</template>
<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AuthLayout from '../../components/AuthLayout.vue'
import GradientInput from '../../components/GradientInput.vue'
import { verifyReset, resetPassword } from '../../services/auth'
import { captureInvitation } from '../../services/invitation'
import { useSms, authToast } from '../../composables/useSms'
import { config } from '../../config'
import '../../styles/auth.css'
const step = ref(1), phone = ref(''), code = ref(''), password = ref(''), confirmation = ref(''), loading = ref(false)
const { remaining, sending, send } = useSms(phone, 'reset-password')
onLoad(options => captureInvitation(options))
async function submit() {
  if (loading.value) return
  loading.value = true
  try {
    if (step.value === 1) { await verifyReset(phone.value, code.value); step.value = 2; code.value = '' }
    else {
      await resetPassword(password.value, confirmation.value)
      password.value = ''; confirmation.value = ''
      uni.showModal({ title: '密码修改成功', content: '请使用新密码重新登录。', showCancel: false, success: () => uni.reLaunch({ url: '/pages/login/index' }) })
    }
  } catch (e) { authToast(e) } finally { loading.value = false }
}
</script>
