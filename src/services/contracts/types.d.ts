/** Legacy page/Mock DTOs. New wire contracts and explicit Yuan/Cents types: ./v3-types. */
/** 旧页面和本地 Mock 金额为分；新版业务金额为元，商城展示字段为分，禁止全局转换。 */
export type Money = number
export type PaymentChannel = 'wechat' | 'alipay' | 'bank_card' | 'unionpay'
export type MemberLevel = 'normal' | 'fs' | 'jy' | 'cj' | 'xn' | 'ys'
export type EntitlementState = 'never_paid' | 'active' | 'expired'
export interface Page<T> { items: T[]; nextCursor: string | null; hasMore: boolean }
export interface Pagination { cursor?: string | null; pageSize?: number }
export interface EndpointInput {
  path?: Record<string, string | number>
  /** GET query；其他方法 JSON body（包括文档约定的 DELETE body）。 */
  data?: Record<string, unknown>
}
/** 通用端点完整字段暂未冻结；禁止将未知引擎结果误标为已确认 DTO。 */
export type DocumentedResponse = Record<string, unknown> | string
export interface ApiError { error?: string; code?: string; message?: string; requestId?: string; fieldErrors?: Record<string, string>; verifyFailCount?: number; verifyLocked?: boolean }
export interface LockedResponse {
  locked: true; entitlementState: EntitlementState; entitlementAmount: Money
  frozen: boolean; canExportBills: boolean; message: string; displayId: string
}
export type Result<T> = T | LockedResponse
export interface Entitlement { state: EntitlementState; amount: Money; expiresAt?: string; frozen?: boolean; canExportBills?: boolean }
export type LoginRequest = { channel: 'parent'; phone: string; password: string } | { channel: 'coach'; loginAccount: string; password: string } | { channel: 'admin'; password: string }
export interface Session { token: string; user: { id: string; name: string; role: string; displayId: string }; accountType: 'parent' | 'coach' | 'admin'; entitlement: Entitlement; expiresAt?: string }
export interface Context { id: string; accountId: string; mode: 'parent' | 'child'; name: string; memberId?: string }
export interface BusinessContext { id: string; accountId: string; module: 'wholesale' | 'costore' | 'agency'; label: string; capabilities: string[]; assignmentId?: string; contractId?: string; storeId?: string; agencyType?: 'STORE' | 'COUNTY' | 'CITY' | 'PROVINCE' }
export interface Bootstrap { displayId: string; entitlement: Entitlement; contexts: Context[]; businessContexts: BusinessContext[] }
export interface RichContent { format: 'nodes'; version: number; nodes: Array<Record<string, unknown>> }
export interface Address { id: string; recipient: string; phone: string; regionCodes: string[]; regionNames: string[]; detail: string; isDefault: boolean; version: number }
export interface Member { id: string; contextId: string; displayId: string; name: string; gradeCode: string; genderCode: string; memberLevel: MemberLevel; version: number }
export interface Store { id: string; name: string; number?: string; address: string }
export interface Product { id: string; title: string; categoryId: string; fulfillmentType: 'PHYSICAL' | 'ACTIVATION_CODE' | 'OFFLINE_SERVICE' | 'COLUMN_ACCESS'; requiresMember: boolean; skus: Array<{ id: string; label: string; amount: Money; stock: number }>; content: RichContent }
export interface CheckoutRequest { productId: string; skuId: string; quantity: number; storeId: string; addressId?: string; memberId?: string; couponId?: string; remark?: string }
export interface CheckoutQuote { id: string; goodsAmount: Money; discountAmount: Money; payableAmount: Money; expiresAt: string; serverTime: string; ruleVersion: string }
export interface BusinessQuote { id: string; contextId: string; version: number; amount: Money; expiresAt: number; serverTime: number }
export interface QuoteSubmission { contextId: string; quoteId: string; idempotencyKey: string }
export interface Order { id: string; orderNo: string; version: number; items: Array<{ id: string; productId: string; skuId: string; title: string; quantity: number; unitAmount: Money }>; goodsAmount: Money; discountAmount: Money; payableAmount: Money; status: 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED' | 'COMPLETED'; allowedActions: string[]; createdAt: string; expiresAt: string }
export interface PaymentAttempt { id: string; orderId: string; channel: PaymentChannel; status: 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' }
export type PaymentOrder = { status: 'SUCCEEDED'; paymentId: string; displayId?: string; validUntil?: string } | { status: 'CREATED'; paymentId: string; payParams: Record<string, unknown> }
export interface Progress { positionSeconds: number; durationSeconds: number; completed: boolean; ended?: boolean }
export interface UploadIntent { assetId: string; mode: 'multipart'; uploadUrl: string; fileField: string; headers: Record<string, string>; fields: Record<string, string>; limits: { maxSize: number } }
export interface RenderJob { status: 'queued' | 'processing' | 'succeeded' | 'failed'; downloadUrl?: string; shareUrl?: string; message?: string }
