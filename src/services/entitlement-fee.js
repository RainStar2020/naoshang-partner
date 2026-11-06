import { config } from '../config'
import { getSession, request } from './api'
import { mockBusinessPaymentOrder } from './mock/commerce'

const DEFAULT_AMOUNT = 200

function idempotencyKey() {
  return `entitlement-fee-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Create the ¥200 entitlement-fee order and return a cashier-ready payload. */
export async function createEntitlementFeeOrder(amount = DEFAULT_AMOUNT) {
  const entitlement = getSession()?.entitlement
  if (entitlement?.canOpen !== true) {
    const error = new Error(entitlement?.reason || `请联系上级为您设置等级为 ${entitlement?.minTierLabel || 'VIP（小批发商）'} 及以上`)
    error.code = 'ENTITLEMENT_VIP_REQUIRED'
    error.entitlement = entitlement
    throw error
  }
  const fee = Number(amount)
  const payable = Number.isFinite(fee) && fee > 0 ? fee : DEFAULT_AMOUNT
  if (config.useMock) {
    const user = getSession()?.user
    if (!user?.id) throw new Error('请先登录')
    const orderId = mockBusinessPaymentOrder(
      user,
      { id: `account:${user.id}` },
      'entitlement',
      { amount: payable, quantity: 1 },
    )
    return { status: 'PENDING_PAYMENT', orderId, amount: payable }
  }
  const result = await request('/me/entitlement-orders', {
    method: 'POST',
    data: { idempotencyKey: idempotencyKey(), channel: 'wechat' },
  })
  const orderId = result?.orderId || result?.paymentId || result?.payment?.id || ''
  return {
    ...result,
    orderId,
    amount: Number(result?.amount ?? result?.payableAmount ?? payable) || payable,
  }
}
