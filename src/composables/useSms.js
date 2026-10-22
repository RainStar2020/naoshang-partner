import { ref, onUnmounted } from 'vue'
import { sendSms, smsRemaining } from '../services/auth'
export const authToast = error => uni.showToast({ title: error.message || '操作失败，请重试', icon: 'none' })
export function useSms(phone, purpose) {
  const remaining = ref(0), sending = ref(false)
  const timer = setInterval(() => { remaining.value = smsRemaining(phone.value, purpose) }, 500)
  onUnmounted(() => clearInterval(timer))
  async function send() {
    if (sending.value || smsRemaining(phone.value, purpose)) return
    sending.value = true
    try { await sendSms(phone.value, purpose); remaining.value = smsRemaining(phone.value, purpose) } catch (e) { authToast(e) } finally { sending.value = false }
  }
  return { remaining, sending, send }
}
