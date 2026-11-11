/** Long-lived agency promotion code: A + 8 uppercase alphanumeric characters. */
export const AGENCY_PROMOTION_CODE_PATTERN = /^A[0-9A-Z]{8}$/

/** Demo partner code used by local mocks. */
export const MOCK_PARTNER_AGENCY_PROMOTION_CODE = 'A7K3M9P2Q'

export const RETIRED_AGENCY_PROMOTION_CODE_MESSAGE = '该推广码已失效，请使用最新的代理推广码'
export const MISSING_AGENCY_PROMOTION_CODE_MESSAGE = '当前账号暂无代理推广码，开通合伙人权益后再试'
export const INVALID_AGENCY_PROMOTION_CODE_MESSAGE = '请使用有效的代理推广码'

/** Personal invite codes are 6 Crockford-like characters and must not be used as agency codes. */
const PERSONAL_INVITE_CODE_PATTERN = /^[0-9A-HJKMNP-Z]{6}$/

export function normalizeAgencyPromotionCode(value) {
  const code = String(value == null ? '' : value).trim().toUpperCase()
  return AGENCY_PROMOTION_CODE_PATTERN.test(code) ? code : ''
}

export function isRetiredAgencyPromotionCode(value) {
  const raw = String(value == null ? '' : value).trim()
  if (!raw) return false
  const code = raw.toUpperCase()
  if (AGENCY_PROMOTION_CODE_PATTERN.test(code)) return false
  if (PERSONAL_INVITE_CODE_PATTERN.test(code)) return true
  if (/^local-/i.test(raw)) return true
  if (/^promo-/i.test(raw)) return true
  return false
}

export function assertUsableAgencyPromotionCode(value) {
  const code = normalizeAgencyPromotionCode(value)
  if (code) return code
  if (isRetiredAgencyPromotionCode(value)) throw new Error(RETIRED_AGENCY_PROMOTION_CODE_MESSAGE)
  if (String(value == null ? '' : value).trim()) throw new Error(INVALID_AGENCY_PROMOTION_CODE_MESSAGE)
  throw new Error(MISSING_AGENCY_PROMOTION_CODE_MESSAGE)
}

/** Read the same value from GET /me top-level or identity.agencyPromotionCode. */
export function resolveAgencyPromotionCodeFromMe(payload) {
  if (!payload || typeof payload !== 'object') return null
  const top = normalizeAgencyPromotionCode(payload.agencyPromotionCode)
  const nested = normalizeAgencyPromotionCode(payload.identity && payload.identity.agencyPromotionCode)
  return top || nested || null
}

/** Copy the resolved code onto both top-level and identity so UI can read either. */
export function withNormalizedAgencyPromotionCode(payload) {
  const source = payload && typeof payload === 'object' ? payload : {}
  const identity = source.identity && typeof source.identity === 'object' ? source.identity : {}
  const code = resolveAgencyPromotionCodeFromMe(source)
  return {
    ...source,
    agencyPromotionCode: code,
    identity: { ...identity, agencyPromotionCode: code },
  }
}
