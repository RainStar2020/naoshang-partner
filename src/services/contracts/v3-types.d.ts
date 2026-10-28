/** Wire DTOs from docs/api/前端对接API文档-2026-10-27.md. No implicit unit conversion. */
export type Yuan = number
export type Cents = number
export type Timestamp = number | string
export type Channel = 'wechat' | 'alipay' | 'bank_card' | 'unionpay'
export type AllocationKind = 'inspection' | 'sales'
export type AllocationTarget = 'self' | 'county' | 'city' | 'province' | 'hq' | 'other'
export interface Gate {
  locked: true; entitlementState: 'never_paid' | 'expired'; entitlementAmount: Yuan
  frozen: boolean; canExportBills: boolean; message: string
}
export interface Bootstrap {
  user: { id: string; name: string; displayId: string }
  entitlement: { state: 'never_paid' | 'active' | 'expired'; amount: Yuan }
  gate: Gate | null
  /** Complete authorization fields are still missing from the new document. */
  businessContexts: Array<{ id: string; accountId: string; module: 'partner' | 'agency' | 'costore'; label: string; capabilities?: string[] }>
}
export interface PayParams {
  sandbox: boolean; channel: Channel; channelName: string; mode: 'sandbox' | 'live'
  autoPay?: boolean; note?: string
  /** Per-platform live invoke fields remain unspecified. */
  invoke: { autoPay?: boolean; payUrl?: string; prepayId?: string; sign?: string; [key: string]: unknown }
}
export interface Payment {
  id: string; paymentId: string; orderId?: string; status: 'CREATED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'
  channel: Channel; channelName: string; amount: Yuan; paymentMode: 'sandbox' | 'live'
  payParams?: PayParams; paidAt?: Timestamp | null
}
export interface Quote {
  id: string; expiresAt: Timestamp; ruleVersion?: number
  /** §18.1 says ISO; allocation examples still use epoch milliseconds. */
  amount?: Yuan; serverTime?: Timestamp; breakdown?: Record<string, unknown>; items?: unknown[]
}
export interface QuoteSubmission { contextId: string; quoteId: string; idempotencyKey: string }
export interface CheckoutRequest { productKey: string; quantity: number; skuId?: string; memberId?: string; level?: string }
export interface CreateOrderRequest extends CheckoutRequest { quoteId: string; idempotencyKey: string; payLater: true; addressId?: string; couponId?: string; deliveryType?: string }
export interface ProductPrices { list: Yuan; member: Yuan; channel: Yuan }
/** Display DTO is explicitly cents, while prices is explicitly yuan. */
export interface DisplayProduct {
  id: string; title: string; categoryId: string; standardAmount: Cents; activityAmount: Cents | null
  skus: Array<{ id: string; label: string; amount: Cents; stock: number; specs: Record<string, string> }>
  prices: ProductPrices; memberPrices: Array<{label:string;amount:Cents}>; rolePrices: Array<{label:string;amount:Cents}>
}
export interface AllocationSelection { targetId: AllocationTarget | string; percent: number; agentId?: string }
export interface AllocationQuoteRequest { contextId: string; allocationKind: AllocationKind; targetId?: string; percent?: number; agentId?: string; targets?: AllocationSelection[] }
export type AllocationQuote = { valid: false; errors: string[] } | (Quote & { valid: true; entryId: string; kind: AllocationKind; rows: Array<{targetId:string;name:string;percent:number;amount:Yuan}>; totalPercent:number; totalAmount:Yuan })
export interface AllocationOptions {
  entryId: string; allocationKind: AllocationKind; allocationStatus: 'NONE' | 'PENDING' | 'SETTLED'
  fields: Array<{key:string;type:string;label:string;options:Array<{value:string;label:string;name:string;needsId:boolean;available:boolean;unavailableReason?:string}>}>
  scheme: { mode: 'self_assign' | 'fixed'; kinds: Array<{ownerAssignable:boolean; [key:string]:unknown}> }
  allowedActions: string[]
}
export interface Asset { assetId: string; fileId: string; status: 'PENDING' | 'READY'; previewUrl?: string }
export interface InviteCode { code:string; type:'register'|'agent'; ownerId:string; createdAt:Timestamp; expiresAt:Timestamp; maxUse:number; usedCount:number; status:string }
export interface PromotionClaim { taskId:string; status:'NONE'|'ONGOING'|'ACHIEVED'|'CLAIMED'|'EXPIRED'; claimable:boolean; claimed:boolean; achieved:boolean; grantedTier?:string; validUntil?:Timestamp }
export type BizType = 'product_commission'|'supply_chain'|'software_fee'|'featured'|'column'|'admin_fee'|'quota'|'agent_fee'|'costore_fee'|'service_fee'|'staff_fee'|'global_bonus'|'founder_bonus'|'other'
export interface ProductDetail { productKind:string; productName:string; qty:number; paid:Yuan }
export interface BizDetailMap {
  product_commission:ProductDetail; supply_chain:ProductDetail; software_fee:ProductDetail; featured:ProductDetail; column:ProductDetail; admin_fee:ProductDetail
  quota:{fromTier:string;toTier:string;quotaCount:number}
  agent_fee:{agentLevel:string;regionCode:string;techFee:Yuan}
  costore_fee:{amount:Yuan;subType?:string}; service_fee:{regionType:string;quotaCount:number;amount:Yuan}
  staff_fee:{amount:Yuan;baseAmount:Yuan}; global_bonus:{period:string;pool:Yuan}; founder_bonus:{period:string}; other:{tier:string;remark:string}
}
export type IncomeEntry = { [K in BizType]: { id:string;bizType:K;bizTypeLabel:string;bizDetail:BizDetailMap[K];amount:Yuan;allocationKind:AllocationKind|null;incomeChannel?:'storeIncome'|'costoreOwnerIncome';incomeChannelLabel?:string } }[BizType]
