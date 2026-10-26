<template>
  <view class="profile-icon" :class="{ disc }" aria-hidden="true"><image v-if="assets[name]" :src="assets[name]" mode="aspectFit" /></view>
</template>
<script setup>
defineProps({ name: { type: String, required: true }, disc: Boolean })
const assets = {
  payment: '/static/profile/icon-order-payment.png', shipping: '/static/profile/icon-order-shipping.png',
  receiving: '/static/profile/icon-order-receiving.png', completed: '/static/profile/icon-order-completed.png',
  award: '/static/profile/icon-founder-award.png', costore: '/static/profile/icon-costore-application.png',
  qr: '/static/profile/icon-referral-code.png', members: '/static/profile/icon-children.png',
  coupon: '/static/profile/icon-coupon.png', address: '/static/profile/icon-address.png',
  support: '/static/profile/icon-support.png', feedback: '/static/profile/icon-feedback.png', settings: '/static/profile/icon-settings.png'
}
</script>
<style scoped>
.profile-icon{height:2.6em;width:2.6em;flex-shrink:0;display:flex;align-items:center;justify-content:center}.profile-icon image{height:2.3em;width:2.3em}.profile-icon.disc,.profile-icon.disc image{height:3.1em;width:3.1em}
</style>
