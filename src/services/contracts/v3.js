/** Pure, field-specific adapters. Never multiply every numeric field by 100. */
export function apiTimestamp(value) {
  if (typeof value === 'number') return Number.isFinite(value) && Number.isFinite(new Date(value).getTime()) ? value : null
  if (typeof value !== 'string' || !value.trim()) return null
  const result = Date.parse(value)
  return Number.isFinite(result) ? result : null
}

/** Handles both a business locked payload and bootstrap.gate. */
export const entitlementGate = value => value?.locked === true ? value : value?.gate?.locked === true ? value.gate : null
export const allocationKind = value => value === 'inspect' ? 'inspection' : value
export function validAllocationQuote(value) {
  if (value?.valid === false) {
    const message = (value.errors || []).map(error => typeof error === 'string' ? error : error.message || '分配方案无效').join('；')
    throw Object.assign(new Error(message || '分配方案无效'), { code: 'ALLOCATION_INVALID', errors: value.errors })
  }
  return value
}
/** SDK invocation must be explicit. A success/autoPay fixture never launches a channel. */
export function paymentNextStep(payment) {
  if (payment?.status === 'SUCCEEDED') return { kind: 'complete', paymentId: payment.paymentId || payment.id }
  if (['FAILED', 'CANCELLED'].includes(payment?.status)) return { kind: 'failed', paymentId: payment.paymentId || payment.id }
  if (payment?.paymentMode === 'sandbox' || payment?.payParams?.sandbox || payment?.payParams?.invoke?.autoPay) return { kind: 'poll', paymentId: payment.paymentId || payment.id }
  if (payment?.status === 'CREATED' && payment.payParams?.invoke) return { kind: 'invoke', paymentId: payment.paymentId || payment.id, channel: payment.payParams.channel, invoke: payment.payParams.invoke }
  return { kind: 'poll', paymentId: payment?.paymentId || payment?.id }
}
