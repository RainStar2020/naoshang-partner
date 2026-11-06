<template>
  <AgencyPromotionCode @close="back" />
</template>
<script setup>
import { useAuth } from '../../composables/useAuth'
import AgencyPromotionCode from '../../components/AgencyPromotionCode.vue'
useAuth()
function back() {
  uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/profile/index' }) })
}
</script>
