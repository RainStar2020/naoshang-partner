import { callEndpoint } from './contracts/client'

// Use the shared contract client so real and mock modes follow the app configuration.
export const getMyPayments = (data = {}) => callEndpoint('GET /me/payments', { data })
export const getMyPayment = id => callEndpoint('GET /me/payments/{id}', { path: { id } })
export const getIncomeExport = () => callEndpoint('GET /me/income-export', { data: { format: 'json' } })
export const issueAgencyActivationCodes = data => callEndpoint('POST /agency/activation-codes', { data })
export const issuePartnerGiftCodes = data => callEndpoint('POST /partner/gift-codes', { data })
