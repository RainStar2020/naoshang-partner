<template>
  <view class="gradient-input" :class="{ 'is-disabled': disabled }">
    <image v-if="icon" class="input-icon" :src="icon" mode="aspectFit" />
    <input
      class="input-control"
      :value="modelValue"
      :type="type"
      :password="password"
      :placeholder="placeholder"
      placeholder-class="gradient-input-placeholder"
      placeholder-style="color: #8291b9;"
      :maxlength="maxlength"
      :disabled="disabled"
      :confirm-type="confirmType"
      :cursor-spacing="24"
      @input="emit('update:modelValue', $event.detail.value)"
      @focus="emit('focus', $event)"
      @blur="emit('blur', $event)"
      @confirm="emit('confirm', $event)"
    />
    <view v-if="$slots.suffix" class="input-suffix"><slot name="suffix" /></view>
  </view>
</template>

<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  icon: { type: String, default: '' },
  type: { type: String, default: 'text' },
  password: { type: Boolean, default: false },
  placeholder: { type: String, default: '' },
  maxlength: { type: Number, default: 140 },
  disabled: { type: Boolean, default: false },
  confirmType: { type: String, default: 'done' },
})
const emit = defineEmits(['update:modelValue', 'focus', 'blur', 'confirm'])
</script>

<style scoped>
.gradient-input {
  display: flex;
  align-items: center;
  width: 100%;
  height: var(--auth-input-height, 104rpx);
  padding: 0 24rpx;
  border-radius: 32rpx;
  background: linear-gradient(90deg, rgba(176, 196, 236, .24) 0%, rgba(176, 196, 236, .12) 42%, rgba(176, 196, 236, .04) 72%, rgba(176, 196, 236, 0) 100%);
}
.input-icon { flex-shrink: 0; width: 48rpx; height: 48rpx; margin-right: 16rpx; }
.input-control { flex: 1; min-width: 0; width: 0; height: 56rpx; line-height: 56rpx; color: #eff5ff; font-size: 30rpx; }
.input-control :deep(input) { background: transparent; color: inherit; }
.input-control :deep(input:-webkit-autofill) { -webkit-text-fill-color: #eff5ff; transition: background-color 99999s ease-in-out 0s; }
.input-control :deep(.gradient-input-placeholder), :deep(.gradient-input-placeholder) { color: #8291b9; }
.input-suffix { flex-shrink: 0; margin-left: 16rpx; }
.is-disabled { opacity: .55; }
</style>
