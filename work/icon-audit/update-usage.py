from pathlib import Path
p=Path('src/components/ProfileIcon.vue')
p.write_text('''<template>
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
.profile-icon{height:72rpx;width:72rpx;flex-shrink:0;display:flex;align-items:center;justify-content:center}.profile-icon image{height:64rpx;width:64rpx}
</style>
''',encoding='utf8')
# Replace CSS approximation and add previously missing action icons.
p=Path('src/pages/address/list.vue');s=p.read_text(encoding='utf-8-sig')
s=s.replace('<view class="default-circle"><view v-if="address.isDefault" /></view>','<image class="default-radio" :src="address.isDefault ? \'/static/common/icon-radio-checked.png\' : \'/static/common/icon-radio-unchecked.png\'" mode="aspectFit" />')
s=s.replace('@click="edit(address.id)">编辑','@click="edit(address.id)"><image class="address-action-icon" src="/static/common/icon-edit.png" mode="aspectFit"/>编辑')
s=s.replace('@click="remove(address)">删除','@click="remove(address)"><image class="address-action-icon" src="/static/common/icon-delete.png" mode="aspectFit"/>删除')
start=s.index('.default-circle{');s=s[:start]+'.default-radio{height:36rpx;width:36rpx;flex-shrink:0}.address-actions button{display:flex;align-items:center;gap:8rpx}.address-action-icon{height:38rpx;width:38rpx;flex-shrink:0}</style>\n';p.write_text(s,encoding='utf8')
p=Path('src/pages/support/feedback.vue');s=p.read_text(encoding='utf-8-sig').replace('<view class="camera-icon"/>','<image class="upload-icon" src="/static/common/icon-image.png" mode="aspectFit"/>')
start=s.index('.camera-icon{');end=s.index('.image-count{',start);s=s[:start]+'.upload-icon{height:52rpx;width:52rpx}'+s[end:];p.write_text(s,encoding='utf8')
p=Path('src/pages/order/list.vue');s=p.read_text(encoding='utf-8-sig').replace('<view class="order-search"><input','<view class="order-search"><image class="order-search-icon" src="/static/common/icon-search.png" mode="aspectFit"/><input').replace('</style>','.order-search-icon{height:40rpx;width:40rpx;flex-shrink:0}</style>');p.write_text(s,encoding='utf8')
# Verification fields must use a verification icon rather than agreement checkmark.
for name in ['src/pages/register/index.vue','src/pages/forgot-password/index.vue']:
 p=Path(name);s=p.read_text(encoding='utf-8-sig').replace('v-model="code" icon="/static/login/icon-checked.png"','v-model="code" icon="/static/common/icon-verification-code.png"');p.write_text(s,encoding='utf8')
for p in Path('src').rglob('*'):
 if p.suffix in ['.vue','.js','.css','.json']:
  s=p.read_text(encoding='utf-8-sig');new=s.replace('icon-vefify_code.png','icon-verification-code.png')
  if new!=s:p.write_text(new,encoding='utf8')
# White selected PNGs are now available for three tabs; tint only the missing selected store variant.
p=Path('src/components/AppTabBar.vue');s=p.read_text(encoding='utf-8-sig').replace(':class="{ selected: active === item.id }"',':class="{ selected: active === item.id, \'needs-selected-tint\': item.id === \'selection\' }"').replace('.app-tab.selected image{filter:', '.app-tab.selected.needs-selected-tint image{filter:');p.write_text(s,encoding='utf8')

