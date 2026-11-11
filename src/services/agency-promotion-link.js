import { config } from '../config'
import { normalizeAgencyPromotionCode } from './agency-promotion-code'

export const agencyTypeIds = ['STORE', 'COUNTY', 'CITY', 'PROVINCE']

function publicH5Origin() {
  const configured = String(config.h5PublicOrigin || '').trim().replace(/\/$/, '')
  if (configured) return configured
  if (typeof location !== 'undefined' && location?.origin) return location.origin
  return ''
}

/** Deep link scanned users open: application page for the chosen agency type. */
export function buildAgencyApplicationUrl(promotionId, agencyType) {
  const code = normalizeAgencyPromotionCode(promotionId)
  if (!code || !agencyTypeIds.includes(agencyType)) return ''
  const query = `promotionId=${encodeURIComponent(code)}&agencyType=${encodeURIComponent(agencyType)}`
  const origin = publicH5Origin()
  return origin ? `${origin}/#/pages/application/agency?${query}` : `#/pages/application/agency?${query}`
}

/** Deep link for wholesale share codes: land on register with invite prefilled. */
export function buildRegisterInviteUrl(inviteCode) {
  const code = String(inviteCode || '').trim()
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(code)) return ''
  const query = `inviteCode=${encodeURIComponent(code)}`
  const origin = publicH5Origin()
  return origin ? `${origin}/#/pages/register/index?${query}` : `#/pages/register/index?${query}`
}
