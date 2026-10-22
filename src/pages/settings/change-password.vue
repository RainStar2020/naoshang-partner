<template><view class="account-page"><view class="account-card"><view class="account-row"><text class="account-label">原密码</text><input v-model="oldPassword" class="account-input" password :maxlength="32" placeholder="请输入原密码" :disabled="saving"/></view><view class="account-row"><text class="account-label">新密码</text><input v-model="password" class="account-input" password :maxlength="32" placeholder="请输入新密码" :disabled="saving"/></view><view class="account-row"><text class="account-label">确认密码</text><input v-model="confirmation" class="account-input" password :maxlength="32" placeholder="请再次输入新密码" :disabled="saving"/></view></view><text v-if="error" class="account-error">{{error}}</text><view class="account-bottom"><button class="primary" :disabled="saving" @click="save">{{saving?'处理中…':'确认修改'}}</button></view></view></template>
<script setup>
import { ref } from 'vue'
import { onUnload } from '@dcloudio/uni-app'
import { changePassword } from '../../services/auth'
import { logout } from '../../services/api'
import { useAuth } from '../../composables/useAuth'
useAuth()
const oldPassword=ref(''),password=ref(''),confirmation=ref(''),saving=ref(false),error=ref('')
let active=true
async function save(){if(saving.value)return;saving.value=true;error.value='';try{const result=await changePassword(oldPassword.value,password.value,confirmation.value);if(!active)return;oldPassword.value='';password.value='';confirmation.value='';if(result.mockOnly)uni.showModal({title:'修改成功',content:'请返回登录页面重新登录。',showCancel:false});else uni.showModal({title:'修改成功',content:'请使用新密码重新登录。',showCancel:false,success:logout})}catch(reason){if(active)error.value=reason.message||'修改失败'}finally{if(active)saving.value=false}}
onUnload(()=>{active=false;oldPassword.value='';password.value='';confirmation.value=''})
</script>
<style>@import '../../styles/account.css';</style>
