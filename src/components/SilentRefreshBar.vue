<template>
  <view v-if="active" class="silent-refresh-bar" aria-hidden="true">
    <view class="silent-refresh-bar-fill" />
  </view>
</template>

<script setup>
defineProps({
  active: { type: Boolean, default: false },
})
</script>

<style scoped>
.silent-refresh-bar {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 2px;
  z-index: 40;
  pointer-events: none;
  overflow: hidden;
  background: rgba(74, 166, 255, 0.12);
}
.silent-refresh-bar-fill {
  width: 40%;
  height: 100%;
  background: linear-gradient(90deg, transparent, #4aa6ff, transparent);
  animation: silent-refresh-slide 1.1s linear infinite;
}
@keyframes silent-refresh-slide {
  from { transform: translateX(-120%); }
  to { transform: translateX(320%); }
}
</style>
