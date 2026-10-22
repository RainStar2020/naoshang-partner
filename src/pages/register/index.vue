<template>
  <AuthLayout :title="source === 'wechat' ? '完善注册信息' : '新用户注册'">
    <view class="auth-screen">
      <view class="auth-heading"><view class="auth-title">{{ source === 'wechat' ? '完善账号' : '注册账号' }}</view><view v-if="source === 'wechat'" class="auth-description">微信授权已完成，请设置密码并完善资料</view></view>
      <view class="auth-fields">
        <GradientInput v-model="phone" icon="/static/login/icon-phone.png" type="number" :maxlength="11" placeholder="请输入手机号" />
        <GradientInput v-model="code" icon="/static/common/icon-verification-code.png" type="number" :maxlength="6" placeholder="请输入验证码"><template #suffix><button class="sms-button" :disabled="sending || remaining > 0" @click="send">{{ remaining ? `${remaining}s` : sending ? '发送中' : '获取' }}</button></template></GradientInput>
        <GradientInput v-model="password" icon="/static/login/icon-password.png" :password="true" :maxlength="32" placeholder="请设置密码" />
        <GradientInput v-model="confirmation" icon="/static/login/icon-password.png" :password="true" :maxlength="32" placeholder="再输入一次密码" />
        <GradientInput v-model="inviteCode" icon="/static/partner/icon-invitation.png" :maxlength="64" placeholder="请输入邀请码（选填）" />
        <RegionPicker :codes="regionCodes" :label="region.join(' / ')" @change="selectRegion" />
      </view>
      <view v-if="config.useMock" class="auth-demo-note">演示模式：获取验证码后输入 123456，未发送真实短信。</view>
      <view class="auth-action"><button class="primary" :loading="loading" :disabled="loading" @click="submit">注册并登录</button></view>
    </view>
  </AuthLayout>
</template>
<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AuthLayout from '../../components/AuthLayout.vue'
import GradientInput from '../../components/GradientInput.vue'
import RegionPicker from '../../components/RegionPicker.vue'
import { config } from '../../config'
import { captureInvitation } from '../../services/invitation'
import { registerAccount, getWechatBinding } from '../../services/auth'
import { useSms, authToast } from '../../composables/useSms'
import '../../styles/auth.css'
const phone = ref(''), code = ref(''), password = ref(''), confirmation = ref(''), inviteCode = ref(''), region = ref([]), regionCodes = ref([]), source = ref(''), loading = ref(false)
const { remaining, sending, send } = useSms(phone, 'register')
onLoad(options => {
  inviteCode.value = captureInvitation(options)
  source.value = options.source === 'wechat' ? 'wechat' : 'phone'
  if (source.value === 'wechat' && !getWechatBinding()) uni.showModal({ title: '授权已过期', content: '请返回登录页重新进行微信授权。', showCancel: false, success: () => uni.reLaunch({ url: '/pages/login/index' }) })
})
function selectRegion(value) { region.value = value.names; regionCodes.value = value.codes }
async function submit() {
  if (loading.value) return
  loading.value = true
  try {
    await registerAccount({ phone: phone.value, code: code.value, password: password.value, confirmation: confirmation.value, inviteCode: inviteCode.value.trim(), region: region.value, regionCodes: regionCodes.value, source: source.value })
    password.value = ''; confirmation.value = ''
    uni.switchTab({ url: '/pages/member/index' })
  } catch (e) { authToast(e) } finally { loading.value = false }
}
</script>
