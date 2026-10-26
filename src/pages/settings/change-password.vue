<template>
 <view class="password-page">
  <BusinessPageHeader title="修改密码"/>
  <view class="password-body">
   <view class="password-title">{{coach ? '重置健脑官登录密码' : '重置登录密码'}}</view>
   <view v-if="coach" class="password-field"><image src="/static/login/icon-phone.png" mode="aspectFit"/><input v-model="account" maxlength="32" placeholder="请输入账号" :disabled="saving"/></view>
   <view class="password-field"><image src="/static/login/icon-password.png" mode="aspectFit"/><input v-model="oldPassword" password maxlength="32" placeholder="请输入原密码" :disabled="saving"/></view>
   <view class="password-field"><image src="/static/login/icon-password.png" mode="aspectFit"/><input v-model="password" password maxlength="32" placeholder="请设置密码" :disabled="saving"/></view>
   <view class="password-field"><image src="/static/login/icon-password.png" mode="aspectFit"/><input v-model="confirmation" password maxlength="32" placeholder="再输入一次密码" :disabled="saving"/></view>
   <text v-if="error" class="password-error">{{error}}</text>
   <button class="password-submit" :disabled="saving" @click="save">{{saving ? '处理中…' : '确认修改'}}</button>
  </view>
 </view>
</template>
<script setup>
import {ref} from 'vue'
import {onLoad,onUnload} from '@dcloudio/uni-app'
import {changePassword} from '../../services/auth'
import {logout,getSession} from '../../services/api'
import {isCoachAccount} from '../../services/account-channel'
import {useAuth} from '../../composables/useAuth'
import BusinessPageHeader from '../../components/BusinessPageHeader.vue'
useAuth()
const session=getSession()
const coach=ref(isCoachAccount(session)),account=ref(session?.user?.loginAccount||session?.user?.phone||''),oldPassword=ref(''),password=ref(''),confirmation=ref(''),saving=ref(false),error=ref('')
let active=true
async function save(){if(saving.value)return;if(coach.value&&!account.value.trim()){error.value='请输入账号';return}saving.value=true;error.value='';try{const result=await changePassword(oldPassword.value,password.value,confirmation.value);if(!active)return;oldPassword.value='';password.value='';confirmation.value='';if(result.mockOnly)uni.showModal({title:'修改成功',content:'请返回登录页面重新登录。',showCancel:false});else uni.showModal({title:'修改成功',content:'请使用新密码重新登录。',showCancel:false,success:logout})}catch(reason){if(active)error.value=reason.message||'修改失败'}finally{if(active)saving.value=false}}
onLoad(query=>{if(query.audience==='coach')coach.value=true})
onUnload(()=>{active=false;oldPassword.value='';password.value='';confirmation.value='';account.value=''})
</script>
<style scoped>
.password-page{min-height:100vh;max-width:750px;margin:0 auto;background:#1b2748;color:#fff;font-size:clamp(14px,3.7vw,16px)}
.password-page button{margin:0;padding:0;color:inherit;font-size:inherit;line-height:inherit}
.password-page button::after{border:0}
.password-body{padding:1.4em 1.1em 2em}
.password-title{margin-bottom:1.2em;font-size:1.25em;font-weight:700}
.password-field{display:flex;align-items:center;gap:.6em;height:3em;margin-bottom:.75em;padding:0 .9em;border-radius:.55em;background:#343c5e}
.password-field image{width:1.15em;height:1.15em;flex:none}
.password-field input{flex:1;min-width:0;height:2em;color:#fff;font-size:.95em}
.password-error{display:block;margin:.2em 0 .6em;color:#ffb4c4;font-size:.85em}
.password-submit{display:block;width:100%;margin-top:1.4em;border-radius:3em;background:linear-gradient(95deg,#0340ff,#009bff);color:#fff;line-height:2.8}
</style>
